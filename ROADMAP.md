# TRACKIT — Roadmap

> Una milestone alla volta. Ognuna: **compila, passa i test, lascia l'app usabile**. A fine milestone: riassunto di fatto/mancante + commit (conventional).
> Legenda: `[ ]` da fare · `[~]` in corso · `[x]` fatto.
> Stato globale: **in attesa di approvazione di ARCHITECTURE.md + ROADMAP.md. Nessun codice ancora.**

---

## M0 — Fondamenta
**Obiettivo:** scheletro sicuro e installabile su cui costruire. App che parte, ti registri, verifichi email, fai login con 2FA, dark mode, IT.

- [ ] Scaffold Next.js 15 + TS strict + Tailwind + shadcn/ui
- [ ] Config Turso + Drizzle + prima migrazione (tabelle identità + `space`, `space_member`, `audit_log`)
- [ ] Better Auth: email/password (argon2id), verifica email, reset, **2FA TOTP**
- [ ] DAL: `requireUser`, `requireSpaceMember(spaceId, minRole)` + test
- [ ] `lib/money` (tipo Money, parse/format/arith IT) + **unit test**
- [ ] `lib/crypto` AES-256-GCM + test; `lib/audit`; `lib/rate-limit` (astrazione + in-memory)
- [ ] `middleware.ts`: security headers (CSP nonce, HSTS, ecc.) + locale + guard sessione
- [ ] i18n next-intl (IT) + dark mode + shell app (sidebar, space switcher placeholder)
- [ ] PWA: manifest + service worker base
- [ ] `.env.example` documentato
- [ ] Setup Vitest + Playwright + CI (lint, typecheck, test, build)
- [ ] `DECISIONS.md` avviato

**Done quando:** registrazione→verifica→login→2FA funziona e2e; headers attivi; CI verde.

## M1 — Ledger core
- [ ] CRUD **spazi** (personal/business/shared) + impostazioni; campi extra business
- [ ] Gestione **membri**: invito, ruoli (owner/admin/member/viewer), rimozione (audit)
- [ ] CRUD **conti** (`financial_account`)
- [ ] **Transazioni** manuali: entrata/uscita/trasferimento, categorie, tag, note, allegato (storage da confermare)
- [ ] Lista transazioni: filtri, ricerca, paginazione
- [ ] **Saldi** calcolati (`balances.ts`) + unit test
- [ ] e2e: spazio→conto→transazione

**Done quando:** un utente gestisce spazi/conti/transazioni con saldi corretti e isolamento per spazio verificato.

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
