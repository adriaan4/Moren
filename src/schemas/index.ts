import { z } from "zod";

export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD)");
export const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:MM)");
export const endTimeStr = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, "Hora inválida (HH:MM)");
export const monthStr = z.string().regex(/^\d{4}-\d{2}$/, "Mes inválido (AAAA-MM)");

const text = (max: number) => z.string().trim().max(max);

export const customerInfoSchema = z.object({
  firstName: text(60).min(1, "Introduce tu nombre"),
  lastName: text(80).min(1, "Introduce tus apellidos"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{9,18}$/, "Teléfono no válido"),
  email: z.string().trim().toLowerCase().email("Correo no válido").max(120),
});

export const createBookingSchema = z.object({
  serviceId: z.string().min(1),
  date: dateStr,
  time: timeStr,
  customer: customerInfoSchema,
  notes: text(300).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "Debes aceptar la política de privacidad" }) }),
});

export const adminCreateBookingSchema = z.object({
  serviceId: z.string().min(1),
  date: dateStr,
  time: timeStr,
  customer: customerInfoSchema.extend({
    // El administrador puede crear citas con un correo/teléfono más flexible
    email: z.string().trim().toLowerCase().email().max(120),
  }),
  notes: text(300).optional(),
  status: z.enum(["pending", "confirmed"]).default("confirmed"),
});

export const rescheduleSchema = z.object({
  date: dateStr,
  time: timeStr,
  serviceId: z.string().min(1).optional(),
});

export const adminBookingPatchSchema = z.union([
  z.object({ action: z.literal("reschedule"), date: dateStr, time: timeStr, serviceId: z.string().optional() }),
  z.object({ action: z.literal("status"), status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]) }),
  z.object({ action: z.literal("notes"), notes: text(300) }),
]);

export const availabilityQuerySchema = z.object({
  serviceId: z.string().optional(),
  date: dateStr.optional(),
  month: monthStr.optional(),
  exclude: z.string().optional(),
});

export const requestLinkSchema = z.object({ email: z.string().trim().toLowerCase().email() });

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
});

export const rangeSchema = z
  .object({ start: timeStr, end: endTimeStr })
  .refine((r) => r.start < r.end, "La hora de inicio debe ser anterior a la de fin");

export const weeklyScheduleSchema = z.record(
  z.string().regex(/^[0-6]$/),
  z.object({ open: z.boolean(), ranges: z.array(rangeSchema).max(4) }),
);

export const exceptionSchema = z.object({
  dateFrom: dateStr,
  dateTo: dateStr.optional(),
  closed: z.boolean(),
  ranges: z.array(rangeSchema).max(4).default([]),
  note: text(120).optional(),
});

export const blockSchema = z.object({
  date: dateStr,
  start: timeStr,
  end: endTimeStr,
  reason: text(120).optional(),
});

export const closureSchema = z
  .object({
    kind: z.enum(["vacation", "holiday", "other"]).default("vacation"),
    start: dateStr,
    end: dateStr,
    reason: text(120).min(1),
    message: text(300).optional(),
    showBanner: z.boolean().default(true),
  })
  .refine((c) => c.start <= c.end, "La fecha de inicio debe ser anterior a la de fin");

export const serviceCreateSchema = z.object({
  name: text(80).min(1, "El nombre es obligatorio"),
  priceCents: z.number().int().min(0).max(1_000_000),
  durationMin: z.number().int().min(5).max(480).optional(),
  description: text(400).optional(),
  imageUrl: text(300).optional(),
  active: z.boolean().default(true),
});
/** En un PATCH, durationMin: null borra la duración propia (se usará la de Configuración). */
export const servicePatchSchema = serviceCreateSchema.partial().extend({
  durationMin: z.number().int().min(5).max(480).nullable().optional(),
});
export const reorderSchema = z.object({ ids: z.array(z.string()).min(1) });

export const customerPatchSchema = z.object({
  firstName: text(60).min(1).optional(),
  lastName: text(80).min(1).optional(),
  phone: z.string().trim().regex(/^\+?[\d\s().-]{9,18}$/).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  notes: text(500).optional(),
});

export const settingsSchema = z.object({
  businessName: text(80).min(1),
  phone: text(30),
  address: text(200),
  email: z.string().trim().max(120).refine((v) => v === "" || /^\S+@\S+\.\S+$/.test(v), "Correo no válido"),
  mapsUrl: text(300),
  tagline: text(120),
  intro: text(600),
  about: text(2000),
  heroImageUrl: text(300),
  gallery: z.array(text(300)).max(30),
  reviews: z
    .array(z.object({ author: text(60).min(1), text: text(500).min(1), rating: z.number().min(1).max(5) }))
    .max(20),
  announcement: text(300),
  minAdvanceHours: z.number().min(0).max(720),
  maxDaysAhead: z.number().int().min(1).max(365),
  cancelMinHours: z.number().min(0).max(720),
  modifyMinHours: z.number().min(0).max(720),
  allowServiceChange: z.boolean(),
  requireApproval: z.boolean(),
  slotStepMin: z.number().int().refine((n) => n % 15 === 0 && n >= 15 && n <= 120, "Múltiplo de 15"),
  defaultDurationMin: z.number().int().min(5).max(480),
  ownerNotifyEmail: z.string().trim().max(120).refine((v) => v === "" || /^\S+@\S+\.\S+$/.test(v), "Correo no válido"),
});

export const uploadSchema = z.object({
  dataUrl: z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/).max(900_000),
});

export const bookingListQuerySchema = z.object({
  q: z.string().optional(),
  date: dateStr.optional(),
  from: dateStr.optional(),
  to: dateStr.optional(),
  serviceId: z.string().optional(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
