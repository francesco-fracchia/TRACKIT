import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const name = session?.user.name ?? "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Ciao{name ? `, ${name}` : ""} 👋
        </h1>
        <p className="text-muted-foreground">
          Questa è la base di TRACKIT. Le funzionalità arrivano per milestone.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prossimo passo: gli Spazi</CardTitle>
          <CardDescription>
            In M1 potrai creare spazi (personali, business, condivisi), conti e
            transazioni.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/settings/security">Configura la sicurezza (2FA)</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
