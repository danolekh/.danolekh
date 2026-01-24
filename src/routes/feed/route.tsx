import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import type { Book, Note, Review } from "@/lib/db/schema";
import { getBookCoverUrl } from "@/lib/utils";
import { LayoutGroup, motion } from "motion/react";
import { isReview, ReviewChunk } from "./_components/-review-chunk";
import { NoteChunk } from "./_components/-note-chunk";
import { createMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/config";

type FeedBook = Book & {
  notes: Pick<Note, "id" | "body" | "createdAt" | "referenceText">[];
};

const getFeedItems = createServerFn({ method: "GET" }).handler(
  async (): Promise<FeedBook[]> => {
    const recentBooks = await db.query.books.findMany({
      orderBy: (books, { desc }) => desc(books.id),
      with: {
        notes: {
          orderBy: (notes, { desc }) => desc(notes.createdAt),
          columns: {
            id: true,
            body: true,
            createdAt: true,
            referenceText: true,
          },
          limit: 3,
        },
      },
    });

    return recentBooks;
  },
);

export const Route = createFileRoute("/feed")({
  component: FeedPage,
  loader: () => getFeedItems(),
  head: () =>
    createMeta({
      title: "Reading Feed",
      description: "Books I'm reading, notes, and highlights",
      url: `${siteConfig.url}/feed`,
    }),
});

function FeedPage() {
  const books = Route.useLoaderData();

  return (
    <LayoutGroup>
      <div className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">
          {books.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No activity yet</p>
            </div>
          )}
          {books.length > 0 && (
            <div className="space-y-6">
              {books.map((book) => (
                <BookBlock key={book.id} book={book} feedChunks={book.notes} />
              ))}
            </div>
          )}
        </div>
      </div>
      <Outlet />
    </LayoutGroup>
  );
}

function BookBlock({
  book,
  feedChunks,
}: {
  book: Book;
  feedChunks: (Omit<Note, "bookId"> | Omit<Review, "bookId">)[];
}) {
  const navigate = useNavigate();
  const layoutId = `book-${book.id}`;

  return (
    <motion.div
      className="p-4 space-y-4 border border-dashed"
      onClick={() => {
        navigate({
          resetScroll: false,
          to: "/feed/b/$bookId/modal",
          params: {
            bookId: book.id.toString(),
          },
        });
      }}
      layoutId={`${layoutId}-container`}
      exit={{ opacity: 0 }}
    >
      <div className="flex gap-2">
        <motion.div layoutId={layoutId}>
          <img
            src={getBookCoverUrl(book, "M")}
            alt={book.title}
            className="w-16 h-24 object-cover rounded"
          />
        </motion.div>
        <div>
          <motion.h3
            className="text-lg font-medium"
            layoutId={`${layoutId}-title`}
          >
            {book.title}
          </motion.h3>
          <motion.p
            className="text-muted-foreground text-sm"
            layoutId={`${layoutId}-author`}
          >
            {book.author}
          </motion.p>
        </div>
      </div>
      <div className="space-y-6">
        {feedChunks.map((chunk, index) => {
          const chunkLayoutId =
            index < 3 ? `${layoutId}-chunk-${index}` : undefined;

          if (isReview(chunk)) {
            return (
              <ReviewChunk
                review={chunk}
                layoutId={chunkLayoutId}
                key={`chunk-${chunk.id}-review`}
              />
            );
          }

          return (
            <NoteChunk
              note={chunk}
              layoutId={chunkLayoutId}
              key={`chunk-${chunk.id}-note`}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
