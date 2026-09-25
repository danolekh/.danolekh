---
title: A card component for Raiffeisen, built for motion
date: 2026-09-24
description: A debit card component in Raiffeisen's colours, with tilt, flip, a frozen state and a spending limit. React, Motion and Base UI. A design concept by Dan Olekh.
unlisted: true
image: /og/b-raiffeisen.jpg
cover: /videos/raiffeisen-dark-poster.webp
coverLight: /videos/raiffeisen-light-poster.webp
video: /videos/raiffeisen-dark-1600.mp4
videoLight: /videos/raiffeisen-light-1600.mp4
---

_For the web and design system teams at Raiffeisen._

I wanted to show how I'd build a piece of banking UI, so I made one: a debit card component in Raiffeisen's colours. Try it. Swipe between the designs, move the pointer over the card, tap it to flip it, freeze it, and drag the limit to change it.

```demo:raiffeisen-card

```

## How it's built

The tilt, the flip, the swipe and the spending bar move with transforms and opacity, which the compositor handles on its own, so they stay smooth on a phone. Two things work differently: the frost is a small WebGL2 shader drawn on a canvas over the card, and "Show details" changes the text itself, digit by digit. The tilt follows the pointer through springs, and it switches itself off on touch screens and for people who prefer reduced motion. The flip then fades instead of turning.

The designs sit in a carousel you swipe like a banking app: the cards follow your finger, snap on a spring that keeps the speed of your flick, and the cards beside the middle one turn away in 3D. The arrow keys and the tabs underneath do the same.

Freezing the card in the middle sweeps frost in from the edge, on both faces (each design is its own card and keeps its own freeze), and takes the colour out of the card underneath. A frozen card hides its details and won't reveal them; the "Karte gesperrt" status sits under the card, not on it. The bar along the bottom shows spending against the monthly limit, and the numbers count to their new value instead of jumping. "Show details" decodes the card number digit by digit, each digit in a fixed-width cell, so nothing moves while it happens.

The switches are Base UI primitives, and the limit is a number you drag sideways to change, like a value in a design tool. It is a real slider underneath, so the arrow keys, Home and End work too. Everything works with a keyboard and a screen reader. The card itself is a button, so Enter flips it too.

Using it looks like this:

```tsx
<RaiffeisenCard
  variant="classic"
  flipped={flipped}
  onFlip={() => setFlipped((f) => !f)}
  frozen={card.frozen}
  revealed={showDetails}
  spent={842}
  limit={1200}
/>
```

## It became a library

I kept going after this post. The parts are now [cardstock](https://cardstock.danolekh.com), an open-source React library on npm (`@danolekh/cardstock`).

- **Headless, like Base UI.** It ships no styles. Each part reports its state as data attributes and CSS variables, so a design system can bring its own tokens and its own motion.
- **Everything in the post.** It has the flip and tilt, the decoding number, the frost, the spending meter and the swipe carousel.
- **More than the post.** It adds backgrounds stored as data, including live shaders.
- **A documented release.** It has docs with live demos, a changelog for every version, and CI that publishes to npm.

Here are the same cards rebuilt on it. There are six tiers, each with a live shader background in your colours, running from quiet yellow plastic to a premium gold moiré. The video then flips a card, decodes its details, freezes it over the moving shader, drags the limit, and types in a brand shader of its own:

<video poster="/videos/raiffeisen-library-poster.webp" autoplay muted loop playsinline preload="metadata" width="1600" height="900" style="width:100%;height:auto;border-radius:12px;border:1px solid var(--border)" aria-label="cardstock with six Raiffeisen-coloured shader cards: swiping through the tiers, tilting, flipping, revealing details, freezing over a running shader, dragging the monthly limit, and typing in a custom shader">
  <source src="/videos/raiffeisen-library-1600.mp4" type="video/mp4">
</video>

<small>Recorded frame by frame from cardstock's own stage. The shaders are design concepts in your colours; there's no bank logo on the cards.</small>

The video at the top of this page is this page's own demo, recorded frame by frame by the recorder I built for cardstock's launch video. [Docs](https://cardstock.danolekh.com) · [Case study](/p/cardstock) · [GitHub](https://github.com/danolekh/cardstock)

## About me

I'm Dan, a full-stack developer in Vienna who cares most about the front end: motion, performance and the details people feel. I'd like to work on Raiffeisen's web products, and I can start right away.

Work that's close to this: [cardstock](/p/cardstock), above, is a component library I designed, documented and released on my own. I built [consolline.com](/p/consolline) on my own, with WebGL2 shaders and scroll-driven motion in four languages. I built [a sports store](/p/sportmagaz) with view transitions that morph the product photo into its page, and I set up and deployed [a Storybook](https://storybook.oasikadir.it) for a client's component library, on a site where [mobile PageSpeed went from 69 to 99](/p/oasi-kadir).

[danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=Raiffeisen) · [Resume](/resume) · [danolekh.com](/)

Ich freue mich, von Ihnen zu hören!

---

<small>A design concept I made on my own, in Raiffeisen's colours. It uses no Raiffeisen logo, and all card data is demo data. Not affiliated with Raiffeisen.</small>
