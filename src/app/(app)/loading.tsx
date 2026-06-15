import { Skeleton } from "@/components/ui/skeleton";

/** Fallback di caricamento per l'area autenticata (es. hub spazi). */
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}
