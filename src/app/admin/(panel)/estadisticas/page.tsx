import type { Metadata } from "next";
import { Dashboard } from "@/components/admin/Dashboard";
export const metadata: Metadata = { title: "Estadísticas" };
export default function Page() { return <Dashboard full />; }
