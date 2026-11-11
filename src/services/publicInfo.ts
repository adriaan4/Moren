import { nowInMadrid, dayOfWeek } from "@/lib/time";
import { getSettings } from "@/repositories/settingsRepo";
import { getWeekly, listClosures } from "@/repositories/scheduleRepo";
import { listServices } from "@/repositories/serviceRepo";

/** Datos públicos para la web: ajustes, horario semanal, avisos de cierre y servicios activos. */
export async function getPublicInfo() {
  const [settings, weekly, closures, services] = await Promise.all([getSettings(), getWeekly(), listClosures(), listServices({ onlyActive: true })]);
  const today = nowInMadrid().date;
  const banners = closures
    .filter((c) => c.showBanner && c.end >= today)
    .map((c) => ({ id: c.id, start: c.start, end: c.end, reason: c.reason, message: c.message ?? "" }));
  // El panel "Ajustes" contiene el correo del propietario: no se expone el de notificaciones
  const { ownerNotifyEmail: _omit, ...publicSettings } = settings;
  void _omit;
  return {
    settings: publicSettings,
    weekly,
    banners,
    services: services.map((s) => ({ ...s, effectiveDurationMin: s.durationMin ?? settings.defaultDurationMin })),
    todayDow: dayOfWeek(today),
  };
}
