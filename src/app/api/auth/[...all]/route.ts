import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/auth";

/** Espone tutti gli endpoint di Better Auth sotto /api/auth/*. */
export const { GET, POST } = toNextJsHandler(auth);
