import type { Note } from "@/lib/db/schema";
import { formatRelativeDate } from "@/lib/utils";

export function NoteChunk({ note }: { note: Pick<Note, "body" | "referenceText" | "createdAt"> }) {
  return (
    <div className="space-y-4">
      <blockquote className="border-l-2 pl-4 italic">{note.referenceText}</blockquote>
      <p className="leading-relaxed whitespace-pre-wrap">
        {note.body}
        <span className="text-[10px] text-muted-foreground float-right ml-2 mt-1">
          {formatRelativeDate(note.createdAt)}
        </span>
      </p>
    </div>
  );
}
