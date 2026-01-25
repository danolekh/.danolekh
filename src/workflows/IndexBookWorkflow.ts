import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";

type Params = {
  bookId: number;
  title: string;
  author: string;
};

type CoverSize = "S" | "M" | "L";

type WorkflowEnv = Omit<Env, "db"> & { db: D1Database };

export class IndexBookWorkflow extends WorkflowEntrypoint<WorkflowEnv, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { bookId, title, author } = event.payload;

    // Step 1: Search OpenLibrary for cover ID
    const searchResult = await step.do(
      "search-openlibrary",
      { retries: { limit: 5, delay: "10 seconds", backoff: "exponential" } },
      async () => {
        const url = new URL("https://openlibrary.org/search.json");
        url.searchParams.set("title", title);
        url.searchParams.set("author", author);
        url.searchParams.set("limit", "1");
        url.searchParams.set("fields", "cover_i,key");

        const response = await fetch(url.toString());

        if (response.status === 429) {
          throw new Error(`Rate limited`);
        }
        if (!response.ok) {
          throw new Error(`OpenLibrary error: ${response.status}`);
        }

        const data = (await response.json()) as {
          docs?: Array<{ cover_i?: number; key?: string }>;
        };
        const doc = data.docs?.[0];
        return { coverId: doc?.cover_i ?? null };
      },
    );

    // No cover found - update status and exit
    if (!searchResult.coverId) {
      await step.do("update-status-not-found", async () => {
        await this.env.db
          .prepare("UPDATE books SET cover_status = 'not_found', updated_at = ? WHERE id = ?")
          .bind(Date.now(), bookId)
          .run();
      });
      return { status: "not_found" };
    }

    // Step 2: Fetch all cover sizes
    const covers = await step.do("fetch-covers", async () => {
      const sizes: CoverSize[] = ["S", "M", "L"];
      const results: Record<CoverSize, Uint8Array | null> = {
        S: null,
        M: null,
        L: null,
      };

      await Promise.all(
        sizes.map(async (size) => {
          const url = `https://covers.openlibrary.org/b/id/${searchResult.coverId}-${size}.jpg?default=false`;
          const response = await fetch(url);

          if (response.ok) {
            results[size] = new Uint8Array(await response.arrayBuffer());
          }
          // 404 or other errors: leave as null, don't fail the step
        }),
      );

      return results;
    });

    // Step 3: Upload to R2
    await step.do("upload-to-r2", async () => {
      await Promise.all(
        (["S", "M", "L"] as CoverSize[]).map(async (size) => {
          const data = covers[size];
          if (!data) return;

          const key = `books/${bookId}/covers/${size}.jpg`;
          await this.env.r2.put(key, data, {
            httpMetadata: { contentType: "image/jpeg" },
          });
        }),
      );
    });

    // Step 4: Update book status to 'found'
    await step.do("update-status-found", async () => {
      await this.env.db
        .prepare("UPDATE books SET cover_status = 'found', updated_at = ? WHERE id = ?")
        .bind(Date.now(), bookId)
        .run();
    });

    return { status: "found" };
  }
}
