import type { Note } from "@/lib/db/schema";
import { motion } from "motion/react";

export function NoteChunk({
  note,
  layoutId,
}: {
  note: Pick<Note, "body" | "referenceText">;
  layoutId: string | undefined;
}) {
  const Wrapper = layoutId ? motion.div : "div";

  return (
    <Wrapper layoutId={layoutId} className="space-y-4">
      <blockquote className="border-l-2 pl-4 italic">{note.referenceText}</blockquote>
      <p className="leading-relaxed whitespace-pre-wrap">{note.body}</p>
    </Wrapper>
  );
}
