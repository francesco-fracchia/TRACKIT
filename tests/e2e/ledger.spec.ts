import { test, expect } from "@playwright/test";

/**
 * E2E del flusso critico M1: registrazione → creazione spazio → conto →
 * transazione. Gira con AUTH_REQUIRE_EMAIL_VERIFICATION=false (impostato dal
 * webServer Playwright) così la registrazione autentica subito.
 */
test("flusso completo: spazio → conto → transazione", async ({ page }) => {
  const email = `ledger-${Date.now()}@test.local`;

  // 1. Registrazione: senza verifica email autentica subito e porta agli spazi.
  await page.goto("/sign-up");
  await page.getByLabel("Nome").fill("Ledger Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password-ledger-123");
  await page.getByRole("button", { name: "Registrati" }).click();

  // 2. Area autenticata: hub spazi.
  await expect(page).toHaveURL(/\/spaces/);
  await expect(
    page.getByRole("heading", { name: "I tuoi spazi" }),
  ).toBeVisible();

  // 3. Crea uno spazio business → redirect alla dashboard dello spazio.
  await page.getByLabel("Nome dello spazio").fill("Spazio Test");
  await page.getByLabel("Tipo").selectOption("business");
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

  // 5b. Movimento "solo storico": NON deve incidere sul saldo.
  await page.getByLabel("Importo").fill("999,00");
  await page.getByRole("checkbox", { name: /Solo storico/ }).check();
  await page.getByRole("button", { name: "Aggiungi transazione" }).click();
  await expect(page.locator("table")).toContainText("999,00");
  await expect(page.locator("table")).toContainText("storico");

  // 6. Il saldo del conto è ancora 70,00 (100 − 30): il movimento storico è escluso.
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

  // 9. Crea una ricorrenza e verificala.
  await spaceNav.getByRole("link", { name: "Pianificazione", exact: true }).click();
  await page.getByLabel("Beneficiario").fill("Affitto");
  await page.getByLabel("Importo").fill("500,00");
  await page.getByRole("button", { name: "Aggiungi ricorrenza" }).click();
  await expect(
    page.locator("li").filter({ hasText: "Affitto" }).first(),
  ).toBeVisible();

  // 10. La pagina proiezioni si carica.
  await spaceNav.getByRole("link", { name: "Proiezioni", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Proiezioni" }),
  ).toBeVisible();

  // 11. Crea un obiettivo di risparmio e verificalo.
  await spaceNav.getByRole("link", { name: "Obiettivi", exact: true }).click();
  await page.getByLabel("Nome obiettivo").fill("Fondo emergenza");
  await page.getByLabel("Obiettivo", { exact: true }).fill("1000,00");
  await page.getByLabel("Importo già accumulato").fill("100,00");
  await page.getByRole("button", { name: "Crea obiettivo" }).click();
  await expect(
    page.locator("li").filter({ hasText: "Fondo emergenza" }).first(),
  ).toBeVisible();

  // 12. Patrimonio netto: salva uno snapshot.
  await spaceNav.getByRole("link", { name: "Patrimonio", exact: true }).click();
  await page.getByRole("button", { name: "Salva snapshot di oggi" }).click();
  await expect(page.getByText("Snapshot salvato")).toBeVisible();

  // 13. Spesa condivisa (divisione equa, singolo membro).
  await spaceNav.getByRole("link", { name: "Condivise", exact: true }).click();
  await page.getByLabel("Descrizione").fill("Cena di gruppo");
  await page.getByLabel("Totale").fill("40,00");
  await page.getByRole("button", { name: "Aggiungi spesa" }).click();
  await expect(
    page.locator("li").filter({ hasText: "Cena di gruppo" }).first(),
  ).toBeVisible();

  // 14. Import CSV: upload → mappatura → anteprima → import.
  await spaceNav.getByRole("link", { name: "Import", exact: true }).click();
  const csvContent =
    "Data;Importo;Descrizione\n10/03/2026;-25,50;Supermercato\n12/03/2026;1500,00;Stipendio\n";
  await page.setInputFiles("#csv-file", {
    name: "estratto.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csvContent),
  });
  await page.getByLabel("Colonna data").selectOption("Data");
  await page.getByLabel("Colonna importo").selectOption("Importo");
  await page.getByLabel("Colonna descrizione").selectOption("Descrizione");
  await page.getByRole("button", { name: "Anteprima" }).click();
  await expect(page.getByText("2 righe", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /Importa 2/ }).click();
  await expect(page.getByText("Importate 2 transazioni")).toBeVisible();

  // 15. Revisione mensile: apri, aggiungi un proposito, chiudi.
  await spaceNav.getByRole("link", { name: "Revisioni", exact: true }).click();
  await page.getByRole("button", { name: "Apri la revisione" }).click();
  await expect(
    page.getByText("Propositi per il mese prossimo"),
  ).toBeVisible();
  await page.getByPlaceholder("Nuovo proposito / azione…").fill("Rivedere abbonamenti");
  await page.getByRole("button", { name: "Aggiungi" }).click();
  await expect(page.getByText("Rivedere abbonamenti")).toBeVisible();
  await page.getByRole("button", { name: "Chiudi revisione" }).click();
  await expect(
    page.getByRole("button", { name: "Riapri revisione" }),
  ).toBeVisible();

  // 15b. Fatturato (spazio business): registra un'entrata e verifica la sezione.
  await spaceNav.getByRole("link", { name: "Transazioni", exact: true }).click();
  await page.locator("#tx-type").selectOption("income");
  await page.getByLabel("Importo").fill("200,00");
  await page.getByRole("button", { name: "Aggiungi transazione" }).click();
  await expect(page.locator("table")).toContainText("200,00");

  await spaceNav.getByRole("link", { name: "Fatturato", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Fatturato", exact: true }),
  ).toBeVisible();
  await expect(page.locator("table")).toContainText("200,00");

  // 16. Elimina lo spazio (conferma col nome) → torna alla lista, niente spazio.
  await page.goto(`/${spaceId}/settings`);
  await page
    .getByLabel(/digita il nome dello spazio/i)
    .fill("Spazio Test");
  await page.getByRole("button", { name: "Elimina definitivamente" }).click();
  await expect(page).toHaveURL(/\/spaces$/);
  await expect(page.getByText("Spazio Test")).toHaveCount(0);
});
