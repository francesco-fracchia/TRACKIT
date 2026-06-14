"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validation/auth";
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

function ConfirmResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link non valido</CardTitle>
          <CardDescription>
            Il link di reset è mancante o scaduto. Richiedine uno nuovo.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/reset-password">Richiedi un nuovo link</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token: token!,
    });
    if (error) {
      setServerError(error.message ?? "Reset non riuscito");
      return;
    }
    router.push("/sign-in");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuova password</CardTitle>
        <CardDescription>Scegli una nuova password sicura.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nuova password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
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
            {isSubmitting ? "Salvataggio…" : "Imposta password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ConfirmResetPage() {
  return (
    <Suspense>
      <ConfirmResetForm />
    </Suspense>
  );
}
