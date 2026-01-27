import { db } from "@/lib/db";
import { getBookCoverUrl } from "@/lib/utils";
import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { Schema } from "effect";
import { createBookMeta } from "@/lib/seo";
import { BookNotFound } from "./-not-found";
import { FeedChunk } from "../../_components/-feed-chunk";
import { isReview } from "../../_components/-review-chunk";

export const getBookById = createServerFn({ method: "GET" })
  .inputValidator(Schema.Struct({ bookId: Schema.Number }).pipe(Schema.standardSchemaV1))
  .handler(async ({ data }) => {
    const book = await db.query.books.findFirst({
      where: {
        id: { eq: data.bookId },
      },
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
        },
      },
    });

    if (!book) throw notFound();

    return book;
  });

export const Route = createFileRoute("/feed/b/$bookId/modal")({
  component: RouteComponent,
  loader: async ({ params }) => getBookById({ data: { bookId: parseInt(params.bookId) } }),
  notFoundComponent: BookNotFound,
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [], links: [] };
    return createBookMeta(loaderData);
  },
  // prevents flickering, when route was mounted before and router tries to mount its
  // previously final state from cache (not needed because we animate it)
  gcTime: 0,
  // Only reload the route when the user navigates to it or when deps change
  shouldReload: false,
});

function RouteComponent() {
  const book = Route.useLoaderData();
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") goToFeed();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const goToFeed = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
    router.navigate({ to: "/feed", resetScroll: false });
  };

  const layoutId = `book-${book.id}`;

  return (
    <>
      <motion.div
        key="overlay"
        className="fixed inset-0 bg-black/30 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => goToFeed()}
      />
      <motion.div
        layoutId={`${layoutId}-container`}
        className="fixed h-fit inset-x-6 md:inset-x-8 top-[10vh] bottom-[10vh] md:left-1/2 md:w-xl md:-translate-x-1/2 z-50 bg-background p-4 overflow-hidden"
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
            <motion.h3 layoutId={`${layoutId}-title`} className="text-lg font-medium">
              {book.title}
            </motion.h3>
            <motion.p layoutId={`${layoutId}-author`} className="text-muted-foreground text-sm">
              {book.author}
            </motion.p>
          </div>
        </div>
        <div
          className="mt-4 overflow-y-auto max-h-[calc(80dvh-120px)] no-scrollbar space-y-6"
          ref={scrollContainerRef}
        >
          {[...book.reviews, ...book.notes]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((chunk, index) => (
              <FeedChunk
                chunk={chunk}
                layoutId={index < 4 ? `${layoutId}-chunk-${index}` : undefined}
                key={`chunk-${chunk.id}-${isReview(chunk) ? "review" : "note"}`}
              />
            ))}
        </div>
      </motion.div>
    </>
  );
}
