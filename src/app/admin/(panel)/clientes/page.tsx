import type { Metadata } from "next";
import { CustomersManager } from "@/components/admin/CustomersManager";
export const metadata: Metadata = { title: "Clientes" };
export default function Page() { return <CustomersManager />; }
