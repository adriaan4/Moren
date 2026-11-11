import { NextResponse } from "next/server";
import { z } from "zod";
import { api, parseBody } from "@/lib/api";
import { createBackup, exportSnapshot, getBackup, listBackups, restoreSnapshot, type Snapshot } from "@/services/backupService";
import { notFound } from "@/lib/errors";

/** Lista de copias guardadas, o descarga (?download=1 / ?id=…). */
export const GET = api(
  async (req) => {
    const sp = req.nextUrl.searchParams;
    if (sp.get("download")) {
      const id = sp.get("id");
      const snap = id ? await getBackup(id) : await exportSnapshot();
      if (!snap) throw notFound("Copia no encontrada");
      return new NextResponse(JSON.stringify(snap), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="moren-backup-${snap.createdAt.slice(0, 10)}.json"`,
        },
      });
    }
    return { backups: await listBackups() };
  },
  { admin: true },
);

export const POST = api(async () => createBackup(), { admin: true });

const restoreSchema = z.object({ id: z.string().optional(), snapshot: z.custom<Snapshot>().optional() }).refine((b) => b.id || b.snapshot, "Indica id o snapshot");

/** Restaura desde una copia guardada o desde un JSON descargado. Antes crea una copia del estado actual. */
export const PUT = api(
  async (req) => {
    const body = await parseBody(req, restoreSchema);
    const snap = body.snapshot ?? (body.id ? await getBackup(body.id) : null);
    if (!snap) throw notFound("Copia no encontrada");
    return restoreSnapshot(snap);
  },
  { admin: true },
);
