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

## M2 — Budget e report
- [ ] **Budget** per categoria (mensile/annuale) + rollover (`budget.ts` + test)
- [ ] **Dashboard**: cashflow nel tempo, spese per categoria, entrate vs uscite, scostamento budget
- [ ] Export **CSV** + **PDF** (librerie → conferma)
- [ ] Grafici (recharts → conferma)

**Done quando:** budget tracciati con scostamenti reali e report esportabili.

## M3 — Pianificazione e previsioni
- [ ] **Ricorrenze** (`recurring_rule`, RRULE): auto-post o suggerimento
- [ ] Pianificazione mensile/annuale
- [ ] **Proiezioni** saldi/cashflow + scenari what-if (`forecast.ts` + test)
- [ ] Vista **calendario** scadenze

**Done quando:** ricorrenze generano/suggeriscono transazioni e le proiezioni sono testate.

## M4 — Obiettivi e patrimonio netto
- [ ] **Obiettivi** di risparmio (avanzamento, data target, conto collegato)
- [ ] **Passività** + **patrimonio netto** nel tempo (snapshot + grafico storico)

**Done quando:** obiettivi tracciati e curva patrimonio netto visibile.

## M5 — Spese condivise
- [ ] Spese con **split** (importo/percentuale) negli spazi shared
- [ ] **Saldi reciproci** + **compensazioni minime** (`split.ts` + test)
- [ ] Storico **rimborsi** (`settlement`)
- [ ] e2e: spesa condivisa + compensazione

**Done quando:** split corretti, debiti netti minimizzati, rimborsi registrati.

## M6 — Import CSV
- [ ] Upload CSV + **mappatura colonne salvabile per banca**
- [ ] Anteprima + **deduplica**
- [ ] **Categorizzazione** (regole automatiche + suggerimenti)
- [ ] **Reversibilità** import (revert batch)

**Done quando:** import affidabile, deduplicato, reversibile.

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
