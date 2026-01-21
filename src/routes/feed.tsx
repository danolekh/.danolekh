import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { books, reviews, notes } from "@/lib/db/schema";
import type { Book, Review } from "@/lib/db/schema";

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

  feedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return feedItems;
});

export const Route = createFileRoute("/feed")({
  component: FeedPage,
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

function ReviewCard({ review }: { review: Omit<Review, "bookId"> & { book: Book } }) {
  return (
    <div className="bg-stone-900/50 border-l-4 border-red-600 p-6">
      <div className="flex gap-4">
        {review.book.coverUrl && (
          <img
            src={review.book.coverUrl}
            alt={review.book.title}
            className="w-16 h-24 object-cover rounded"
          />
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">{review.book.title}</h3>
              {review.book.author && <p className="text-stone-400 text-sm">{review.book.author}</p>}
            </div>
          </div>

          {review.rating !== null && (
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={star <= review.rating! ? "text-red-500" : "text-stone-600"}
                >
                  *
                </span>
              ))}
              <span className="text-stone-400 text-sm ml-2">{review.rating}/5</span>
            </div>
          )}

          {review.body && (
            <p className="text-stone-300 mt-3 text-sm leading-relaxed">{review.body}</p>
          )}

          <time className="text-stone-500 text-xs font-mono mt-4 block">
            {formatDate(review.createdAt)}
          </time>
        </div>
      </div>
    </div>
  );
}

function NoteCard({ note }: { note: any }) {
  return (
    <div className="bg-stone-900/50 border-l-4 border-amber-600 p-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-medium text-white">{note.book.title}</h3>
          {note.book.author && <p className="text-stone-400 text-sm">{note.book.author}</p>}
        </div>
        {(note.chapter || note.location) && (
          <span className="text-xs font-mono text-amber-400/70">
            {note.chapter && `Ch. ${note.chapter}`}
            {note.chapter && note.location && " | "}
            {note.location && `Loc. ${note.location}`}
          </span>
        )}
      </div>

      {note.selectionText && (
        <blockquote className="border-l-2 border-amber-600/50 pl-4 py-2 my-3 italic text-stone-300 text-sm">
          "{note.selectionText}"
        </blockquote>
      )}

      {note.noteContent && (
        <p className="text-stone-300 text-sm leading-relaxed">{note.noteContent}</p>
      )}

      <time className="text-stone-500 text-xs font-mono mt-4 block">
        {formatDate(note.createdAt)}
      </time>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
