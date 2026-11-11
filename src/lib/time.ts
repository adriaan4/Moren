/** Utilidades de fecha/hora. Todo el negocio opera en hora de Madrid. */
export const TZ = "Europe/Madrid";

export function nowInMadrid(d: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const utcMs = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export function addDays(date: string, n: number): string {
  return new Date(utcMs(date) + n * 86_400_000).toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  return Math.round((utcMs(to) - utcMs(from)) / 86_400_000);
}

/** 0 = domingo … 6 = sábado */
export function dayOfWeek(date: string): number {
  return new Date(utcMs(date)).getUTCDay();
}

export function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 800; d = addDays(d, 1)) out.push(d);
  return out;
}

export function monthDates(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: last }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

/** Minutos "de reloj local" desde una época arbitraria; la diferencia entre dos valores es la distancia local. */
export function localIndex(date: string, minutes: number): number {
  return utcMs(date) / 60_000 + minutes;
}

export function minutesUntil(date: string, minutes: number, now = nowInMadrid()): number {
  return localIndex(date, minutes) - localIndex(now.date, now.minutes);
}

export function sortScore(date: string, minutes: number): number {
  return Number(date.replace(/-/g, "")) * 10_000 + minutes;
}

export function formatDateEs(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" }): string {
  return new Intl.DateTimeFormat("es-ES", { ...opts, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
}
