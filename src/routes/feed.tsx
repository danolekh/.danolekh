import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { books, reviews, notes } from "@/lib/db/schema";
import type { Book, Note, Review } from "@/lib/db/schema";
import { IconStar } from "@tabler/icons-react";
import { getBookCoverUrl } from "@/lib/utils";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  Dialog,
  DialogContentInline,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSetAtom, atom, useAtomValue, useAtom } from "jotai";

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

const dialogAtom = atom(false);
const activeBookAtom = atom<
  (Pick<Book, "id" | "title" | "author"> & { layoutId: string }) | null
>(null);

function FeedPage() {
  const feedItems = Route.useLoaderData();

  return (
    <LayoutGroup>
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
        <ActiveBookDialog />
      </div>
    </LayoutGroup>
  );
}

function ActiveBookDialog() {
  const [open, setOpen] = useAtom(dialogAtom);
  const activeBook = useAtomValue(activeBookAtom);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && activeBook && (
          <DialogContentInline>
            <div className="flex gap-2">
              <motion.div layoutId={activeBook.layoutId}>
                <img
                  src={getBookCoverUrl(activeBook.id, "M")}
                  alt={activeBook.title}
                  className="w-16 h-24 object-cover rounded"
                />
              </motion.div>
              <DialogHeader>
                <DialogTitle>{activeBook.title}</DialogTitle>
                <DialogDescription>{activeBook.author}</DialogDescription>
              </DialogHeader>
            </div>
            <div className="no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto px-4">
              {Array.from({ length: 10 }).map((_, index) => (
                <p key={index} className="mb-4 leading-normal">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                  eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                  enim ad minim veniam, quis nostrud exercitation ullamco laboris
                  nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor
                  in reprehenderit in voluptate velit esse cillum dolore eu fugiat
                  nulla pariatur. Excepteur sint occaecat cupidatat non proident,
                  sunt in culpa qui officia deserunt mollit anim id est laborum.
                </p>
              ))}
            </div>
          </DialogContentInline>
        )}
      </AnimatePresence>
    </Dialog>
  );
}

function ReviewCard({
  review,
}: {
  review: Omit<Review, "bookId"> & { book: Book };
}) {
  const setActiveBook = useSetAtom(activeBookAtom);
  const setOpen = useSetAtom(dialogAtom);

  const layoutId = `review-${review.id}-book-cover-${review.book.id}`;

  return (
    <div
      className="p-4 space-y-4"
      onClick={() => {
        setActiveBook({
          layoutId,
          author: review.book.author,
          id: review.book.id,
          title: review.book.title,
        });
        setOpen(true);
      }}
    >
      <div className="flex gap-2">
        <motion.div layoutId={layoutId}>
          <img
            src={getBookCoverUrl(8, "M")}
            alt={review.book.title}
            className="w-16 h-24 object-cover rounded"
          />
        </motion.div>
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
  const setActiveBook = useSetAtom(activeBookAtom);
  const setOpen = useSetAtom(dialogAtom);

  const layoutId = `note-${note.id}-book-cover-${note.book.id}`;

  return (
    <div
      className="p-4 space-y-4"
      onClick={() => {
        setActiveBook({
          author: note.book.author,
          id: note.book.id,
          title: note.book.title,
          layoutId,
        });
        setOpen(true);
      }}
    >
      <div className="flex gap-2">
        <motion.div layoutId={layoutId}>
          <img
            src={getBookCoverUrl(8, "M")}
            alt={note.book.title}
            className="w-16 h-24 object-cover rounded"
          />
        </motion.div>
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
