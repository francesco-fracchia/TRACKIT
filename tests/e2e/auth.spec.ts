import { test, expect } from "@playwright/test";

/**
 * E2E sui flussi critici di autenticazione (M0).
 * La verifica email completa richiede l'intercettazione del link: verrà
 * coperta quando introdurremo un transport email di test. Qui copriamo i
 * percorsi UI e di sicurezza che non dipendono dall'email.
 */

test("la route protetta /dashboard redirige al login se non autenticati", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("registrazione: mostra la schermata 'controlla la tua email'", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@test.local`;
  await page.goto("/sign-up");
  await page.getByLabel("Nome").fill("Utente E2E");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password-e2e-123");
  await page.getByRole("button", { name: "Registrati" }).click();
  await expect(
    page.getByText("Controlla la tua email", { exact: false }),
  ).toBeVisible();
});

test("login con credenziali errate mostra un errore", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("inesistente@test.local");
  await page.getByLabel("Password").fill("password-sbagliata-123");
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});

test("validazione client: email non valida blocca l'invio", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("non-una-email");
  await page.getByLabel("Password").fill("qualcosa");
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page.getByText("Email non valida")).toBeVisible();
});
