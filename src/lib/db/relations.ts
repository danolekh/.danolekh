import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  books: {
    notes: r.many.notes({
      from: r.books.id,
      to: r.notes.bookId,
    }),
    reviews: r.many.reviews({
      from: r.books.id,
      to: r.reviews.bookId,
    }),
  },
  notes: {
    book: r.one.books({
      from: r.notes.bookId,
      to: r.books.id,
    }),
  },
  reviews: {
    book: r.one.books({
      from: r.reviews.bookId,
      to: r.books.id,
    }),
  },
}));
