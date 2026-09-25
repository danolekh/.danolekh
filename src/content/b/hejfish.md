---
title: Five of your water pages, rendered on the server
date: 2026-09-23
description: For Andreas and Wolfgang at hejfish. Five water pages around Linz, rendered on the server. They look and work the same, and nothing moves while they load.
unlisted: true
image: /images/b/hejfish/compare-poster.jpg
cover: /images/covers/hejfish-dark.webp
coverLight: /images/covers/hejfish-light.webp
---

_For Andreas and Wolfgang at hejfish._

Google's real-user data marks hejfish.com as failing Core Web Vitals on phones. Pages move while they load (layout shift 0.33, where good is under 0.1) and taps respond slowly (247 ms, good is under 200 ms).

So I took five of your waters around Linz and rendered the same pages on the server. They look and work like yours. Here are both loading on the same phone and the same slow connection:

<video poster="/images/b/hejfish/compare-poster.jpg" autoplay muted loop playsinline preload="auto" width="1092" height="1142" style="width:100%;height:auto;border-radius:12px;border:1px solid var(--border)" aria-label="Side-by-side recording: hejfish.com and the server-rendered version loading on a slow phone connection">
  <source src="/images/b/hejfish/compare.mp4" type="video/mp4">
  <source src="/images/b/hejfish/compare.webm" type="video/webm">
</video>

<small>Donau Stadtwasser - Linz. Emulated phone on slow 4G with a 4× slower CPU (Lighthouse's mobile settings), empty cache, cookies already accepted on hejfish.com. The timer counts from each page's own start.</small>

And a three-minute walkthrough of the demo:

<div style="position:relative;padding-bottom:75%;height:0;border-radius:12px;overflow:hidden;border:1px solid var(--border)">
  <iframe src="https://www.loom.com/embed/2c515ee47c3a4933bae0f8a71d85b106?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" title="Walkthrough of the hejfish demo by Dan Olekh" loading="lazy" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>
</div>

## Try it

Open one on your phone: [Donau Stadtwasser - Linz](https://hejfish.danolekh.com/d/1065-donau-stadtwasser-linz), [Donau A bei Puchenau](https://hejfish.danolekh.com/d/1073-donau-a-bei-puchenau-linz), [Traun bei Gunskirchen](https://hejfish.danolekh.com/d/1086-traun-bei-gunskirchen-linksufrig), [Traun bei Pucking](https://hejfish.danolekh.com/d/11421-traun-bei-pucking-nr-26-revier-sandmayr) or [Mondsee](https://hejfish.danolekh.com/d/1056-mondsee-bewirtschaftergemeinschaft). The menu, Bestimmungen, the Messstelle picker, the weather days and Teilen all work. That code only loads on the first tap.

## What a shared link looks like

WhatsApp, Telegram and Facebook don't run JavaScript for link previews, so today every water shares with the same card. With the title and image in the HTML, each water gets its own.

```demo:link-preview
{"cards":[
  {"label":"Today","host":"hejfish.com","title":"Angelkarten online kaufen mit hejfish","description":"Rund um die Uhr Angelkarten online kaufen ✓ Über 3.000 Gewässer in Deutschland & Österreich ✓ Schnell & unkompliziert","placeholder":"hejfish"},
  {"label":"Rendered on the server","host":"hejfish.danolekh.com","title":"Angelkarten Traun bei Gunskirchen - linksufrig | hejfish","description":"Fluss in Wels (Stadt), Oberösterreich. Saison von 1. April bis 30. November. Fischarten: Bachforelle, Hecht, Karpfen, Äsche u.v.m. Infos zum Bewirtschafter.","image":"/images/b/hejfish/preview-traun.png"}
]}
```

## About me

I'm Dan, a full-stack developer in Vienna. I'd like to join you on the 20-hour fullstack role, or start with a small paid project that takes this fix to production. I don't need a work permit and can start right away.

Work that's close to this: on my last contract I took a site from 69 to 99 on mobile PageSpeed ([case study](/p/oasi-kadir)). I built a sports store with 2,000+ products and its own admin panel on my own ([sportmagaz](/p/sportmagaz)), and an Astro site in four languages ([consolline](/p/consolline)).

[danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=hejfish) · [Resume](/resume) · [danolekh.com](/)

Ich freue mich, von euch zu hören!

---

<small>Real-user data: Google Chrome UX Report via PageSpeed Insights, hejfish.com origin, mobile, 28 days to 2026-09-23. Across all five waters, on mobile and desktop, 0.01-0.05% of the pixels differ from hejfish.com. I copied these pages only to measure the difference. Nothing there is indexed or for sale, and the demo comes down at the end of October. Not affiliated with hejfish GmbH.</small>
