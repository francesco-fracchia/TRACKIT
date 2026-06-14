"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/auth/client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSignOut() {
    setLoading(true);
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onSignOut}
      disabled={loading}
      aria-label="Esci"
    >
      <LogOut aria-hidden />
      <span className="hidden sm:inline">Esci</span>
    </Button>
  );
}
