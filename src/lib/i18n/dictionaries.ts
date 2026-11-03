import type { Locale } from "./config";
import { en, type Dict } from "./en";
import { id } from "./id";

export type { Dict };
export const DICTIONARIES: Record<Locale, Dict> = { id, en };
