"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Section {
  slug: string;
  label: string;
}

const SECTIONS: Section[] = [
  { slug: "dashboard", label: "Panoramica" },
  { slug: "accounts", label: "Conti" },
  { slug: "transactions", label: "Transazioni" },
  { slug: "budgets", label: "Budget" },
  { slug: "goals", label: "Obiettivi" },
  { slug: "net-worth", label: "Patrimonio" },
  { slug: "shared", label: "Condivise" },
  { slug: "planning", label: "Pianificazione" },
  { slug: "projections", label: "Proiezioni" },
  { slug: "import", label: "Import" },
  { slug: "reviews", label: "Revisioni" },
  { slug: "members", label: "Membri" },
  { slug: "settings", label: "Impostazioni" },
];

export function SpaceNav({
  spaceId,
  isBusiness = false,
}: {
  spaceId: string;
  isBusiness?: boolean;
}) {
  const pathname = usePathname();

  // Il "Fatturato" è una sezione specifica degli spazi business.
  const sections: Section[] = isBusiness
    ? [
        ...SECTIONS.slice(0, 3),
        { slug: "revenue", label: "Fatturato" },
        { slug: "vat", label: "IVA" },
        ...SECTIONS.slice(3),
      ]
    : SECTIONS;

  return (
    <nav
      aria-label="Sezioni dello spazio"
      className="flex gap-1 overflow-x-auto border-b px-6"
    >
      {sections.map((s) => {
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
