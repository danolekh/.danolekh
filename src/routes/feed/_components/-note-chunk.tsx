import type { Note } from "@/lib/db/schema";
import { formatRelativeDate } from "@/lib/utils";
import { motion } from "motion/react";

export function NoteChunk({
  note,
  layoutId,
}: {
  note: Pick<Note, "body" | "referenceText" | "createdAt">;
  layoutId: string | undefined;
}) {
  const Wrapper = layoutId ? motion.div : "div";

  return (
    <Wrapper layoutId={layoutId} className="space-y-4">
      <blockquote className="border-l-2 pl-4 italic">{note.referenceText}</blockquote>
      <p className="leading-relaxed whitespace-pre-wrap">
        {note.body}
        <span className="text-[10px] text-muted-foreground float-right ml-2 mt-1">
          {formatRelativeDate(note.createdAt)}
        </span>
      </p>
    </Wrapper>
  );
}
