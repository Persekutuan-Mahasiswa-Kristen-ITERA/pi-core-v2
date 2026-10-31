import type { Database } from "./database.types";

export type { Database };
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type AccessLevel = Database["public"]["Enums"]["access_level"];
