import Link from "next/link";
import { listMySpaces } from "@/server/dal/spaces";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateSpaceForm } from "./create-space-form";

const TYPE_LABELS: Record<string, string> = {
  personal: "Personale",
  business: "Business",
  shared: "Condiviso",
};

export default async function SpacesPage() {
  const spaces = await listMySpaces();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">I tuoi spazi</h1>
        <p className="text-muted-foreground">
          Uno spazio è un registro: personale, business o condiviso.
        </p>
      </div>

      {spaces.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {spaces.map((s) => (
            <li key={s.id}>
              <Link href={`/${s.id}/dashboard`} className="block">
                <Card className="transition-colors hover:border-foreground/30">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {s.name}
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-normal text-secondary-foreground">
                        {TYPE_LABELS[s.type] ?? s.type}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Valuta {s.baseCurrency} · ruolo: {s.role}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          Non hai ancora spazi. Creane uno per iniziare.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Crea un nuovo spazio</CardTitle>
          <CardDescription>
            Decidi tu come separare personale e business.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateSpaceForm />
        </CardContent>
      </Card>
    </div>
  );
}
