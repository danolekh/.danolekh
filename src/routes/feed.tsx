import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { books, reviews, notes } from "@/lib/db/schema";
import type { Book, Note, Review } from "@/lib/db/schema";
import { IconStar } from "@tabler/icons-react";

const getFeedItems = createServerFn({ method: "GET" }).handler(async () => {
  const [reviewsData, notesData] = await Promise.all([
    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        body: reviews.body,
        createdAt: reviews.createdAt,
        book: books,
      })
      .from(reviews)
      .innerJoin(books, eq(reviews.bookId, books.id))
      .orderBy(desc(reviews.createdAt))
      .limit(50),
    db
      .select({
        id: notes.id,
        referenceText: notes.referenceText,
        body: notes.body,
        createdAt: notes.createdAt,
        book: books,
      })
      .from(notes)
      .innerJoin(books, eq(notes.bookId, books.id))
      .orderBy(desc(notes.createdAt))
      .limit(50),
  ]);

  const feedItems = [
    ...reviewsData.map((r) => ({
      type: "review" as const,
      id: r.id,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt,
      book: r.book,
    })),
    ...notesData.map((n) => ({
      type: "note" as const,
      id: n.id,
      referenceText: n.referenceText,
      body: n.body,
      createdAt: n.createdAt,
      book: n.book,
    })),
  ];

  feedItems.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return feedItems;
});

export const Route = createFileRoute("/feed")({
  component: FeedPage,
  ssr: true,
  loader: () => getFeedItems(),
});

function FeedPage() {
  const feedItems = Route.useLoaderData();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        {feedItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No activity yet</p>
          </div>
        )}
        {feedItems.length > 0 && (
          <div className="space-y-6">
            {feedItems.map((item) =>
              item.type === "review" ? (
                <ReviewCard key={item.id} review={item} />
              ) : (
                <NoteCard key={item.id} note={item} />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewCard({
  review,
}: {
  review: Omit<Review, "bookId"> & { book: Book };
}) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        {review.book.coverUrl && (
          <img
            src={review.book.coverUrl}
            alt={review.book.title}
            className="w-16 h-24 object-cover rounded"
          />
        )}
        <div className="h-24 flex flex-col">
          <div className="flex-1">
            <h3 className="text-lg font-medium">{review.book.title}</h3>
            <p className="text-muted-foreground text-sm">
              {review.book.author}
            </p>
          </div>
          {review.rating !== null && (
            <div className="flex items-center gap-2">
              <div className="gap-1 flex items-center">
                {[1, 2, 3, 4, 5].map((star) => {
                  const full = star <= Math.floor(review.rating!);

                  if (full) {
                    return (
                      <IconStar
                        key={star}
                        className="size-4 text-foreground"
                        fill={"currentColor"}
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    );
                  }

                  const empty = Math.ceil(review.rating!) < star;

                  if (empty) {
                    return (
                      <IconStar
                        key={star}
                        className="size-4 text-foreground"
                        fill={"none"}
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    );
                  }

                  const fillPercentage = (review.rating! - (star - 1)) * 100;

                  return (
                    <div key={star} className="relative size-4">
                      <IconStar
                        className="size-4 text-foreground"
                        fill={"none"}
                        stroke="currentColor"
                        strokeWidth="2"
                      />

                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ width: `${fillPercentage}%` }}
                      >
                        <IconStar
                          key={star}
                          className="size-4 text-foreground"
                          fill={"currentColor"}
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <span className="text-muted-foreground text-sm ml-1 mt-1">
                {review.rating}/5
              </span>
            </div>
          )}
        </div>
      </div>
      {<p className="mt-3 leading-relaxed">{review.body}</p>}
    </div>
  );
}

function NoteCard({ note }: { note: Omit<Note, "bookId"> & { book: Book } }) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        {note.book.coverUrl && (
          <img
            src={note.book.coverUrl}
            alt={note.book.title}
            className="w-16 h-24 object-cover rounded"
          />
        )}
        <div>
          <h3 className="text-lg font-medium">{note.book.title}</h3>
          <p className="text-muted-foreground text-sm">{note.book.author}</p>
        </div>
      </div>
      <blockquote className="border-l-2 pl-4 italic">
        {note.referenceText}
      </blockquote>
      <span>{note.body}</span>
    </div>
  );
}
