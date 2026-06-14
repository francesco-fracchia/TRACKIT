# TRACKIT — Roadmap

> Una milestone alla volta. Ognuna: **compila, passa i test, lascia l'app usabile**. A fine milestone: riassunto di fatto/mancante + commit (conventional).
> Legenda: `[ ]` da fare · `[~]` in corso · `[x]` fatto.
> Stato globale: **in attesa di approvazione di ARCHITECTURE.md + ROADMAP.md. Nessun codice ancora.**

---

## M0 — Fondamenta ✅ (completata)
**Obiettivo:** scheletro sicuro e installabile su cui costruire. App che parte, ti registri, verifichi email, fai login con 2FA, dark mode, IT.

- [x] Scaffold Next.js **16** + TS strict + Tailwind v4 + shadcn/ui
- [x] Config Turso + Drizzle + prima migrazione (identità Better Auth + org/membri + `space_profile`, `audit_log`)
- [x] Better Auth: email/password (**argon2id**), verifica email, reset, **2FA TOTP**, plugin organization
- [x] DAL: `requireUser`, `requireSpaceMember(orgId, minRole)` + gerarchia ruoli testata (fail-closed)
- [x] `lib/money` (tipo Money, parse/format/arith IT) + **unit test**
- [x] `lib/crypto` AES-256-GCM + test; `lib/audit`; `lib/rate-limit` (astrazione + in-memory)
- [x] `proxy.ts` (ex middleware, Next 16): security headers (**CSP nonce**, HSTS, ecc.) + guard sessione (nel layout app)
- [x] i18n next-intl (IT) + dark mode + shell area autenticata
- [x] PWA: manifest + service worker base (installabile)
- [x] `.env.example` documentato
- [x] Setup Vitest (43 test) + Playwright (4 e2e) + CI (lint, typecheck, test, build, e2e)
- [x] `DECISIONS.md` avviato (D1–D13)

**Done:** registrazione→verifica email→login funziona (verificato a runtime); 2FA TOTP attivabile dalle impostazioni; cookie HttpOnly+SameSite=Lax; CSP nonce per-richiesta; CI configurata.
**Note/rinvii:** ruolo `viewer` + access-control granulare → M1; provider email reale → da confermare; QR per il 2FA (ora mostra la chiave testuale) → miglioria UI.

## M1 — Ledger core ✅ (completata)
- [x] CRUD **spazi** (personal/business/shared) + creazione con seed categorie
- [x] Gestione **membri**: invito, ruoli (owner/admin/member/viewer), cambio ruolo, rimozione (audit)
- [x] CRUD **conti** (`financial_account`) + soft-delete
- [x] **Transazioni** manuali: entrata/uscita/trasferimento, categorie, tag, note, **allegato (Vercel Blob)**
- [x] Lista transazioni: filtri (tipo/conto/date), ricerca, paginazione
- [x] **Saldi** calcolati (`balances.ts`) + unit test (7)
- [x] e2e: spazio→conto→transazione→saldo

**Done:** un utente crea spazi/conti/transazioni con saldi corretti; isolamento per spazio applicato dal DAL ad ogni query; ruoli applicati (viewer sola lettura); allegati su Blob (gated sul token).
**Note/rinvii:** accesso privato/firmato agli allegati → miglioria; modifica (edit) transazioni/conti → al bisogno; conversione multi-valuta nel totale → con i report di M2.

## M2 — Budget e report ✅ (completata)
- [x] **Budget** per categoria (mensile/annuale) + rollover (`budget.ts` + test)
- [x] **Dashboard**: cashflow per mese, spese per categoria, entrate vs uscite, saldo del mese (Recharts)
- [x] Export **CSV** (Excel IT) + **PDF** (@react-pdf/renderer) con audit
- [x] Grafici Recharts
- [x] Rate limiting endpoint auth (residuo M0 chiuso): Better Auth, storage DB

**Done:** budget con avanzamento/sforamento e rollover testato; dashboard con grafici; export CSV e PDF mensile. 61 unit + 5 e2e verdi.
**Note:** conversione multi-valuta nei totali ancora rinviata; scostamento mostrato come barre nella pagina Budget.

## M3 — Pianificazione e previsioni ✅ (completata)
- [x] **Ricorrenze** (`recurring_rule`, RRULE via `rrule`): auto-post o suggerimento
- [x] Pianificazione: lista ricorrenze + prossime scadenze (60 gg) + "Registra scadute"
- [x] **Proiezioni** saldi a 12 mesi + scenario what-if (`forecast.ts` + test)
- [x] Vista scadenze imminenti (lista cronologica)

**Done:** ricorrenze generano/suggeriscono transazioni (auto-post idempotente on-demand); proiezioni con what-if interattivo; espansione RRULE testata. 71 unit + 5 e2e verdi.
**Note:** auto-post on-demand (niente cron — Vercel Cron come aggiunta futura); vista calendario a griglia → eventuale miglioria (ora lista).

## M4 — Obiettivi e patrimonio netto ✅ (completata)
- [x] **Obiettivi** di risparmio (avanzamento, data target, conto collegato o importo manuale)
- [x] **Passività** + **patrimonio netto** corrente + **snapshot** + **grafico storico** (Recharts)

**Done:** obiettivi con barre di avanzamento (raggiunto/aggiornabile); patrimonio = conti − passività, snapshot salvabili e curva storica. 77 unit + 5 e2e verdi.
**Note:** snapshot salvati manualmente (un Vercel Cron potrebbe automatizzarli); patrimonio in valuta base.

## M5 — Spese condivise ✅ (completata)
- [x] Spese con **split** (equa / percentuale / importi) tra membri
- [x] **Saldi reciproci** + **compensazioni minime** (`split.ts` + test, stile Splitwise)
- [x] Storico **rimborsi** (`settlement`) + "Segna saldato" one-click
- [x] e2e: creazione spesa condivisa

**Done:** split senza perdita centesimi, saldi reciproci, compensazioni minime greedy, rimborsi. 85 unit + 5 e2e verdi.
**Note:** split tra utenti registrati membri dello spazio (partecipanti non-utente non previsti, come discusso).

## M6 — Import CSV ✅ (completata)
- [x] Upload CSV (papaparse) + **mappatura colonne salvabile per banca** (preset)
- [x] Anteprima + **deduplica** (hash data+importo+beneficiario)
- [x] **Categorizzazione** automatica (regole contains/regex) + suggerimenti in anteprima
- [x] **Reversibilità** import (batch + revert)

**Done:** wizard upload→mappa→anteprima→importa; duplicati e righe invalide saltati; regole di categorizzazione; revert per batch. 97 unit + 5 e2e verdi (e2e import completo).
**Note:** e2e ora gira su build di produzione (no cold-compile, stabile e veloce); righe grezze non persistite (vedi DECISIONS D26).

## M7 — Revisione mensile (l'"incontro")
- [ ] Flusso guidato di **chiusura mensile**: snapshot numeri, scostamenti budget, transazioni non categorizzate da sistemare, obiettivi aggiornati
- [ ] **Note** + **action item** (assegnabili negli spazi shared)
- [ ] Stato (in corso/chiusa) + **storico** revisioni

**Done quando:** l'utente apre/chiude una revisione e ne consulta lo storico.

## M8 — Open Banking *(bloccata — solo dopo tua conferma)*
- [ ] Scelta aggregatore (GoCardless/Nordigen, Tink, Salt Edge) — costi/PSD2
- [ ] `bank_connection` con token **cifrati**, mapping conti, sync
- [ ] Progettazione compliance separata

**Non iniziare** finché non lo confermi. Tutto il resto funziona senza.

---

## Qualità trasversale (ogni milestone)
- [ ] Unit test su money/budget/proiezioni/split + e2e sui flussi critici
- [ ] Accessibilità (focus, ARIA, contrasto), responsive mobile-first, stati loading/error
- [ ] Niente segreti hardcoded, niente `any` ingiustificato, niente float per i soldi
- [ ] Commit piccoli (conventional), test scritti man mano, `DECISIONS.md` aggiornato

## Punti in cui ti chiederò conferma
- **M1:** storage allegati (servizio esterno)
- **M2:** libreria PDF + libreria grafici
- **Prod:** rate-limit multi-istanza (Redis/Upstash)
- **M8:** aggregatore Open Banking (a pagamento + compliance)
- Inviti membri: plugin `organization` di Better Auth vs tabelle custom (decido a M0, ti aggiorno)
