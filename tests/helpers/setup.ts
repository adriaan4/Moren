import { beforeEach, vi } from "vitest";
import { fakeRedis } from "./fakeRedis";

// Todo el acceso a Redis pasa por "@/lib/redis": en tests se sustituye por la versión en memoria.
vi.mock("@/lib/redis", () => ({ redis: fakeRedis }));
// Los correos se capturan en lugar de enviarse.
export const sentEmails: { to: string; subject: string }[] = [];
vi.mock("@/lib/email", () => ({
  sendEmail: async (m: { to: string; subject: string }) => {
    sentEmails.push({ to: m.to, subject: m.subject });
    return true;
  },
}));

beforeEach(() => {
  fakeRedis.reset();
  sentEmails.length = 0;
});
