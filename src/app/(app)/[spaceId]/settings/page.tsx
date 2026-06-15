import { getSpace } from "@/server/dal/spaces";
import { hasSufficientRole } from "@/server/dal/roles";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteSpace } from "./delete-space";

const TYPE_LABELS: Record<string, string> = {
  personal: "Personale",
  business: "Business",
  shared: "Condiviso",
};

export default async function SpaceSettingsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const space = await getSpace(spaceId);
  const isOwner = hasSufficientRole(space.role, "owner");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Impostazioni spazio</h2>

      <Card>
        <CardHeader>
          <CardTitle>{space.name}</CardTitle>
          <CardDescription>
            {TYPE_LABELS[space.type] ?? space.type} · valuta{" "}
            {space.baseCurrency} · il tuo ruolo: {space.role}
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Zona pericolosa
        </h3>
        {isOwner ? (
          <DeleteSpace spaceId={spaceId} spaceName={space.name} />
        ) : (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            Solo il proprietario dello spazio può eliminarlo.
          </p>
        )}
      </section>
    </div>
  );
}
