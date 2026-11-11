import { api } from "@/lib/api";
import { assertCron } from "@/lib/cron";
import { sendDueReminders } from "@/services/reminderService";

export const maxDuration = 60;

export const GET = api(async (req) => {
  assertCron(req);
  return sendDueReminders();
});
