import { test, expect } from "@playwright/test";

/**
 * E2E del flusso critico M1: registrazione → creazione spazio → conto →
 * transazione. Gira con AUTH_REQUIRE_EMAIL_VERIFICATION=false (impostato dal
 * webServer Playwright) così la registrazione autentica subito.
 */
test("flusso completo: spazio → conto → transazione", async ({ page }) => {
  const email = `ledger-${Date.now()}@test.local`;

  // 1. Registrazione (in e2e autentica direttamente).
  await page.goto("/sign-up");
  await page.getByLabel("Nome").fill("Ledger Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password-ledger-123");
  await page.getByRole("button", { name: "Registrati" }).click();
  await expect(page.getByText("Controlla la tua email")).toBeVisible();

  // 2. Area autenticata: hub spazi.
  await page.goto("/spaces");
  await expect(
    page.getByRole("heading", { name: "I tuoi spazi" }),
  ).toBeVisible();

  // 3. Crea uno spazio → redirect alla dashboard dello spazio.
  await page.getByLabel("Nome dello spazio").fill("Spazio Test");
  await page.getByRole("button", { name: "Crea spazio" }).click();
  await expect(page).toHaveURL(/\/[^/]+\/dashboard$/);
  const spaceId = new URL(page.url()).pathname.split("/")[1]!;

  const spaceNav = page.getByRole("navigation", {
    name: "Sezioni dello spazio",
  });

  // 4. Crea un conto con saldo iniziale 100,00.
  await spaceNav.getByRole("link", { name: "Conti", exact: true }).click();
  await page.getByLabel("Nome del conto").fill("Contante");
  await page.getByLabel("Saldo iniziale").fill("100,00");
  await page.getByRole("button", { name: "Aggiungi conto" }).click();
  await expect(page.getByText("Contante")).toBeVisible();
  await expect(page.getByText("100,00")).toBeVisible();

  // 5. Registra un'uscita di 30,00.
  await spaceNav.getByRole("link", { name: "Transazioni", exact: true }).click();
  await page.getByLabel("Importo").fill("30,00");
  await page.getByRole("button", { name: "Aggiungi transazione" }).click();

  // La transazione compare nella tabella.
  await expect(page.locator("table")).toContainText("30,00");

  // 6. Il saldo del conto è ora 70,00 (100 − 30) nella dashboard.
  await page.goto(`/${spaceId}/dashboard`);
  await expect(page.getByText("70,00").first()).toBeVisible();

  // 7. Crea un budget mensile e verificalo.
  await page.goto(`/${spaceId}/budgets`);
  await page.getByLabel("Categoria").selectOption({ label: "Svago" });
  await page.getByLabel("Importo").fill("200,00");
  await page.getByRole("button", { name: "Salva budget" }).click();
  await expect(page.locator("li").filter({ hasText: "Svago" })).toBeVisible();

  // 8. Gli export rispondono correttamente.
  const csv = await page.request.get(`/${spaceId}/export/transactions.csv`);
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");

  const pdf = await page.request.get(`/${spaceId}/export/report.pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
});
