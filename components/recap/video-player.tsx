"use client";

import { useRef } from "react";

export function VideoPlayer({
  src,
  poster,
  title,
}: {
  src: string;
  poster?: string | null;
  title: string;
}) {
  const tracked = useRef(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-black">
      <video
        controls
        playsInline
        preload="metadata"
        poster={poster ?? undefined}
        className="aspect-video w-full"
        aria-label={title}
        onPlay={() => {
          if (!tracked.current) {
            tracked.current = true;
            void fetch("/api/analytics", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: "video_played", props: { src } }),
            });
          }
        }}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
