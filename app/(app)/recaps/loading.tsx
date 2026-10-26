import { Skeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-48" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56" />
        ))}
      </div>
    </div>
  );
}
