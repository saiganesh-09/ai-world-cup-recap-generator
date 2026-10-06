import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native/binary-dependent packages out of the bundle so their
  // on-disk paths (ffmpeg binary, sharp libvips) resolve correctly.
  serverExternalPackages: ["ffmpeg-static", "sharp", "bcryptjs", "@prisma/client"],
};

export default nextConfig;
