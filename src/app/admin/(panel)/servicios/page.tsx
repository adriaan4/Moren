import type { Metadata } from "next";
import { ServicesManager } from "@/components/admin/ServicesManager";
export const metadata: Metadata = { title: "Servicios" };
export default function Page() { return <ServicesManager mode="full" />; }
