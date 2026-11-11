import { api } from "@/lib/api";
import { assertCron } from "@/lib/cron";
import { createBackup } from "@/services/backupService";

export const maxDuration = 60;

export const GET = api(async (req) => {
  assertCron(req);
  return createBackup();
});
