import { addDays, nowInMadrid } from "@/lib/time";
import * as bookingRepo from "@/repositories/bookingRepo";
import * as customerRepo from "@/repositories/customerRepo";
import type { Booking, BookingStatus } from "@/types";

const STATUSES: BookingStatus[] = ["pending", "confirmed", "cancelled", "completed", "no_show"];

function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // lunes = 0
  return addDays(date, -dow);
}

function bucket(bookings: Booking[], keyOf: (b: Booking) => string, labels: string[]) {
  const counts = new Map(labels.map((l) => [l, 0]));
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const k = keyOf(b);
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return labels.map((label) => ({ label, count: counts.get(label) ?? 0 }));
}

export async function getStats() {
  const now = nowInMadrid();
  const [all, customers] = await Promise.all([bookingRepo.listAll(), customerRepo.listCustomers()]);

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<BookingStatus, number>;
  for (const b of all) byStatus[b.status]++;

  const today = all.filter((b) => b.date === now.date && b.status !== "cancelled").sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = all
    .filter((b) => (b.status === "confirmed" || b.status === "pending") && (b.date + b.time) >= (now.date + "00:00"))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 8);

  const days = Array.from({ length: 30 }, (_, i) => addDays(now.date, i - 29));
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(weekStart(now.date), (i - 11) * 7));
  const months = Array.from({ length: 12 }, (_, i) => {
    const [y, m] = now.date.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 - (11 - i), 1));
    return d.toISOString().slice(0, 7);
  });

  const perDay = bucket(all, (b) => b.date, days);
  const perWeek = bucket(all, (b) => weekStart(b.date), weeks);
  const perMonth = bucket(all, (b) => b.date.slice(0, 7), months);

  const thisWeekStart = weekStart(now.date);
  const thisMonth = now.date.slice(0, 7);
  const weekBookings = all.filter((b) => b.status !== "cancelled" && weekStart(b.date) === thisWeekStart);
  const monthBookings = all.filter((b) => b.status !== "cancelled" && b.date.startsWith(thisMonth));
  const revenue = (list: Booking[]) => list.filter((b) => b.status === "completed").reduce((s, b) => s + b.service.priceCents, 0);

  const serviceCount = new Map<string, { name: string; count: number }>();
  for (const b of all) {
    if (b.status === "cancelled") continue;
    const cur = serviceCount.get(b.service.serviceId) ?? { name: b.service.name, count: 0 };
    cur.count++;
    serviceCount.set(b.service.serviceId, cur);
  }

  return {
    byStatus,
    totalCustomers: customers.length,
    today,
    upcoming,
    week: { total: weekBookings.length, revenueCents: revenue(weekBookings) },
    month: { total: monthBookings.length, revenueCents: revenue(monthBookings) },
    perDay,
    perWeek,
    perMonth,
    topServices: [...serviceCount.values()].sort((a, b) => b.count - a.count).slice(0, 6),
  };
}

/** Estadísticas de frecuencia de un cliente. */
export function customerStats(bookings: Booking[]) {
  const done = bookings.filter((b) => b.status === "completed");
  const dates = done.map((b) => b.date).sort();
  let avgDays: number | null = null;
  if (dates.length > 1) {
    const span = (new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / 86_400_000;
    avgDays = Math.round(span / (dates.length - 1));
  }
  return {
    total: bookings.length,
    completed: done.length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    noShows: bookings.filter((b) => b.status === "no_show").length,
    lastVisit: dates[dates.length - 1] ?? null,
    avgDaysBetweenVisits: avgDays,
  };
}
