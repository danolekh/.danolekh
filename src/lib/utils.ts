import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Book } from "./db/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CoverSize = "S" | "M" | "L";

export const getBookCoverUrl = (book: Pick<Book, "id" | "coverStatus">, size: CoverSize = "M") => {
  if (book.coverStatus === "found") {
    return `${import.meta.env.VITE_R2_PUBLIC_URL}/books/${book.id}/covers/${size}.jpg`;
  }
  return "/placeholder-cover.svg";
};
