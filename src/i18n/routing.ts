import { defineRouting } from "next-intl/routing";

/**
 * Configurazione routing localizzato.
 * IT è la lingua principale; la struttura è pronta per aggiungere lingue
 * (basta estendere `locales` e fornire il relativo file in `messages/`).
 */
export const routing = defineRouting({
  locales: ["it"],
  defaultLocale: "it",
  // Niente prefisso per la lingua di default: "/" anziché "/it".
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
