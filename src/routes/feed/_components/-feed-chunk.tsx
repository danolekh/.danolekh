import { Note, Review } from "@/lib/db/schema";
import { isReview, ReviewChunk } from "./-review-chunk";
import { NoteChunk } from "./-note-chunk";

export type BookFeedChunk = Omit<Note, "bookId"> | Omit<Review, "bookId">;

export function FeedChunk({
  chunk,
  layoutId,
}: {
  chunk: BookFeedChunk;
  layoutId: string | undefined;
}) {
  if (isReview(chunk)) {
    return <ReviewChunk review={chunk} layoutId={layoutId} />;
  }

  return <NoteChunk note={chunk} layoutId={layoutId} />;
}
