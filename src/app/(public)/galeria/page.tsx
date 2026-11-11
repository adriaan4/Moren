import type { Metadata } from "next";
import { Gallery, PageHeader } from "@/components/public/Sections";
import { getPublicInfo } from "@/services/publicInfo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Galería · Cortes y barbería en Zaragoza",
  description: "Fotografías de Morén Peluquería de Caballeros: el local, los cortes y el trabajo de barbería.",
  alternates: { canonical: "/galeria" },
};

export default async function GaleriaPage() {
  const { settings } = await getPublicInfo();
  return (
    <>
      <PageHeader eyebrow="Galería" title="El local y nuestro trabajo" />
      <section className="py-16">
        <div className="container-x">
          <Gallery images={settings.gallery} name={settings.businessName} />
        </div>
      </section>
    </>
  );
}
