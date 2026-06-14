"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { totpSchema, type TotpInput } from "@/lib/validation/auth";
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

export default function TwoFactorPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TotpInput>({ resolver: zodResolver(totpSchema) });

  async function onSubmit(values: TotpInput) {
    setServerError(null);
    const { error } = await authClient.twoFactor.verifyTotp({
      code: values.code,
    });
    if (error) {
      setServerError(error.message ?? "Codice non valido");
      return;
    }
    router.push("/spaces");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verifica in due passaggi</CardTitle>
        <CardDescription>
          Inserisci il codice a 6 cifre dalla tua app di autenticazione.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Codice</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              {...register("code")}
            />
            {errors.code && (
              <p className="text-sm text-destructive">{errors.code.message}</p>
            )}
          </div>
          {serverError && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {serverError}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Verifica…" : "Verifica"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
