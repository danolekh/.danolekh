import { siteConfig } from "./config";
import { Book } from "./db/schema";
import { getBookCoverUrl } from "./utils";

type MetaTag = {
  charSet?: string;
  name?: string;
  property?: string;
  content?: string;
  title?: string;
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

type CreateMetaProps = {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  type?: "website" | "article";
};

export function createMeta(props: CreateMetaProps = {}): HeadConfig {
  const {
    title,
    description = siteConfig.description,
    url = siteConfig.url,
    image = siteConfig.ogImage,
    type = "website",
  } = props;

  const fullTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name;

  return {
    meta: [
      { title: fullTitle },
      { name: "description", content: description },
      // Open Graph
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:image", content: image },
      { property: "og:url", content: url },
      { property: "og:type", content: type },
      { property: "og:site_name", content: siteConfig.name },
      // Twitter
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@danolekh" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
    links: [
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
      { rel: "canonical", href: url },
    ],
  };
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
    url: getBookCoverUrl(book, "L"),
    image: coverImage,
    type: "article",
  });
}
