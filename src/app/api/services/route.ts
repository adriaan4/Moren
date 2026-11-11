import { api } from "@/lib/api";
import { listServices } from "@/repositories/serviceRepo";
import { getSettings } from "@/repositories/settingsRepo";

/** Servicios activos (público). */
export const GET = api(async () => {
  const [services, settings] = await Promise.all([listServices({ onlyActive: true }), getSettings()]);
  return {
    services: services.map((s) => ({ ...s, durationMin: s.durationMin ?? null, effectiveDurationMin: s.durationMin ?? settings.defaultDurationMin })),
  };
});
