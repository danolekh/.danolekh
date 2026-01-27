import * as schema from "./schema";

import { drizzle as d1Drizzle } from "drizzle-orm/d1";
import { drizzle as libsqlDrizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { generate, reset, seed } from "drizzle-seeder/sqlite-core";

const db = (
  typeof process.env.db === "string"
    ? libsqlDrizzle(process.env.db, { schema })
    : d1Drizzle(process.env.db as any, { schema })
) as LibSQLDatabase<typeof schema>;

await reset(db as any, schema);

const BOOK_COUNT = 30;
const AVG_NOTES_PER_BOOK = 20;
const REVIEW_PROBABILITY = 0.6;
const AVG_REVIEWS_PER_BOOK = 2;

const generator = generate(schema, {
  tableOrder: ["books", "reviews", "notes"],
  seed: 42,
}).refine({
  refs: ["books.id"],
  tables: {
    books: {
      count: BOOK_COUNT,
      columns: {
        title: (ctx) => ctx.faker.book.title(),
        author: (ctx) => ctx.faker.person.fullName(),
        createdAt: (ctx) => ctx.faker.date.past(),
      },
    },
    reviews: {
      count: Math.floor(BOOK_COUNT * REVIEW_PROBABILITY * AVG_REVIEWS_PER_BOOK),
      columns: {
        bookId: (ctx) => {
          // Spread reviews across books, some get multiple
          const bookIndex = Math.floor(ctx.index / AVG_REVIEWS_PER_BOOK);
          return ctx.ref.books[bookIndex % BOOK_COUNT]!.id((v) => v);
        },
        rating: (ctx) => ctx.faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
        body: (ctx) => ctx.faker.lorem.paragraph(),
        createdAt: (ctx) => ctx.faker.date.past(),
      },
    },
    notes: {
      count: BOOK_COUNT * AVG_NOTES_PER_BOOK,
      columns: {
        bookId: (ctx) => {
          // Distribute notes across books
          const bookIndex = Math.floor(ctx.index / AVG_NOTES_PER_BOOK);
          return ctx.ref.books[bookIndex % BOOK_COUNT]!.id((v) => v);
        },
        referenceText: (ctx) => ctx.faker.lorem.sentences({ min: 2, max: 5 }),
        body: (ctx) => ctx.faker.lorem.sentences({ min: 2, max: 6 }),
        createdAt: (ctx) => ctx.faker.date.past(),
      },
    },
  },
});

await seed(db as any, generator);

console.log("Seeding complete!");
