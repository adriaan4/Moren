import { NextResponse, type NextRequest } from "next/server";
import { readImage } from "@/repositories/authRepo";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^img_[a-z0-9]+$/.test(id)) return new NextResponse(null, { status: 404 });
  const dataUrl = await readImage(id);
  const m = dataUrl?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
