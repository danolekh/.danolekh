import { siteConfig } from "./config";
import { Book } from "./db/schema";

/* Head tags for every route.
 *
 * Two rules worth knowing before editing:
 *
 *  1. TanStack merges `meta` from the deepest match backwards and keeps the first value it sees for
 *     a given `name`/`property`, so a leaf route silently overrides the root's defaults. `links` get
 *     no such treatment — they are concatenated. That is why `canonical` is opt-in per route and the
 *     root passes `canonical: false`: two <link rel="canonical"> on one page is worse than none,
 *     because Google discards conflicting ones rather than picking the specific one.
 *  2. A meta entry shaped `{ "script:ld+json": … }` is rendered by the router as a JSON-LD script
 *     rather than a <meta>. That is how the structured data below reaches the page.
 */

type JsonLd = Record<string, unknown>;

type MetaTag = {
  charSet?: string;
  name?: string;
  property?: string;
  content?: string;
  title?: string;
  "script:ld+json"?: JsonLd;
};

type LinkTag = {
  rel: string;
  href: string;
  type?: string;
  sizes?: string;
};

type HeadConfig = {
  meta: MetaTag[];
  links: LinkTag[];
};

// Lets Google show a full-size thumbnail and an untruncated snippet instead of the conservative
// defaults it falls back to when the header is absent.
const INDEXABLE = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

const PERSON_ID = `${siteConfig.url}/#person`;
const WEBSITE_ID = `${siteConfig.url}/#website`;

/* Every card scripts/generate-og.ts writes is 1200x630 and lives under /og. Book covers do not, so
 * the dimension hints are emitted only for the generated cards rather than asserted for any image —
 * a wrong width tells a scraper to lay out a preview that does not match the file it fetched. */
const OG_CARD_PREFIX = `${siteConfig.url}/og`;
const OG_CARD_WIDTH = "1200";
const OG_CARD_HEIGHT = "630";

type CreateMetaProps = {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article" | "profile";
  /** BCP-47 tag for the page's own content; `og:locale` wants the underscore form. */
  locale?: "en_US" | "ru_RU" | "uk_UA";
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  /** `false` on the root route only — see the note at the top of this file. */
  canonical?: boolean;
  jsonLd?: JsonLd[];
};

export function createMeta(props: CreateMetaProps = {}): HeadConfig {
  const {
    title,
    description = siteConfig.description,
    url = siteConfig.url,
    image = siteConfig.ogImage,
    imageAlt,
    type = "website",
    locale = "en_US",
    publishedTime,
    modifiedTime,
    noindex = false,
    canonical = true,
    jsonLd = [],
  } = props;

  const fullTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name;
  const alt = imageAlt ?? fullTitle;

  const meta: MetaTag[] = [
    { title: fullTitle },
    { name: "description", content: description },
    { name: "author", content: siteConfig.name },
    { name: "robots", content: noindex ? "noindex, nofollow" : INDEXABLE },
    // Open Graph
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:image:alt", content: alt },
    { property: "og:url", content: url },
    { property: "og:type", content: type },
    { property: "og:site_name", content: siteConfig.name },
    { property: "og:locale", content: locale },
    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: "@danolekh" },
    { name: "twitter:creator", content: "@danolekh" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: alt },
  ];

  if (image.startsWith(OG_CARD_PREFIX)) {
    meta.push({ property: "og:image:width", content: OG_CARD_WIDTH });
    meta.push({ property: "og:image:height", content: OG_CARD_HEIGHT });
  }

  if (type === "article") {
    meta.push({ property: "article:author", content: siteConfig.url });
    if (publishedTime) meta.push({ property: "article:published_time", content: publishedTime });
    if (modifiedTime) meta.push({ property: "article:modified_time", content: modifiedTime });
  }

  for (const entry of jsonLd) meta.push({ "script:ld+json": entry });

  const links: LinkTag[] = [
    {
      rel: "icon",
      href: "/favicon-32x32.png",
      type: "image/png",
      sizes: "32x32",
    },
    {
      rel: "icon",
      href: "/favicon-16x16.png",
      type: "image/png",
      sizes: "16x16",
    },
    {
      rel: "apple-touch-icon",
      href: "/apple-touch-icon.png",
      sizes: "180x180",
    },
    { rel: "manifest", href: "/manifest.json" },
  ];

  if (canonical) links.push({ rel: "canonical", href: url });

  return { meta, links };
}

/* Who the site belongs to, in the vocabulary crawlers read. Emitted once, from the root route, so
 * every page carries it — the `@id`s below are what the per-page Article nodes point their `author`
 * and `publisher` at, which is how Google ties the pages together into one entity. */
export function siteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        inLanguage: "en",
        publisher: { "@id": PERSON_ID },
      },
      {
        "@type": "Person",
        "@id": PERSON_ID,
        name: siteConfig.name,
        url: siteConfig.url,
        image: `${siteConfig.url}/images/me.jpeg`,
        jobTitle: "Software Engineer",
        description:
          "Software engineer building fast, user-loved web platforms — TypeScript, React, Astro and Effect.",
        knowsAbout: [
          "TypeScript",
          "React",
          "Astro",
          "Node.js",
          "Cloudflare Workers",
          "WebGL",
          "Web performance",
        ],
        email: `mailto:${siteConfig.email}`,
        sameAs: [
          siteConfig.links.twitter,
          siteConfig.links.github,
          siteConfig.links.linkedin,
          siteConfig.farcaster,
        ],
      },
    ],
  };
}

function breadcrumb(trail: Array<{ name: string; url: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** The resume page: a ProfilePage whose main entity is the site's Person. */
export function createResumeMeta(props: { description: string }): HeadConfig {
  const url = `${siteConfig.url}/resume`;
  return createMeta({
    title: "Resume",
    description: props.description,
    url,
    type: "profile",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "@id": `${url}#page`,
        url,
        name: `${siteConfig.name} - Resume`,
        mainEntity: { "@id": PERSON_ID },
        isPartOf: { "@id": WEBSITE_ID },
      },
      breadcrumb([
        { name: "Home", url: siteConfig.url },
        { name: "Resume", url },
      ]),
    ],
  });
}

export function createArticleMeta(props: {
  title: string;
  description?: string;
  slug: string;
  publishedTime?: string;
  noindex?: boolean;
  image?: string;
}): HeadConfig {
  const url = `${siteConfig.url}/b/${props.slug}`;
  const description = props.description ?? siteConfig.description;

  return createMeta({
    title: props.title,
    description,
    url,
    type: "article",
    publishedTime: props.publishedTime,
    noindex: props.noindex,
    // Share images must be absolute; a post's frontmatter gives a path under /public.
    ...(props.image
      ? { image: props.image.startsWith("http") ? props.image : `${siteConfig.url}${props.image}` }
      : {}),
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: props.title,
        description,
        inLanguage: "en",
        datePublished: props.publishedTime,
        dateModified: props.publishedTime,
        author: { "@id": PERSON_ID },
        publisher: { "@id": PERSON_ID },
        isPartOf: { "@id": WEBSITE_ID },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
      },
      breadcrumb([
        { name: "Home", url: siteConfig.url },
        { name: "Writing", url: `${siteConfig.url}/b` },
        { name: props.title, url },
      ]),
    ],
  });
}

/* A case study is written about somebody else's company, and that company's name is the term people
 * search for. So the Article node names the client as an `about` Organization with its own site as
 * `url` + `sameAs`: it is the one signal in the markup that says "this page is about *that*
 * Consolline", rather than leaving a crawler to infer it from prose. */
export function createProjectMeta(props: {
  title: string;
  description?: string;
  slug: string;
  image?: string;
  clientName?: string;
  clientUrl?: string;
  stack?: string[];
  lang?: string;
  publishedTime?: string;
  modifiedTime?: string;
}): HeadConfig {
  const url = `${siteConfig.url}/p/${props.slug}`;
  const description = props.description ?? siteConfig.description;
  const image = props.image ?? siteConfig.ogImage;
  const lang = props.lang ?? "en";

  const article: JsonLd = {
    "@context": "https://schema.org",
    "@type": ["Article", "CreativeWork"],
    "@id": `${url}#article`,
    headline: props.title,
    name: props.title,
    description,
    image: [image],
    url,
    inLanguage: lang,
    datePublished: props.publishedTime,
    dateModified: props.modifiedTime ?? props.publishedTime,
    author: { "@id": PERSON_ID },
    creator: { "@id": PERSON_ID },
    publisher: { "@id": PERSON_ID },
    isPartOf: { "@id": WEBSITE_ID },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    genre: "Case study",
  };

  if (props.stack?.length) article.keywords = props.stack.join(", ");

  if (props.clientName) {
    const organization: JsonLd = { "@type": "Organization", name: props.clientName };
    if (props.clientUrl) {
      organization.url = props.clientUrl;
      organization.sameAs = [props.clientUrl];
    }
    article.about = organization;
    article.mentions = [organization];
  }

  return createMeta({
    title: props.title,
    description,
    url,
    image,
    imageAlt: `${props.title} — case study by ${siteConfig.name}`,
    type: "article",
    locale: lang === "ru" ? "ru_RU" : lang === "uk" ? "uk_UA" : "en_US",
    publishedTime: props.publishedTime,
    modifiedTime: props.modifiedTime,
    jsonLd: [
      article,
      breadcrumb([
        { name: "Home", url: siteConfig.url },
        { name: props.title, url },
      ]),
    ],
  });
}

export function createBookMeta(
  book: Pick<Book, "id" | "title" | "author" | "coverStatus">,
): HeadConfig {
  const title = book.author ? `${book.title} - ${book.author}` : book.title;
  const description = `Notes and highlights from ${book.title}`;
  const bucketUrl = import.meta.env.VITE_BUCKET_PUBLIC_URL;
  const coverImage = `${bucketUrl}/books/${book.id}/covers/L.jpg`;

  return createMeta({
    title,
    description,
    // The page, not the cover: this was passing the image URL, which made canonical and og:url point
    // at a JPEG on the bucket instead of at the book page.
    url: `${siteConfig.url}/feed/b/${book.id}`,
    image: coverImage,
    type: "article",
  });
}
