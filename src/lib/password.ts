import { randomInt } from "node:crypto";

// No look-alike characters (0/O, 1/l/I) so a temporary password can be read aloud or typed from a chat.
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const ALL = LOWER + UPPER + DIGITS;

/** Cryptographically random temporary password; always contains a letter and a digit. */
export function generateTemporaryPassword(length = 14): string {
  if (length < 10) throw new Error("Temporary passwords must be at least 10 characters");
  const chars = [LOWER[randomInt(LOWER.length)], UPPER[randomInt(UPPER.length)], DIGITS[randomInt(DIGITS.length)]];
  while (chars.length < length) chars.push(ALL[randomInt(ALL.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
