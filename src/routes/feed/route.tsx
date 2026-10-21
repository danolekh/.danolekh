import * as React from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import type { Book } from "@/lib/db/schema";
import { getBookCoverUrl } from "@/lib/utils";
import { isReview } from "./_components/-review-chunk";
import { createMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/config";
import { BookFeedChunk, FeedChunk } from "./_components/-feed-chunk";
import { KickerArrow } from "@/components/site-frame";

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
      <div className="px-6 pt-12 md:px-12 md:pt-16">
        <header className="mb-12">
          <div className="kicker">
            <span className="dot" />
            <KickerArrow />
            <span className="label">Books, notes and highlights</span>
          </div>
          <h1 className="display mt-4 text-[clamp(48px,7vw,88px)]">Feed</h1>
        </header>
        <div className="max-w-2xl">
          {books.length === 0 ? (
            <p className="py-12 text-lg italic">No activity yet</p>
          ) : (
            <div className="space-y-8">
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
      className="reg cursor-pointer space-y-5 [--d:7px] [--p:8px] transition-[translate,box-shadow] duration-150 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[7px_7px_0_var(--signal)]"
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
      <div className="flex gap-4">
        <img
          src={getBookCoverUrl(book, "M")}
          alt={book.title}
          className="h-24 w-16 shrink-0 object-cover"
        />
        <div className="min-w-0 pt-1">
          <h3 className="display text-[28px]">{book.title}</h3>
          <p className="label mt-2 opacity-80">{book.author}</p>
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
