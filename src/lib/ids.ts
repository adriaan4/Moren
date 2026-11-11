import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I

function randomString(len: number, alphabet = ALPHABET): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/** Identificador legible y único de reserva, p. ej. MOR-7KQ3XA */
export const newBookingId = () => `MOR-${randomString(6)}`;
export const newId = (prefix: string) => `${prefix}_${randomString(10, "abcdefghijkmnpqrstuvwxyz23456789")}`;
export const newSecret = (bytes = 32) => randomBytes(bytes).toString("hex");
