import { redirect } from "next/navigation";
import { getSession } from "@/services/authService";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const s = await getSession();
  if (s?.role === "admin") redirect("/admin");
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <LoginForm />
    </main>
  );
}
