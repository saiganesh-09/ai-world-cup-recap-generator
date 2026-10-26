import { flagUrlFor } from "@/lib/flags";

// Real flag image for a country — falls back to the team's emoji
// (or nothing) when no flag asset exists.
export function Flag({
  country,
  emoji,
  size = "md",
  className = "",
}: {
  country: string;
  emoji?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const url = flagUrlFor(country);
  const dims = { sm: "h-3.5 w-5", md: "h-4 w-6", lg: "h-5 w-7" }[size];
  if (!url) {
    return emoji ? <span className={className}>{emoji}</span> : null;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`${country} flag`}
      width={24}
      height={16}
      className={`inline-block rounded-[2px] object-cover ${dims} ${className}`}
      loading="lazy"
    />
  );
}
