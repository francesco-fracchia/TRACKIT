import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor, organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { serverEnv } from "@/env";
import { sendEmail } from "@/lib/email";
import { ac, roles } from "./permissions";

/**
 * Configurazione Better Auth.
 *
 * Sicurezza:
 * - Password con **argon2id** (override del default scrypt) via @node-rs/argon2.
 * - Verifica email **obbligatoria** prima del login.
 * - **2FA TOTP** opzionale per utente (plugin twoFactor).
 * - Spazi = **organization** (plugin organization): membership, inviti, ruoli.
 * - Cookie sessione httpOnly/Secure/SameSite gestiti da Better Auth.
 *
 * I 4 ruoli del dominio (owner/admin/member/viewer): owner/admin/member sono
 * nativi del plugin; il ruolo `viewer` + access-control granulare verranno
 * configurati in M1 con la gestione membri (vedi DECISIONS).
 */
export const auth = betterAuth({
  appName: "TRACKIT",
  secret: serverEnv.BETTER_AUTH_SECRET,
  baseURL: serverEnv.BETTER_AUTH_URL,

  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    // Hashing argon2id: è l'algoritmo di DEFAULT di @node-rs/argon2 (con
    // parametri robusti), quindi non serve specificarlo. Override del default
    // di Better Auth (scrypt).
    password: {
      hash: (password) => argonHash(password),
      verify: ({ hash, password }) => argonVerify(hash, password),
    },
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reimposta la tua password — TRACKIT",
        text: `Per reimpostare la password apri questo link:\n${url}\n\nSe non sei stato tu, ignora questa email.`,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Conferma la tua email — TRACKIT",
        text: `Benvenuto in TRACKIT! Conferma la tua email aprendo questo link:\n${url}`,
      });
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 giorni (scadenza assoluta)
    updateAge: 60 * 60 * 24, // rinnovo se più vecchia di 1 giorno
    freshAge: 60 * 60, // operazioni sensibili richiedono sessione "fresca" (1h)
  },

  advanced: {
    cookiePrefix: "trackit",
    useSecureCookies: serverEnv.NODE_ENV === "production",
  },

  plugins: [
    twoFactor({
      issuer: "TRACKIT",
    }),
    organization({
      ac,
      roles,
      sendInvitationEmail: async ({ email, organization, inviter, id }) => {
        const url = `${serverEnv.BETTER_AUTH_URL}/invitations/${id}`;
        await sendEmail({
          to: email,
          subject: `Invito a "${organization.name}" — TRACKIT`,
          text: `${inviter.user.name} ti ha invitato nello spazio "${organization.name}".\nAccetta qui:\n${url}`,
        });
      },
    }),
    // nextCookies DEVE essere l'ultimo plugin: consente la scrittura dei
    // cookie dalle Server Actions di Next.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
