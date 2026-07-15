---
title: Oasi Kadir
subtitle: A bilingual agriturismo site on Cloudflare - content-managed, fast, and cheap to run
client: Oasi Kadir (agriturismo, Rome)
role: Design & full-stack engineering
year: 2026
liveUrl: https://nuovo.oasikadir.it
stack:
  - Astro
  - Strapi 5
  - Cloudflare Workers
  - PostgreSQL
  - React
  - Tailwind CSS v4
  - Effect
  - Notion
  - Resend
---

## The brief

Oasi Kadir is a working agriturismo - a farm that also runs a restaurant, rents rooms,
sells its own produce, and hosts events and school trips. They came to me from an old
WordPress site that was slow, hard to edit, and expensive to keep online - the kind of slow
that costs bookings: it shipped **21 MB** to every phone and took **16 seconds** before a
visitor could actually tap anything.

The ask was simple to state and broad in scope: **rebuild the whole thing** so that

- the owners can edit any page themselves, in Italian and English, without touching code;
- guests can **book** rooms and events natively, on the site, instead of over the phone;
- it loads fast on a phone in a field with weak signal;
- it costs almost nothing to run.

```block:stack
{
  "title": "What it's built on",
  "items": ["Astro (SSG)", "Strapi 5", "Cloudflare Workers", "PostgreSQL", "React", "Tailwind v4", "Effect", "Notion", "Resend", "Turnstile"]
}
```

## What was achieved

### Genuinely fast - 99 on mobile, every vital green

The site is fully static - every page is pre-rendered HTML served from Cloudflare's edge, so
there's no server to wait on for content. On a throttled mobile Lighthouse run it scores **99**,
with **every Core Web Vital comfortably in the green**: the largest element paints in under two
seconds, the main thread is never blocked (zero total blocking time), and **nothing on the page
ever shifts**. This is the emulated-mobile-on-slow-4G number - the harsh case, not a
fibre-desktop victory lap.

```block:metrics
{
  "caption": "Lighthouse 13, mobile with simulated 4G throttling - measured 2026-07-16. Lab snapshot, not field data; INP needs real interactions so TBT stands in for responsiveness.",
  "score": 99,
  "metrics": { "lcp": 1.9, "cls": 0, "fcp": 1.3, "tbt": 0 }
}
```

### From 16 seconds to under 2

The gap between the old WordPress site and the rebuild is the whole story in one table. Same
content, same photos - a fraction of the weight, and interactive almost immediately instead of
after a long, janky wait.

```block:before-after
{
  "oldLabel": "Old WordPress",
  "newLabel": "Rebuild",
  "caption": "Both measured with Lighthouse 13, mobile + simulated 4G, 2026-07-16. Old: oasikadir.it · new: nuovo.oasikadir.it.",
  "rows": [
    { "label": "Performance score", "old": "69", "new": "99", "oldRating": "needs-improvement", "newRating": "good" },
    { "label": "Time to interactive", "old": "16.3 s", "new": "1.9 s", "oldRating": "poor", "newRating": "good" },
    { "label": "Speed Index", "old": "10.7 s", "new": "1.7 s", "oldRating": "poor", "newRating": "good" },
    { "label": "Page weight", "old": "21 MB", "new": "2.7 MB", "oldRating": "poor", "newRating": "good" },
    { "label": "Server response", "old": "3.2 s", "new": "50 ms", "oldRating": "poor", "newRating": "good" }
  ]
}
```

### Editors publish in minutes, and the site can't go down

Content lives in a Strapi CMS. When an editor hits **Publish**, a webhook triggers a fresh
build and deploy - the change is live in about three minutes, no developer involved. Because
the delivered site is just static files, a broken build simply leaves the previous version
serving: the site can go _stale_, but it can't go _down_.

```block:pipeline
{
  "time": "~3 minutes",
  "steps": ["Editor hits Publish", "Strapi webhook", "Cloudflare build", "Static rebuild", "Live at the edge"]
}
```

### Builds stay fast even though every image URL changes

Media lives in a private bucket, so Strapi hands back presigned URLs whose signatures change
on every build - which naively means re-downloading and re-transforming ~1,300 images each
time. A two-layer, content-hash-keyed cache fixes that: originals and optimized variants are
keyed by the file's content, so nothing re-processes unless the media actually changed. Cold
builds run ~8 minutes; warm builds land at 2–3.

```block:build-cache
{
  "cold": 8,
  "warm": 2.5,
  "why": "Content-hash cache over ~1,300 image transforms - a variant only re-processes when the underlying file changes, not when its presigned URL rotates."
}
```

### Native bookings, without a backend to babysit

Booking is the one genuinely dynamic thing on the site, so it's the one place with a server:
a single Cloudflare Worker handles create / modify / cancel with real availability and
capacity checks. Reservations land in a Notion database the owners already use, confirmation
and manage-booking emails go out through Resend, and a Turnstile check keeps bots out - all
from the edge, with no always-on server to pay for or patch.

### Bilingual, top to bottom

Italian at the root, English under `/en`, every page and every CMS entry localized -
including the events, the shop, and the room detail pages.

```block:stat-row
{
  "title": "By the numbers",
  "stats": [
    { "value": "21", "label": "CMS content types" },
    { "value": "2", "label": "languages, fully mirrored" },
    { "value": "~24k", "label": "lines of app + UI code" },
    { "value": "~3 mo", "label": "design to launch" }
  ]
}
```

### It's cheap to run

The front end is on Cloudflare's free tier; the CMS and database sit on a small hobby plan.
Static-where-possible, dynamic-only-where-needed keeps the whole thing running for a few
dollars a month - and nightly off-provider backups mean the data is safe even if a provider
isn't.

## What the client said

```block:feedback
{
  "quote": "TODO: Ask Ashraf for the feedback",
  "author": "Ashraf",
  "role": "Oasi Kadir"
}
```
