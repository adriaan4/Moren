import type { WeeklySchedule } from "@/types";

export const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
/** Orden de visualización: lunes → domingo */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function formatWeekly(weekly: WeeklySchedule): { day: string; dow: number; text: string; open: boolean }[] {
  return DAY_ORDER.map((dow) => {
    const d = weekly[String(dow)];
    const open = !!d?.open && d.ranges.length > 0;
    return {
      day: DAY_NAMES[dow],
      dow,
      open,
      text: open ? d.ranges.map((r) => `${r.start} – ${r.end}`).join("  ·  ") : "Cerrado",
    };
  });
}

export function telHref(phone: string): string {
  return `tel:+34${phone.replace(/\D/g, "").replace(/^34/, "")}`;
}

export function durationLabel(min?: number | null): string {
  if (!min) return "";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
