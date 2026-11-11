import type { Metadata } from "next";
import { VacationsManager } from "@/components/admin/VacationsManager";
export const metadata: Metadata = { title: "Vacaciones y festivos" };
export default function Page() { return <VacationsManager />; }
