import type { Metadata } from "next";
import { ScheduleManager } from "@/components/admin/ScheduleManager";
export const metadata: Metadata = { title: "Horarios de apertura" };
export default function Page() { return <ScheduleManager />; }
