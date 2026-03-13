import { Note, Review } from "@/lib/db/schema";
import { isReview, ReviewChunk } from "./-review-chunk";
import { NoteChunk } from "./-note-chunk";

export type BookFeedChunk = Omit<Note, "bookId"> | Omit<Review, "bookId">;

export function FeedChunk({ chunk }: { chunk: BookFeedChunk }) {
  if (isReview(chunk)) {
    return <ReviewChunk review={chunk} />;
  }

  return <NoteChunk note={chunk} />;
}
