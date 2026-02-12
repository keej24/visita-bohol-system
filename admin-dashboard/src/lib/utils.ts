import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a string to Title Case
 * - Replaces underscores with spaces
 * - Capitalizes the first letter of each word
 * 
 * @example toTitleCase("parish") → "Parish"
 * @example toTitleCase("tagbilaran") → "Tagbilaran"
 * @example toTitleCase("HELLO WORLD") → "Hello World"
 */
export function toTitleCase(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/_/g, ' ')  // Replace underscores with spaces
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

