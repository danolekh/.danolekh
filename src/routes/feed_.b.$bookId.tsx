import { createFileRoute, Link } from "@tanstack/react-router";
import { getBookById } from "./feed/b/$bookId/modal";
import { getBookCoverUrl } from "@/lib/utils";
import { createBookMeta } from "@/lib/seo";
import { BookNotFound } from "./feed/b/$bookId/-not-found";
import { FeedChunk } from "./feed/_components/-feed-chunk";
import { isReview } from "./feed/_components/-review-chunk";
import { KickerArrow } from "@/components/site-frame";

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
    <div className="px-6 pt-12 md:px-12 md:pt-16">
      <div className="mx-auto max-w-2xl">
        <div className="kicker mb-6">
          <span className="dot" />
          <KickerArrow />
          <Link to="/feed" className="label hover:text-signal">
            Feed
          </Link>
        </div>
        <div className="reg space-y-6 [--d:7px] [--p:8px]">
          <div className="flex gap-4">
            <img
              src={getBookCoverUrl(book, "M")}
              alt={book.title}
              className="h-24 w-16 shrink-0 object-cover"
            />
            <div className="min-w-0 pt-1">
              <h1 className="display text-[clamp(30px,4vw,40px)]">{book.title}</h1>
              <p className="label mt-2 opacity-80">{book.author}</p>
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
      </div>
    </div>
  );
}
