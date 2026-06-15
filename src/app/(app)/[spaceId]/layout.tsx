import { redirect } from "next/navigation";
import { getSpace, listMySpaces } from "@/server/dal/spaces";
import { ForbiddenError, UnauthorizedError } from "@/server/dal/context";
import { SpaceNav } from "./space-nav";
import { SpaceSwitcher } from "./space-switcher";

const TYPE_LABELS: Record<string, string> = {
  personal: "Personale",
  business: "Business",
  shared: "Condiviso",
};

export default async function SpaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;

  let space;
  try {
    space = await getSpace(spaceId);
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect("/sign-in");
    if (err instanceof ForbiddenError) redirect("/spaces");
    throw err;
  }

  const spaces = await listMySpaces();

  return (
    <div className="-mx-6 -my-8">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <SpaceSwitcher
            currentId={spaceId}
            spaces={spaces.map((s) => ({ id: s.id, name: s.name }))}
          />
          <p className="px-2 text-xs text-muted-foreground">
            {TYPE_LABELS[space.type] ?? space.type} · {space.baseCurrency} ·
            ruolo: {space.role}
          </p>
        </div>
      </div>
      <SpaceNav spaceId={spaceId} isBusiness={space.type === "business"} />
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}
