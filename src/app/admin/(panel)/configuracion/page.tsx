import type { Metadata } from "next";
import { SettingsManager } from "@/components/admin/SettingsManager";
export const metadata: Metadata = { title: "Configuración" };
export default function Page() { return <SettingsManager />; }
