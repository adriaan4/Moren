import type { Metadata } from "next";
import { ServicesManager } from "@/components/admin/ServicesManager";
export const metadata: Metadata = { title: "Gestión de precios y servicios" };
export default function Page() { return <ServicesManager mode="prices" />; }
