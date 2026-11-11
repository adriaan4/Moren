export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
export const ACTIVE_STATUSES: BookingStatus[] = ["pending", "confirmed"];

/** Franja horaria "HH:MM" – "HH:MM" */
export interface Range {
  start: string;
  end: string;
}

export interface DaySchedule {
  open: boolean;
  ranges: Range[];
}

/** Claves "0".."6" (0 = domingo) */
export type WeeklySchedule = Record<string, DaySchedule>;

/** Excepción para una fecha concreta (cierre o apertura extraordinaria / horario especial) */
export interface ScheduleException {
  date: string; // YYYY-MM-DD
  closed: boolean;
  ranges: Range[];
  note?: string;
}

/** Bloqueo de horas (o de todo el día con 00:00–24:00) */
export interface Block {
  id: string;
  date: string;
  start: string;
  end: string;
  reason?: string;
}

/** Vacaciones, festivos y cierres extraordinarios (rango de fechas completo) */
export interface Closure {
  id: string;
  kind: "vacation" | "holiday" | "other";
  start: string;
  end: string;
  reason: string;
  message?: string;
  showBanner: boolean;
}

export interface Service {
  id: string;
  name: string;
  priceCents: number;
  durationMin?: number;
  description?: string;
  imageUrl?: string;
  active: boolean;
  order: number;
}

/** Copia congelada del servicio en el momento de reservar */
export interface ServiceSnapshot {
  serviceId: string;
  name: string;
  priceCents: number;
  durationMin: number;
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export interface Customer extends CustomerInfo {
  id: string;
  notes?: string;
  consentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  /** Clave secreta para ver la confirmación sin iniciar sesión */
  accessKey: string;
  customerId: string;
  customer: CustomerInfo;
  service: ServiceSnapshot;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  endTime: string; // HH:MM
  status: BookingStatus;
  notes?: string;
  source: "web" | "admin";
  consentAt: string;
  reminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  author: string;
  text: string;
  rating: number;
}

export interface Settings {
  businessName: string;
  phone: string;
  address: string;
  email: string;
  mapsUrl: string;
  tagline: string;
  intro: string;
  about: string;
  heroImageUrl: string;
  gallery: string[];
  reviews: Review[];
  announcement: string;
  /** Horas mínimas de antelación para reservar */
  minAdvanceHours: number;
  /** Días máximos hacia el futuro */
  maxDaysAhead: number;
  /** Horas mínimas antes de la cita para que el cliente pueda cancelar */
  cancelMinHours: number;
  /** Horas mínimas antes de la cita para que el cliente pueda modificar */
  modifyMinHours: number;
  allowServiceChange: boolean;
  /** Si true, las reservas web quedan "pendientes" hasta que el admin las confirme */
  requireApproval: boolean;
  /** Intervalo entre horas ofrecidas (múltiplo de 15) */
  slotStepMin: number;
  /** Duración por defecto de servicios sin duración (min) */
  defaultDurationMin: number;
  ownerNotifyEmail: string;
}

export type Role = "admin" | "client";
export interface SessionData {
  role: Role;
  sub: string; // username (admin) o customerId (client)
  createdAt: number;
}

export type DayStatus =
  | "available"
  | "full"
  | "closed"
  | "past"
  | "out_of_range";

export interface DayOverview {
  date: string;
  status: DayStatus;
  /** Motivo público del cierre (vacaciones, festivo…) */
  label?: string;
}
