import { createFileRoute } from "@tanstack/react-router";
import { Schema, Either } from "effect";
import { db } from "@/lib/db";
import { books, reviews, notes } from "@/lib/db/schema";
import { env } from "cloudflare:workers";
import { EventSchema, type ReviewEvent, type NoteEvent } from "./-schema";

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

          const bookId = await db
            .insert(books)
            .values({
              title: event.book.title,
              author: event.book.author,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: [books.title, books.author],
              set: {
                title: event.book.title,
                author: event.book.author,
                updatedAt: now,
              },
            })
            .returning({
              id: books.id,
            })
            .then((r) => r[0].id);

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
              bookId,
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
