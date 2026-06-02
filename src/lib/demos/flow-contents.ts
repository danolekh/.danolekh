// Shared, client-safe module for the Flow Contents demo (no `cloudflare:workers` import here, so it's
// safe to import from the client component). The live server call lives in `flow-contents.server.ts`.

export type FlowMatch = {
  title: string;
  source: string;
  link: string;
  price: string | null;
  thumbnail: string | null;
  exactMatch: boolean;
};

export type FlowResult = {
  sampleId: string;
  chosen: FlowMatch | null;
  matches: FlowMatch[];
  aggregatorExample: string;
  source: "live" | "fixture";
};

export type FlowSample = { id: string; label: string; imageUrl: string };

// Recognizable products with stable, public images (Wikimedia) that Google Lens resolves to real
// retailer listings. The imageUrl is sent to SerpApi server-side, so it must be publicly reachable.
export const SAMPLES: FlowSample[] = [
  {
    id: "switch",
    label: "Nintendo Switch",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Nintendo-Switch-Console-Docked-wJoyConRB.jpg/960px-Nintendo-Switch-Console-Docked-wJoyConRB.jpg",
  },
  {
    id: "ps3",
    label: "Sony PlayStation 3",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Sony-PlayStation-3-2001A-wController-L.jpg/960px-Sony-PlayStation-3-2001A-wController-L.jpg",
  },
  {
    id: "xbox",
    label: "Xbox Series X",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Xbox_Series_X_2.jpg/960px-Xbox_Series_X_2.jpg",
  },
];

// Illustrative example of what today's Google-Shopping path returns: a Google tracking/redirect URL
// (note `udm=28`), not the merchant's product page.
export const AGGREGATOR_EXAMPLE =
  "https://www.google.com/search?ibp=oshop&q=Nintendo+Switch+Console&prds=localAnnotatedOfferId:1,catalogid:8457552495845584083&gl=us&udm=28";

const KNOWN_RETAILERS = [
  "amazon.",
  "walmart.",
  "target.",
  "bestbuy.",
  "ebay.",
  "gamestop.",
  "nintendo.",
  "mercari.",
  "newegg.",
  "homedepot.",
  "staples.",
  "ikea.",
];

export function hostOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Map + rank SerpApi google_lens `visual_matches` into our shape: prefer exact matches, then results
// that carry a price, then known first-party retailers. Never assumes any single field is present.
export function rankMatches(visualMatches: Array<Record<string, any>>): FlowMatch[] {
  const mapped: FlowMatch[] = (visualMatches ?? [])
    .filter((m) => typeof m?.link === "string")
    .map((m) => ({
      title: typeof m.title === "string" ? m.title : "",
      source: typeof m.source === "string" ? m.source : hostOf(m.link),
      link: m.link,
      price: m.price?.value ? String(m.price.value).replace(/\*+$/, "") : null,
      thumbnail: typeof m.thumbnail === "string" ? m.thumbnail : null,
      exactMatch: Boolean(m.exact_matches),
    }));
  const score = (m: FlowMatch) =>
    (m.exactMatch ? 3 : 0) +
    (m.price ? 2 : 0) +
    (KNOWN_RETAILERS.some((r) => hostOf(m.link).includes(r)) ? 1 : 0);
  return mapped.slice().sort((a, b) => score(b) - score(a));
}

// Real Google Lens results captured for each sample — used as the fallback when no API key is present
// (local dev) or a live call fails, so the UI always renders something real.
const FIXTURE_MATCHES: Record<string, FlowMatch[]> = {
  switch: [
    {
      title: "Nintendo Switch, Super Mario Party Full Game Download, Red and Blue Joy-Con",
      source: "Walmart",
      link: "https://www.walmart.com/ip/Nintendo-Switch-w-Super-Mario-Party-Full-Game-Download-Bundle-Edition/304656500",
      price: "$400",
      thumbnail:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRF0pBBXhc5GGCkbmwaDsZmHaZGK579ELq2vjNtkXjK7YCZyTTs",
      exactMatch: false,
    },
    {
      title: "Nintendo Switch-Konsole Neon-Rot/Neon-Blau + Switch Sports + 12 months",
      source: "Amazon.de",
      link: "https://www.amazon.de/Nintendo-Switch-Konsole-Neon-Rot-Neon-Blau-Sports/dp/B0DGGVX1GR",
      price: "€350",
      thumbnail:
        "https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcRHjGYMbNsMGC2GGMOR917q4QTwghv1RunbrKvNdWq1XsVgAAAq",
      exactMatch: false,
    },
    {
      title: "Nintendo Switch 32GB Neon Red/Neon Blue Console",
      source: "eBay",
      link: "https://www.ebay.com/itm/295016608854",
      price: "$370",
      thumbnail:
        "https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcQeDa-ovaS6lWtfiRsjIOjAyTx-XMwn8J9KiGgz95D2Jsa9EvWw",
      exactMatch: false,
    },
  ],
  ps3: [
    {
      title: "Sony PlayStation 3 Slim Console 250GB - Black",
      source: "GameStop",
      link: "https://www.gamestop.com/consoles-hardware/retro-consoles/products/sony-playstation-3-slim-console-250gb/909125.html",
      price: "$160",
      thumbnail:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZ6208dkgRtivf10dt1edNNeS2ZXhOFVAAxUYp4WD9UCxT4117",
      exactMatch: false,
    },
    {
      title: "Sony PS3 120GB Console",
      source: "Amazon",
      link: "https://www.amazon.es/-/en/Sony-Ps3-Fat-Ps3-120gb-Go/dp/B002JM1GPU",
      price: "€150",
      thumbnail:
        "https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcSj20u5N2Tohj9AP68dHmbP8dvDBjk_B5Xeqcy8V6PURyjHRy8J",
      exactMatch: false,
    },
    {
      title: "Sony PlayStation PS 3 Console 160GB",
      source: "Amazon UK",
      link: "https://www.amazon.co.uk/Sony-Playstation-PS-Console-160GB/dp/B001ELKA4U",
      price: "£100",
      thumbnail:
        "https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcSLyLL0JEUT_i1eVUE7AMB6gOZ8jz1vTLWPbGiZwA28Xy8zR4hJ",
      exactMatch: false,
    },
  ],
  xbox: [
    {
      title: "Xbox Series X 1TB (Black) with Controller, Cords, Box & Manuals",
      source: "eBay",
      link: "https://www.ebay.com/itm/336529901134",
      price: "$400",
      thumbnail:
        "https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcQBvnw9z71q4vmDEeKMxqab9pQ1KN89-hbpKMQIoN2fQpvq9HXo",
      exactMatch: false,
    },
    {
      title: "Xbox Series X Console New",
      source: "Mercari",
      link: "https://www.mercari.com/us/item/m86005883616/",
      price: "$1,100",
      thumbnail:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQgrhjA7hzF3IqtYwWT5VVPoOtpuiI121w9vO64XgC4HdjjW_F5",
      exactMatch: false,
    },
  ],
};

export const FIXTURES: Record<string, FlowResult> = Object.fromEntries(
  Object.entries(FIXTURE_MATCHES).map(([sampleId, matches]) => [
    sampleId,
    {
      sampleId,
      chosen: matches[0] ?? null,
      matches,
      aggregatorExample: AGGREGATOR_EXAMPLE,
      source: "fixture" as const,
    },
  ]),
);
