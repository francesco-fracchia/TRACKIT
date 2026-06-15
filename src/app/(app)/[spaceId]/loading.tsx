import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback di caricamento per il contenuto di uno spazio. Mostrato all'istante
 * da Next mentre la pagina/sezione carica (header e nav restano visibili).
 */
export default function SpaceLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-7 w-40" />
      <div className="space-y-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    </div>
  );
}
