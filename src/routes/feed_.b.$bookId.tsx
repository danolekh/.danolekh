import { createFileRoute, Link } from "@tanstack/react-router";
import { getBookById } from "./feed/b/$bookId/modal";
import { getBookCoverUrl } from "@/lib/utils";
import { createBookMeta } from "@/lib/seo";
import { BookNotFound } from "./feed/b/$bookId/-not-found";
import { FeedChunk } from "./feed/_components/-feed-chunk";
import { isReview } from "./feed/_components/-review-chunk";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";

export const Route = createFileRoute("/feed_/b/$bookId")({
  component: RouteComponent,
  loader: async ({ params }) => getBookById({ data: { bookId: parseInt(params.bookId) } }),
  notFoundComponent: BookNotFound,
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [], links: [] };
    return createBookMeta(loaderData);
  },
});

function RouteComponent() {
  const book = Route.useLoaderData();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button render={<Link to="/feed"></Link>} nativeButton={false} variant={"link"}>
          <IconArrowLeft />
          Back to Feed
        </Button>
        <div className="p-4 space-y-4 border border-dashed">
          <div className="flex gap-2">
            <div>
              <img
                src={getBookCoverUrl(book, "M")}
                alt={book.title}
                className="w-16 h-24 object-cover rounded"
              />
            </div>
            <div>
              <h3 className="text-lg font-medium">{book.title}</h3>
              <p className="text-muted-foreground text-sm">{book.author}</p>
            </div>
          </div>
          <div className="space-y-6">
            {[...book.reviews, ...book.notes]
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .map((chunk) => (
                <FeedChunk
                  chunk={chunk}
                  key={`chunk-${chunk.id}-${isReview(chunk) ? "review" : "note"}`}
                />
              ))}
          </div>
        </div>
        <div className="text-right">
          <Button render={<Link to="/feed"></Link>} nativeButton={false} variant={"link"}>
            <IconArrowLeft />
            Back to Feed
          </Button>
        </div>
      </div>
    </div>
  );
}
