"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  requestResetSchema,
  type RequestResetInput,
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

export default function RequestResetPage() {
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestResetInput>({ resolver: zodResolver(requestResetSchema) });

  async function onSubmit(values: RequestResetInput) {
    // Non riveliamo se l'email esiste: mostriamo sempre conferma.
    await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: "/reset-password/confirm",
    });
    setDone(true);
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Controlla la tua email</CardTitle>
          <CardDescription>
            Se esiste un account con quell&apos;indirizzo, riceverai un link per
            reimpostare la password.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/sign-in">Torna al login</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reimposta la password</CardTitle>
        <CardDescription>
          Inserisci la tua email: ti invieremo un link.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Invio…" : "Invia il link"}
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/sign-in">Annulla</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
