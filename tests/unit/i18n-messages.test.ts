import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { translateMessage } from "@/lib/i18n/messages";

/**
 * Server actions answer in English and the UI translates at display time
 * (src/lib/i18n/messages.ts). A message added without an Indonesian entry shows
 * up in English for Indonesian users, so every user-facing literal must map.
 */
const SOURCES = ["src/app", "src/lib/auth.ts", "src/lib/db-errors.ts", "src/lib/validation.ts"];

function files(path: string): string[] {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).flatMap((f) => files(join(path, f)));
}

// Literals passed as `message:`, thrown errors, field errors and ternary branches.
const LITERAL = /(?:message:\s*|Error\(\s*|\[\s*|\?\s*|:\s*)"([A-Z][^"\n]{6,}?[.!])"/g;
// Messages that never reach members (developer configuration errors).
const DEV_ONLY = /^Missing |See \.env\.example/;

const messages = new Set<string>();
for (const file of SOURCES.flatMap(files).filter((f) => /actions\.ts$|auth\.ts$|db-errors\.ts$|validation\.ts$/.test(f))) {
  for (const m of readFileSync(file, "utf8").matchAll(LITERAL)) if (!DEV_ONLY.test(m[1])) messages.add(m[1]);
}

describe("server messages have an Indonesian translation", () => {
  it("finds messages to check", () => {
    expect(messages.size).toBeGreaterThan(20);
  });

  it.each([...messages])("%s", (message) => {
    expect(translateMessage(message, "id")).not.toBe(message);
  });

  it("translates messages that carry a name", () => {
    expect(translateMessage("Maria Contoh was added.", "id")).toBe("Maria Contoh ditambahkan.");
    expect(translateMessage("Divisi Musik added.", "id")).toBe("Divisi Musik ditambahkan.");
    expect(translateMessage("Assignment added.", "id")).toBe("Penugasan ditambahkan.");
  });
});
