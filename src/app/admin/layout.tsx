import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Panel privado", template: "%s · Panel Morén" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
