import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getSession } from "@/services/authService";

export const dynamic = "force-dynamic";

/** Protección de rutas privadas en el servidor: sin sesión de administrador → login. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s || s.role !== "admin") redirect("/admin/login");
  return <AdminShell username={s.sub}>{children}</AdminShell>;
}
