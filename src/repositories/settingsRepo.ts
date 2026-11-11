import { redis } from "@/lib/redis";
import { keys } from "@/lib/keys";
import type { Settings } from "@/types";

/** Valores iniciales. No se inventan servicios, precios ni horarios: todo se configura desde el panel. */
export const DEFAULT_SETTINGS: Settings = {
  businessName: "MORÉN PELUQUERÍA DE CABALLEROS",
  legalName: "",
  legalId: "",
  phone: "976 44 64 54",
  address: "Avenida de Pablo Gargallo 107, 50003 Zaragoza",
  email: "",
  mapsUrl: "https://maps.app.goo.gl/Bou7hFx5b9NBrdxm6",
  tagline: "Tu estilo, en buenas manos",
  intro:
    "Peluquería de caballeros en el barrio de Pablo Gargallo, Zaragoza. Corte, barba y cuidado masculino con trato cercano y atención al detalle.",
  about: "",
  heroImageUrl: "",
  gallery: [],
  reviews: [],
  announcement: "",
  minAdvanceHours: 2,
  maxDaysAhead: 60,
  cancelMinHours: 24,
  modifyMinHours: 24,
  allowServiceChange: true,
  requireApproval: false,
  slotStepMin: 15,
  defaultDurationMin: 30,
  ownerNotifyEmail: "",
};

export async function getSettings(): Promise<Settings> {
  const stored = await redis.get<Partial<Settings>>(keys.settings);
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function saveSettings(s: Settings): Promise<Settings> {
  await redis.set(keys.settings, s);
  return s;
}
