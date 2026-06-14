import { z } from "zod";

export const SPACE_TYPE_VALUES = ["personal", "business", "shared"] as const;

export const createSpaceSchema = z.object({
  name: z.string().trim().min(1, "Inserisci un nome").max(80),
  type: z.enum(SPACE_TYPE_VALUES),
  baseCurrency: z
    .string()
    .trim()
    .length(3, "Codice valuta a 3 lettere (es. EUR)")
    .transform((v) => v.toUpperCase()),
});
export type CreateSpaceFormInput = z.input<typeof createSpaceSchema>;
export type CreateSpaceValues = z.output<typeof createSpaceSchema>;

export const INVITE_ROLE_VALUES = ["admin", "member", "viewer"] as const;

export const inviteMemberSchema = z.object({
  email: z.email("Email non valida").transform((v) => v.trim().toLowerCase()),
  role: z.enum(INVITE_ROLE_VALUES),
});
export type InviteMemberValues = z.infer<typeof inviteMemberSchema>;
