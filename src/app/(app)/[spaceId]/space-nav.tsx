"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { slug: "dashboard", label: "Panoramica" },
  { slug: "accounts", label: "Conti" },
  { slug: "transactions", label: "Transazioni" },
  { slug: "budgets", label: "Budget" },
  { slug: "goals", label: "Obiettivi" },
  { slug: "net-worth", label: "Patrimonio" },
  { slug: "planning", label: "Pianificazione" },
  { slug: "projections", label: "Proiezioni" },
  { slug: "members", label: "Membri" },
] as const;

export function SpaceNav({ spaceId }: { spaceId: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sezioni dello spazio"
      className="flex gap-1 overflow-x-auto border-b px-6"
    >
      {SECTIONS.map((s) => {
        const href = `/${spaceId}/${s.slug}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={s.slug}
            href={href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
