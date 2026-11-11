import { z } from "zod";
import { api, parseBody, parseQuery } from "@/lib/api";
import { blockSchema } from "@/schemas";
import { addBlock, deleteBlock, listBlocks } from "@/repositories/scheduleRepo";

export const GET = api(async () => ({ blocks: await listBlocks() }), { admin: true });

export const POST = api(
  async (req) => {
    const b = await parseBody(req, blockSchema);
    return { block: await addBlock(b) };
  },
  { admin: true },
);

export const DELETE = api(
  async (req) => {
    const { id } = parseQuery(req, z.object({ id: z.string().min(1) }));
    await deleteBlock(id);
  },
  { admin: true },
);
