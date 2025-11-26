import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseClashRoyaleDate(dateString: string): Date {
  // Clash Royale format: "20231215T123456.000Z"
  // Convert to ISO format: "2023-12-15T12:34:56.000Z"
  try {
    if (!dateString) return new Date();
    
    // Parse the compact format
    const match = dateString.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})Z?$/);
    if (match) {
      const [, year, month, day, hour, minute, second, ms] = match;
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}Z`);
    }
    
    // Fallback to standard parsing
    return new Date(dateString);
  } catch {
    return new Date();
  }
}
