# TRACKIT — Decision Log

> Registro cronologico delle scelte tecniche e del *perché*. Append-only: non riscriviamo il passato, aggiungiamo. Formato ADR-lite.

---

## 2026-06-14 — Avvio

### D1 — Stack confermato dal committente
**Scelta:** Next.js (App Router) + TS strict, Turso (libSQL) + Drizzle, Better Auth, Zod, Tailwind + shadcn/ui, Vitest + Playwright, next-intl, soldi in centesimi.
**Perché:** requisiti espliciti del prodotto; stack coerente, type-safe end-to-end, adatto a multi-utente sicuro.

### D2 — Membership via plugin `organization` di Better Auth
**Scelta:** lo `space` è un'*organization* di Better Auth; membri/inviti gestiti dal plugin; i 4 ruoli `owner|admin|member|viewer` mappati sul suo sistema permessi. Campi di dominio (`type`, `base_currency`, `settings`) in una tabella `space_profile` 1:1 con `organizationId`.
**Perché:** riusa inviti, ruoli, membership testati invece di reimplementarli; il committente ha scelto questa opzione. **Rischio:** mapping ruoli da validare in pratica → fatto in M0.
**Alternative scartate:** tabelle `space_member` custom (più codice/test), ibrido.

### D3 — Deploy target: Vercel + Turso
**Scelta:** Vercel (Node runtime per route con crypto/argon2/Drizzle, non Edge) + Turso.
**Perché:** scelta del committente. **Conseguenza:** ambiente serverless multi-istanza → rate-limit in-memory non affidabile in prod; astrazione `lib/rate-limit` (in-memory in dev, Redis/Upstash in prod, conferma all'avvicinarsi del deploy).

### D4 — `financial_account` invece di `account`
**Scelta:** la tabella del conto finanziario si chiama `financial_account`.
**Perché:** Better Auth crea già `account` (credenziali/OAuth). Evita collisione di naming.

### D5 — Soldi: `number` intero in centesimi
**Scelta:** importi come `number` intero (minor units), tipo `Money { amount, currency }`, utility dedicate. Mai float.
**Perché:** evita errori di arrotondamento floating-point. `Number.MAX_SAFE_INTEGER` copre ~9e16 cent, ampiamente sufficiente; `bigint` solo se mai necessario.

### D6 — Saldi calcolati, non memorizzati
**Scelta:** il saldo di un conto è derivato dalle transazioni (servizio `balances.ts`), non una colonna persistita.
**Perché:** elimina la classe di bug "saldo disallineato". Cache/materializzazione solo se emergono problemi di performance, misurati.

### D7 — Password hashing: argon2id
**Scelta:** hashing password con **argon2id** via `@node-rs/argon2`, configurato come custom password hasher in Better Auth (il default sarebbe scrypt).
**Perché:** requisito di sicurezza esplicito. `@node-rs/argon2` ha binari precompilati (napi), niente toolchain di build.
