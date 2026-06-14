import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";

/**
 * Layout dell'area autenticata. Protegge tutte le route figlie: senza una
 * sessione valida, redirect al login. La verifica è lato server.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex items-center gap-4">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            TRACKIT
          </Link>
          <Link
            href="/settings/security"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sicurezza
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {session.user.email}
          </span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
