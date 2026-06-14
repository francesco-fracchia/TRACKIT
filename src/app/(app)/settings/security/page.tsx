"use client";

import { useState } from "react";
import { authClient } from "@/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type EnableStage = "idle" | "confirm";

function parseSecret(totpURI: string): string {
  try {
    return new URL(totpURI).searchParams.get("secret") ?? totpURI;
  } catch {
    return totpURI;
  }
}

export default function SecuritySettingsPage() {
  const { data: session, isPending, refetch } = authClient.useSession();
  const enabled = Boolean(
    session?.user && "twoFactorEnabled" in session.user
      ? (session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled
      : false,
  );

  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<EnableStage>("idle");
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startEnable() {
    setError(null);
    setBusy(true);
    const { data, error } = await authClient.twoFactor.enable({ password });
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Password errata");
      return;
    }
    setSecret(parseSecret(data.totpURI));
    setBackupCodes(data.backupCodes ?? []);
    setStage("confirm");
  }

  async function confirmEnable() {
    setError(null);
    setBusy(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    setBusy(false);
    if (error) {
      setError(error.message ?? "Codice non valido");
      return;
    }
    setStage("idle");
    setPassword("");
    setCode("");
    setSecret(null);
    await refetch();
  }

  async function disable() {
    setError(null);
    setBusy(true);
    const { error } = await authClient.twoFactor.disable({ password });
    setBusy(false);
    if (error) {
      setError(error.message ?? "Password errata");
      return;
    }
    setPassword("");
    await refetch();
  }

  if (isPending) {
    return <p className="text-muted-foreground">Caricamento…</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Sicurezza</h1>

      <Card>
        <CardHeader>
          <CardTitle>Verifica in due passaggi (2FA)</CardTitle>
          <CardDescription>
            {enabled
              ? "Il 2FA è attivo sul tuo account."
              : "Aggiungi un secondo fattore con un'app di autenticazione (TOTP)."}
          </CardDescription>
        </CardHeader>

        {enabled ? (
          <>
            <CardContent className="space-y-3">
              <Label htmlFor="pwd-disable">
                Conferma la password per disattivare
              </Label>
              <Input
                id="pwd-disable"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="destructive"
                onClick={disable}
                disabled={busy || !password}
              >
                Disattiva 2FA
              </Button>
            </CardFooter>
          </>
        ) : stage === "idle" ? (
          <>
            <CardContent className="space-y-3">
              <Label htmlFor="pwd-enable">Conferma la password</Label>
              <Input
                id="pwd-enable"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={startEnable} disabled={busy || !password}>
                Attiva 2FA
              </Button>
            </CardFooter>
          </>
        ) : (
          <>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  1. Aggiungi questa chiave all&apos;app di autenticazione:
                </p>
                <code className="block break-all rounded-md bg-muted px-3 py-2 text-sm">
                  {secret}
                </code>
              </div>

              {backupCodes.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    2. Salva i codici di backup (usali se perdi l&apos;app):
                  </p>
                  <div className="grid grid-cols-2 gap-1 rounded-md bg-muted px-3 py-2 font-mono text-xs">
                    {backupCodes.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="confirm-code">
                  3. Inserisci il codice a 6 cifre per confermare
                </Label>
                <Input
                  id="confirm-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={confirmEnable}
                disabled={busy || code.length !== 6}
              >
                Conferma e attiva
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
