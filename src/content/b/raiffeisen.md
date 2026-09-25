---
title: Raiffeisen cards with live shaders, built on my own library
date: 2026-09-24
description: Debit cards in Raiffeisen's colours, each painted with a live WebGL shader, with tilt, flip, frost and a spending limit. Built on cardstock, my open-source React card library. A design concept by Dan Olekh.
unlisted: true
image: /og/b-raiffeisen.jpg
cover: /videos/raiffeisen-dark-poster.webp
coverLight: /videos/raiffeisen-light-poster.webp
video: /videos/raiffeisen-dark-1600.mp4
videoLight: /videos/raiffeisen-light-1600.mp4
---

_For the web and design system teams at Raiffeisen._

I wanted to show how I'd build a piece of banking UI, so I made one: debit cards in Raiffeisen's colours, each painted with a live shader. Try it. Swipe between the designs, move the pointer over the card, flip it, freeze it, and drag the limit to change it.

```demo:raiffeisen-card

```

## How it's built

The cards are [cardstock](https://cardstock.danolekh.com), a headless React library for bank cards that I designed, documented and released on npm (`@danolekh/cardstock`). This page installs its payment card and swiper from cardstock's registry with the shadcn CLI, the same way your team would, and restyles them.

Each design is a background stored as data. Four of them are shaders I wrote in your visual language: the core yellow and the warmer yellows that support it, warm off-black, and the diagonals the brand lays everything out along. The more premium the card, the more striking its pattern, from quiet yellow plastic to a gold moiré on Premium. Green and Porcelain are two of the library's own presets, recoloured. The light follows the tilt, and a card holds still when it isn't the one in the middle, when its face is turned away, or when it's scrolled off screen. Every card on the page shares one WebGL context, since browsers keep only about sixteen alive.

The tilt, the flip, the swipe and the spending bar move with transforms and opacity, which the compositor handles on its own, so they stay smooth on a phone. The tilt switches itself off on touch screens and for people who prefer reduced motion, and the flip then fades instead of turning. The designs sit in a carousel you swipe like a banking app: the cards follow your finger, snap on a spring that keeps the speed of your flick, and the cards beside the middle one turn away.

Freezing a card grows frost over it from the middle out. The frost is a second shader pass over the live background, so the pattern keeps moving under the ice. A frozen card hides its details and won't reveal them, and the "Karte gesperrt" status sits under the card, not on it. "Show details" decodes the number digit by digit, each digit in a fixed-width cell, so nothing shifts while it happens.

The switches are Base UI primitives, and the limit is a number you drag sideways to change, like a value in a design tool. It's a real slider underneath, so the arrow keys, Home and End work too. Everything works with a keyboard and a screen reader.

Using it looks like this:

```tsx
<ShaderLibrary shaders={[classic, gable, arrows, premium]}>
  <PaymentCard
    background={{ type: "shader", shader: "rb/premium", color: "#0b0a08", ink: "#f1dfa6" }}
    frozen={card.frozen}
    revealed={showDetails}
    spent={842}
    limit={1200}
  />
</ShaderLibrary>
```

cardstock's parts ship no styles: each reports its state as data attributes and CSS variables, so a design system brings its own tokens and its own motion.

## The whole library, in 40 seconds

Here's everything cardstock does, on the same six cards. The video swipes through the tiers, flips a card, decodes its details, freezes it over the moving shader, drags the limit, and types in a brand shader of its own:

<video class="dark:hidden" poster="/videos/raiffeisen-library-poster.webp" autoplay muted loop playsinline preload="metadata" width="1600" height="900" style="width:100%;height:auto;border-radius:12px;border:1px solid var(--border)" aria-label="cardstock with six Raiffeisen-coloured shader cards: swiping through the tiers, tilting, flipping, revealing details, freezing over a running shader, dragging the monthly limit, and typing in a custom shader">
  <source src="/videos/raiffeisen-library-1600.mp4" type="video/mp4">
</video>
<video class="hidden dark:block" poster="/videos/raiffeisen-library-dark-poster.webp" autoplay muted loop playsinline preload="metadata" width="1600" height="900" style="width:100%;height:auto;border-radius:12px;border:1px solid var(--border)" aria-label="cardstock with six Raiffeisen-coloured shader cards: swiping through the tiers, tilting, flipping, revealing details, freezing over a running shader, dragging the monthly limit, and typing in a custom shader">
  <source src="/videos/raiffeisen-library-dark-1600.mp4" type="video/mp4">
</video>

<small>Recorded frame by frame from cardstock's own stage. The shaders are design concepts in your colours; there's no bank logo on the cards.</small>

The video at the top of this page is this page's own demo, recorded frame by frame by the recorder I built for cardstock. [Docs](https://cardstock.danolekh.com) · [Case study](/p/cardstock) · [GitHub](https://github.com/danolekh/cardstock)

## About me

I'm Dan, a full-stack developer in Vienna who cares most about the front end: motion, performance and the details people feel. I'd like to work on Raiffeisen's web products, on the web UI and the design system above all. I don't need a work permit and I can start right away. I work in English; my German is basic, and I'm learning it.

Work that's close to this: [cardstock](/p/cardstock), above, is a component library I designed, documented and released on my own. I built [consolline.com](/p/consolline) on my own, with WebGL2 shaders and scroll-driven motion in four languages. I built [a sports store](/p/sportmagaz) with view transitions that morph the product photo into its page, and I set up and deployed [a Storybook](https://storybook.oasikadir.it) for a client's component library, on a site where [mobile PageSpeed went from 69 to 99](/p/oasi-kadir).

[danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=Raiffeisen) · [Resume](/resume) · [danolekh.com](/)

Ich freue mich, von Ihnen zu hören!

---

<small>A design concept I made on my own, in Raiffeisen's colours. It uses no Raiffeisen logo, and all card data is demo data. Not affiliated with Raiffeisen.</small>
