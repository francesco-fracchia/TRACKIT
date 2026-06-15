"use client";

import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { Check, ChevronsUpDown, LayoutGrid } from "lucide-react";

interface SpaceItem {
  id: string;
  name: string;
}

/** Dropdown per passare rapidamente da uno spazio all'altro. */
export function SpaceSwitcher({
  currentId,
  spaces,
}: {
  currentId: string;
  spaces: SpaceItem[];
}) {
  const current = spaces.find((s) => s.id === currentId);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-2 rounded-md px-2 py-1 text-lg font-semibold tracking-tight hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Cambia spazio"
        >
          <span className="max-w-[12rem] truncate">
            {current?.name ?? "Spazio"}
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-56 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-xs text-muted-foreground">
            I tuoi spazi
          </DropdownMenu.Label>
          {spaces.map((s) => (
            <DropdownMenu.Item key={s.id} asChild>
              <Link
                href={`/${s.id}/dashboard`}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent"
              >
                <span className="truncate">{s.name}</span>
                {s.id === currentId && (
                  <Check className="size-4 shrink-0" aria-hidden />
                )}
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link
              href="/spaces"
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground outline-none data-[highlighted]:bg-accent data-[highlighted]:text-foreground"
            >
              <LayoutGrid className="size-4" aria-hidden />
              Tutti gli spazi
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
