import type { Metadata } from "next";
import { BookingsManager } from "@/components/admin/BookingsManager";
export const metadata: Metadata = { title: "Gestión de citas" };
export default function Page() { return <BookingsManager />; }
