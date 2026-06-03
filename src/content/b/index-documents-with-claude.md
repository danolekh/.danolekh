---
title: Index a stack of documents with Claude
date: 2026-06-03
description: A live demo - point Claude at a pile of documents, pull author, addressee, date, and subject from each, and keyword-search the whole set. No terminal required.
---

If you have thousands of pages of scanned third-party documents (letters, reports, RFIs, photo logs),
two things make the pile usable: a clean index of who wrote each one, who it went to, when, and what
it's about, and the ability to search across all of it later.

The usual advice sends you to a command line and a stack of tokens to figure out yourself. You
shouldn't have to touch a terminal to do this. Here is the whole thing as a small app: pick the
documents, Claude reads each one and pulls the four fields into a table, and then you keyword-search
the set.

```demo:doc-index
```

Pick a file to see the raw document, hit **Index all with Claude** to extract the fields, then search
across everything below.

A few things worth noting:

- **Cheap per document.** Pulling four fields from a page is a short, structured task, so it runs on a
  small fast model (Claude Haiku). Across thousands of pages that's pennies, and each document is only
  indexed once.
- **Search is free.** Once the text and the extracted fields are stored, keyword search runs locally
  with no model calls at all.
- **Scales by batching.** 10,000 pages is the same step run in batches, with a quick human review pass
  on anything low-confidence rather than guessing.
- **No terminal.** The whole thing is a web app. You add documents and read the index; nobody opens a
  DOS prompt.
