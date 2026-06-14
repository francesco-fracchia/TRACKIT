"use client";

import { createAuthClient } from "better-auth/react";
import {
  twoFactorClient,
  organizationClient,
} from "better-auth/client/plugins";
import { ac, roles } from "./permissions";

/**
 * Client Better Auth per i componenti React. I plugin client devono
 * combaciare con quelli configurati lato server (twoFactor, organization).
 */
export const authClient = createAuthClient({
  plugins: [twoFactorClient(), organizationClient({ ac, roles })],
});

export const { signIn, signUp, signOut, useSession } = authClient;
