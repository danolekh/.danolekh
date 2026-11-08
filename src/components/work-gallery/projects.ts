// The cards in the curved gallery. Files live in public/work (recorded frame by frame from the real
// sites). `concept` work was built unprompted and is not a paid client; the cards carry no label, so
// the tag reaches screen readers here and belongs on the project's own page.

export type WorkItem = {
  slug: string;
  title: string;
  /** What kind of work this is. */
  tag: string;
  concept?: boolean;
  poster: string;
  /** A seamless clip whose first frame is the poster. No clip: the poster stays. */
  video?: string;
  /** A page on this site (the card flies into it) or a live site (new tab). */
  href: string;
  external?: boolean;
};

export const work: WorkItem[] = [
  {
    slug: "empireonecx",
    title: "EmpireOneCX",
    tag: "Concept, not a client",
    concept: true,
    poster: "/work/empireonecx.jpg",
    video: "/work/empireonecx.mp4",
    href: "/p/empireonecx",
  },
  {
    slug: "oasi-menu",
    title: "Oasi Kadir, the menu",
    tag: "Client",
    poster: "/work/oasi-menu.jpg",
    video: "/work/oasi-menu.mp4",
    href: "/p/oasi-kadir",
  },
  {
    slug: "consolline",
    title: "Consolline",
    tag: "Client",
    poster: "/work/consolline.jpg",
    href: "/p/consolline",
  },
  {
    slug: "lean-travel",
    title: "Lean Travel Management",
    tag: "Client",
    poster: "/work/lean-travel.jpg",
    video: "/work/lean-travel.mp4",
    href: "https://leantravel.danolekh.com",
    external: true,
  },
  {
    slug: "micrologus",
    title: "Micrologus Studio",
    tag: "Concept, not a client",
    concept: true,
    poster: "/work/micrologus.jpg",
    video: "/work/micrologus.mp4",
    href: "/p/micrologus",
  },
  {
    slug: "u-dak",
    title: "U-Dak Dakdekkers",
    tag: "Client",
    poster: "/work/u-dak.jpg",
    video: "/work/u-dak.mp4",
    href: "https://u-dak.nl",
    external: true,
  },
  {
    slug: "cardstock",
    title: "cardstock",
    tag: "Open source",
    poster: "/work/cardstock.jpg",
    video: "/work/cardstock.mp4",
    href: "/p/cardstock",
  },
  {
    slug: "oasi-home",
    title: "Oasi Kadir",
    tag: "Client",
    poster: "/work/oasi-home.jpg",
    href: "/p/oasi-kadir",
  },
];
