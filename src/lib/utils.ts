import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CoverSize = "S" | "M" | "L";

export function getBookCoverUrl(bookId: number, size: CoverSize = "M"): string {
  const bucketUrl = import.meta.env.VITE_BUCKET_PUBLIC_URL;
  return `${bucketUrl}/books/${bookId}/covers/${size}.jpg`;
}
