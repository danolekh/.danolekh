import { createFileRoute } from "@tanstack/react-router";
import { Schema, Either, Effect, Layer } from "effect";
import { db } from "@/lib/db";
import { books, reviews, notes } from "@/lib/db/schema";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { EventSchema, type ReviewEvent, type NoteEvent } from "./-schema";
import {
  IndexBookWorkflow,
  makeWorkflowLayer,
  R2Service,
  makeR2Service,
} from "@/lib/workflow";

export const Route = createFileRoute("/api/books")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("Authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return new Response(
              JSON.stringify({ error: "Missing bearer token" }),
              {
                status: 401,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const token = authHeader.slice(7);

          if (token !== env.BOOK_API_TOKEN) {
            return new Response(JSON.stringify({ error: "Invalid token" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }

          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const parseResult = Schema.decodeUnknownEither(EventSchema)(body);

          if (Either.isLeft(parseResult)) {
            return new Response(
              JSON.stringify({
                error: "Validation failed",
                details: parseResult.left.message,
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const event = parseResult.right;
          const now = new Date();

          let bookId = await db
            .select({
              id: books.id,
            })
            .from(books)
            .where(
              and(
                eq(books.title, event.book.title),
                eq(books.author, event.book.author),
              ),
            )
            .then((r) => r.at(0)?.id);

          if (!bookId) {
            const [inserted] = await db
              .insert(books)
              .values({
                title: event.book.title,
                author: event.book.author,
                createdAt: now,
                updatedAt: now,
              })
              .returning({
                id: books.id,
              });
            bookId = inserted.id;

            // Trigger workflow (fire and forget - don't block response)
            const workflowLayer = makeWorkflowLayer(env.db).pipe(
              Layer.provideMerge(
                Layer.succeed(
                  R2Service,
                  makeR2Service(env.r2 as any, (env as any).R2_PUBLIC_URL ?? ""),
                ),
              ),
            );

            Effect.runPromise(
              IndexBookWorkflow.execute({
                bookId,
                title: event.book.title,
                author: event.book.author,
              }).pipe(Effect.provide(workflowLayer)),
            ).catch((err) => {
              console.error("Workflow failed:", err);
            });
          }

          if (event.type === "review") {
            const reviewEvent = event as ReviewEvent;
            await db.insert(reviews).values({
              bookId: bookId,
              rating: reviewEvent.rating,
              body: reviewEvent.body,
              createdAt: now,
            });
          } else {
            const noteEvent = event as NoteEvent;
            await db.insert(notes).values({
              bookId: bookId,
              referenceText: noteEvent.referenceText,
              body: noteEvent.body,
              createdAt: now,
            });
          }

          return new Response(
            JSON.stringify({
              success: true,
              type: event.type,
            }),
            {
              status: 201,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              success: false,
              error: err,
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
