import { clsx, type ClassValue } from "clsx";
import { differenceInHours, differenceInMinutes, format, isSameYear } from "date-fns";
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

export const formatRelativeDate = (date: Date) => {
  const now = new Date();
  const minutesAgo = differenceInMinutes(now, date);
  const hoursAgo = differenceInHours(now, date);

  if (minutesAgo < 60) {
    return `${minutesAgo}m`;
  }
  if (hoursAgo < 24) {
    return format(date, "HH:mm");
  }
  if (isSameYear(now, date)) {
    return format(date, "d MMM");
  }
  return format(date, "MMM ''yy");
};
