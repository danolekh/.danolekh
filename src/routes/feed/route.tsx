import * as React from "react";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import type { Book } from "@/lib/db/schema";
import { getBookCoverUrl } from "@/lib/utils";
import { isReview } from "./_components/-review-chunk";
import { createMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/config";
import { BookFeedChunk, FeedChunk } from "./_components/-feed-chunk";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";

const getFeedItems = createServerFn({ method: "GET" }).handler(async () => {
  const recentBooks = await db.query.books.findMany({
    orderBy: (books, { desc }) => desc(books.id),
    with: {
      reviews: {
        orderBy: (reviews, { desc }) => desc(reviews.createdAt),
        columns: {
          id: true,
          body: true,
          rating: true,
          createdAt: true,
        },
        limit: 1,
      },
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
});

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
    <React.Fragment>
      <div className="min-h-screen p-6 md:p-8">
        <div className="flex-1 max-w-2xl mx-auto space-y-4">
          <Button render={<Link to="/"></Link>} nativeButton={false} variant={"link"}>
            <IconArrowLeft />
            Back to Home
          </Button>
          {books.length === 0 && (
            <div className="h-full text-center py-12 text-muted-foreground">
              <p className="text-lg md:text-xl font-light italic">No activity yet</p>
            </div>
          )}
          {books.length > 0 && (
            <>
              <div className="space-y-6">
                {books.map((book) => (
                  <BookBlock
                    key={book.id}
                    book={book}
                    feedChunks={[...book.reviews, ...book.notes].sort(
                      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
                    )}
                  />
                ))}
              </div>
              <div className="text-right">
                <Button render={<Link to="/"></Link>} nativeButton={false} variant={"link"}>
                  <IconArrowLeft />
                  Back to Home
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      <Outlet />
    </React.Fragment>
  );
}

function BookBlock({ book, feedChunks }: { book: Book; feedChunks: BookFeedChunk[] }) {
  const navigate = useNavigate();

  return (
    <div
      className="p-4 space-y-4 border border-dashed bg-background"
      onClick={() => {
        navigate({
          resetScroll: false,
          to: "/feed/b/$bookId/modal",
          params: {
            bookId: book.id.toString(),
          },
        });
      }}
    >
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
        {feedChunks.map((chunk) => (
          <FeedChunk
            chunk={chunk}
            key={`chunk-${chunk.id}-${isReview(chunk) ? "review" : "note"}`}
          />
        ))}
      </div>
    </div>
  );
}
