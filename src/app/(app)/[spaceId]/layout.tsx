import Link from "next/link";
import { redirect } from "next/navigation";
import { getSpace } from "@/server/dal/spaces";
import { ForbiddenError, UnauthorizedError } from "@/server/dal/context";
import { SpaceNav } from "./space-nav";

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

  return (
    <div className="-mx-6 -my-8">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/spaces"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Spazi
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-lg font-semibold tracking-tight">
              {space.name}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {TYPE_LABELS[space.type] ?? space.type} · {space.baseCurrency} ·
            ruolo: {space.role}
          </p>
        </div>
      </div>
      <SpaceNav spaceId={spaceId} />
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}
