import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="font-display text-5xl">Página no encontrada</h1>
      <Link href="/" className="btn-gold">Volver al inicio</Link>
    </main>
  );
}
