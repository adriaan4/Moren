import { api, parseBody } from "@/lib/api";
import { newId } from "@/lib/ids";
import { uploadSchema } from "@/schemas";
import { saveImage } from "@/repositories/authRepo";

/**
 * Subida de imágenes (servicios, galería, portada). El navegador las reduce antes de enviarlas;
 * se guardan en Redis y se sirven por /api/images/[id] con caché larga.
 */
export const POST = api(
  async (req) => {
    const { dataUrl } = await parseBody(req, uploadSchema);
    const id = newId("img");
    await saveImage(id, dataUrl);
    return { url: `/api/images/${id}` };
  },
  { admin: true, rate: { name: "upload", limit: 60, windowSec: 600 } },
);
