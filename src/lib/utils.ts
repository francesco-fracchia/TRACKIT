import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge condizionale di classi Tailwind (usato dai componenti shadcn/ui). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
