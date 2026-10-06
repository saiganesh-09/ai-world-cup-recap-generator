import { cn } from "@/lib/utils";

/** FIFA code → flag asset under public/flags (ISO alpha-2 file names). */
const FIFA_TO_FILE: Record<string, string> = {
  ARG: "ar",
  FRA: "fr",
  ENG: "gb-eng",
  BRA: "br",
  MAR: "ma",
  USA: "us",
  JPN: "jp",
  IND: "in",
};

/**
 * Renders a country's flag from the bundled SVG set (flag-icons).
 * Emoji flags don't render on Windows — local SVGs work everywhere,
 * offline included. Falls back to the short name when unmapped.
 */
export function Flag({
  code,
  name,
  className,
}: {
  /** FIFA 3-letter code, e.g. "IND" */
  code: string;
  name: string;
  className?: string;
}) {
  const file = FIFA_TO_FILE[code.toUpperCase()];
  if (!file) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-sm bg-surface-2 px-1 text-[0.6em] font-bold",
          className,
        )}
      >
        {code}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local static asset
    <img
      src={`/flags/${file}.svg`}
      alt={`${name} flag`}
      title={name}
      className={cn(
        "inline-block h-[1em] w-auto rounded-[3px] shadow-sm shadow-black/40",
        className,
      )}
    />
  );
}
