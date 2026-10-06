import { apiHandler } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

const KINDS = {
  video: { column: "videoBytes" as const, mime: "video/mp4" },
  thumbnail: { column: "thumbBytes" as const, mime: "image/png" },
} as const;

/**
 * Serves generated media stored as DB blobs.
 * Stateless: works on hosts with ephemeral filesystems (Render, containers
 * without volumes). Public recaps serve anonymously; private ones owner-only.
 */
export const GET = apiHandler(
  async (
    _req: Request,
    ctx: { params: Promise<{ id: string; kind: string }> },
  ) => {
    const { id, kind } = await ctx.params;
    const spec = KINDS[kind as keyof typeof KINDS];
    if (!spec) throw new NotFoundError("Media");

    const recap = await prisma.recap.findUnique({
      where: { id },
      select: { isPublic: true, userId: true, videoBytes: true, thumbBytes: true },
    });
    const bytes = recap ? recap[spec.column] : null;
    if (!recap || !bytes) throw new NotFoundError("Media");

    if (!recap.isPublic) {
      const user = await getSessionUser();
      if (!user || user.id !== recap.userId) {
        throw new NotFoundError("Media");
      }
    }

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": spec.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  },
);
