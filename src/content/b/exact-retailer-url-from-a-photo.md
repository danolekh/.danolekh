---
title: From a photo to the exact retailer URL
date: 2026-06-02
description: A live demo — detect a product in a photo, then resolve the real retailer product page (not a Google Shopping redirect), cheaply and in one call.
---

Insurance-claim software (and plenty of other pipelines) detects a product in a photo, then needs the
**exact retailer product page** to price it — the page a human would actually buy it on. The obvious
path, a Google Shopping search, hands back a *tracking redirect* (`google.com/…&udm=28`), not the
merchant's page. And the "direct link" fields the product APIs expose are inconsistent and often missing.

The robust fix is to stop trying to *repair* that redirect and instead pull the URL from a source that
returns **real retailer pages** — here, Google Lens straight from the cropped image, in a single call:

```demo:flow-contents
```

Pick a sample above and hit **Resolve** — the server runs the lookup live, then ranks the matches by
retailer domain, price, and exact-match confidence, and falls back gracefully when nothing's confident.

A few things worth noting:

- **One call, from the crop.** No search → scrape → resolve chain; the match, the price, and the real
  product URL come back together.
- **Cheaper variant for production.** Skip the image and run an organic web search on the brand + name you
  already have, scoped to the detected vendor's domain (`"<brand> <name>" site:<vendor>`). It costs pennies
  per thousand and you already hold the price from the existing shopping call.
- **Never trust one field.** Real items return marketplaces, wrong variants, and dead matches — so the
  pipeline ranks candidates and degrades to "needs review" rather than shipping a confident-but-wrong link.
