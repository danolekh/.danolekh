import type { Note, Review } from "@/lib/db/schema";
import { IconStar } from "@tabler/icons-react";
import { motion } from "motion/react";

export function ReviewChunk({
  review,
  layoutId,
}: {
  review: Pick<Review, "body" | "rating">;
  layoutId: string | undefined;
}) {
  const Wrapper = layoutId ? motion.div : "div";

  return (
    <Wrapper layoutId={layoutId} className="space-y-4">
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
          <span className="text-muted-foreground text-sm ml-1 mt-1">{review.rating}/5</span>
        </div>
      )}
      <p className="mt-3 leading-relaxed whitespace-pre-wrap">{review.body}</p>
    </Wrapper>
  );
}

export const isReview = (
  chunk: Omit<Note, "bookId"> | Omit<Review, "bookId">,
): chunk is Omit<Review, "bookId"> => "rating" in chunk;
