# shadcn instructions

Use the latest version of Shadcn to install new components, like this command to add a button component:

```bash
pnpm dlx shadcn@latest add button
```

# Posts, case studies and media

- **Posts** are `src/content/b/<slug>.md` (`/b/<slug>`); **case studies** are
  `src/content/p/<slug>.md` (`/p/<slug>`) plus an entry in `src/data/projects.ts` for the home grid.
  Loaders: `src/lib/content/b.ts`, `p.ts` (server-only; marked HTML + component nodes).
- **Hero art, dark by default, light optional:** a post's frontmatter `cover`/`coverLight` and
  `video`/`videoLight`; a case study's `projects.ts` `cover`/`coverLight` and
  `video: { src, srcLight, hero, heroLight }` (`src` for the grid card, `hero` above the case study).
  Files come from cardstock's promo encoder (`pnpm --filter promo encode … --out public/videos
  --cover public/images/covers`): `<name>-1600.mp4`, `-800.mp4`, `-poster.webp`,
  `-poster-800.webp`, and covers `<name>.webp` + `-800.webp`. Dark cuts are named `<name>-dark-*`.
- **A clip inside the text** is raw HTML in the markdown. For both themes, two videos:
  `<video class="dark:hidden" …>` and `<video class="hidden dark:block" …>`, each
  `autoplay muted loop playsinline`. `src/hooks/use-autoplay-videos.ts` plays only the one on show
  and swaps them when the theme changes. Keep X-sized cuts out of `public/`.
- **Interactive demos** embed with a ```` ```demo:<name> ```` fence (JSON props in the body),
  registered in `src/lib/content/blog-components.tsx`; the wrapper carries `data-demo="<name>"`,
  which cardstock's recorder and `scripts/generate-covers.ts` use to find it.
- **Link previews** are automatic: links to other pages of the site get a hover card
  (`src/lib/content/previews.ts` resolves them on the server; `src/components/link-previews.tsx`).
- **Share images:** after a title or cover changes, `bun run scripts/generate-og.ts` (writes
  `public/og/`), and check the image.
- **Pitch pages** for a company are `unlisted: true`, open with "_For the … teams at X._", put the
  live demo first, and end with a disclaimer: a design concept, no logo, not affiliated.
- **cardstock** is a dependency (`@danolekh/cardstock`); its registry parts live in
  `src/components/payment-card.tsx` and `card-carousel.tsx` (added with the shadcn CLI from
  `https://cardstock.danolekh.com/r/<item>.json`).
- **Ship:** `pnpm check`, `pnpm build`, commit, push `main`, `pnpm run deploy` (vite build +
  wrangler). Port 3000 is the usual dev server; use another port for throwaway checks.
