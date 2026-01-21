import { Schema } from "effect";

export const BookSchema = Schema.Struct({
  title: Schema.NonEmptyString,
  author: Schema.NonEmptyString,
  isbn: Schema.optional(Schema.String),
});

export const ReviewEventSchema = Schema.Struct({
  type: Schema.Literal("review"),
  book: BookSchema,
  rating: Schema.optional(Schema.Number.pipe(Schema.between(0, 5))),
  content: Schema.optional(Schema.String),
});

export const NoteEventSchema = Schema.Struct({
  type: Schema.Literal("note"),
  book: BookSchema,
  selectionText: Schema.optional(Schema.String),
  noteContent: Schema.optional(Schema.String),
});

export const EventSchema = Schema.Union(ReviewEventSchema, NoteEventSchema);

export type ReviewEvent = Schema.Schema.Type<typeof ReviewEventSchema>;
export type NoteEvent = Schema.Schema.Type<typeof NoteEventSchema>;
