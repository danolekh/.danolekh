---
title: Hello World
date: 2026-06-02
description: A first markdown post to verify the /b pipeline end to end.
---

This is the **first** markdown article rendered at `/b/hello-world`. It is looked up by slug and
server-rendered by the loader, prerendered to static HTML at build, and styled with a themed
Tailwind `prose`.

## What this proves

- Markdown → HTML happens on the server (it is not shipped to the client).
- Frontmatter drives the page title, date, and the `<meta>` description.
- Inline `code` and fenced code blocks are highlighted by Shiki at build time:

```ts
type Greeting = { name: string };

function greet({ name }: Greeting): string {
  return `Hello, ${name}!`;
}

console.log(greet({ name: "world" }));
```

A blockquote, for good measure:

> The three.js dots keep animating on the sides — this route lives inside the root layout column.
