# TRACKIT — Architettura

> Documento vivo. Le scelte qui descritte vanno lette insieme a `DECISIONS.md` (che ne traccia il _perché_ nel tempo) e `ROADMAP.md` (le milestone).
> Stato: **proposta iniziale, in attesa di revisione**. Nessun codice scritto finché non approvi.

---

## 1. Obiettivo e principi

TRACKIT è una web app multi-utente per tracciamento, pianificazione e gestione di finanze personali e aziendali. Principi guida che vincolano ogni scelta sotto:

1. **Sicurezza per default, non opzionale.** Ogni accesso ai dati passa da un punto unico che verifica identità + membership + ruolo. Nessuna fiducia nell'input del client.
2. **Soldi = interi in centesimi.** Mai `number` float per importi. Tipo dedicato + utility.
3. **Server-authoritative.** La logica di dominio (saldi, budget, split, proiezioni) vive lato server. Il client mostra, non decide.
4. **Milestone usabili.** Ogni milestone compila, ha test e lascia l'app funzionante.
5. **Italiano-first, multilingua-ready.** Niente stringhe hardcoded nelle view.

---

## 2. Stack (deciso)

| Area | Scelta | Note |
|---|---|---|
| Framework | **Next.js 15 (App Router)** + React 19 | Server Components + Server Actions come default; Route Handlers solo per webhook/health/export streaming |
| Linguaggio | **TypeScript strict** | `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| DB | **Turso (libSQL)** | SQLite distribuito; embedded replicas opzionali in futuro |
| ORM | **Drizzle ORM** + drizzle-kit | Migrazioni versionate in repo, query type-safe parametrizzate |
| Auth | **Better Auth** | email/password (argon2id), verifica email, reset, 2FA TOTP, plugin `organization` per gli spazi |
| Validazione | **Zod** | Schemi condivisi client/server in `src/lib/validation` |
| UI | **Tailwind CSS** + **shadcn/ui** (Radix) | Componenti headless accessibili, copiati nel repo (no lock-in) |
| i18n | **next-intl** | Routing localizzato, messaggi in `messages/it.json` |
| Test unit/integr. | **Vitest** | Focus su money, budget, split, proiezioni, data-access layer |
| Test e2e | **Playwright** | Flussi critici: auth, transazione, split |
| PWA | **@serwist/next** (o next-pwa) | Manifest + service worker; valutiamo in M0 |
| Stato client | Server state via RSC + **TanStack Query** dove serve mutazione ottimistica | Niente store globale pesante |
| Form | **react-hook-form** + `@hookform/resolvers/zod` | |

### Dipendenze "pesanti" che richiedono la tua conferma prima dell'uso
Le segnalo qui e in `DECISIONS.md` quando arriva il momento; **non le installo senza ok**:
- Generazione **PDF** (M2): `@react-pdf/renderer` _oppure_ render server-side headless. → decisione a M2.
- **Grafici** (M2): `recharts` (leggero, React) vs alternative. → proposta a M2, probabilmente recharts.
- **Open Banking** (M8): aggregatore a pagamento (GoCardless/Nordigen, Tink, Salt Edge). → **bloccato**, solo dopo conferma esplicita.
- Eventuale **rate-limit store** (Upstash Redis) se il deploy è multi-istanza. → vedi §8.

---

## 3. Struttura cartelle

```
trackit/
├─ src/
│  ├─ app/
│  │  ├─ [locale]/                  # routing localizzato next-intl
│  │  │  ├─ (marketing)/            # landing pubblica
│  │  │  ├─ (auth)/                 # login, register, verify, reset, 2fa
│  │  │  └─ (app)/                  # area autenticata
│  │  │     ├─ layout.tsx           # shell: sidebar, space switcher, theme
│  │  │     ├─ [spaceId]/           # tutto è scoperto da uno spazio
│  │  │     │  ├─ dashboard/
│  │  │     │  ├─ transactions/
│  │  │     │  ├─ accounts/
│  │  │     │  ├─ budgets/
│  │  │     │  ├─ goals/
│  │  │     │  ├─ shared/           # spese condivise (spazi shared)
│  │  │     │  ├─ reviews/          # revisione mensile
│  │  │     │  └─ settings/
│  │  ├─ api/                       # Route Handlers: auth/[...all], health, export
│  │  └─ globals.css
│  ├─ db/
│  │  ├─ schema/                    # uno o più file Drizzle (tabelle + relazioni)
│  │  ├─ index.ts                   # client libSQL/drizzle
│  │  └─ migrations/                # generate da drizzle-kit (in repo)
│  ├─ auth/
│  │  ├─ index.ts                   # config Better Auth (server)
│  │  └─ client.ts                  # client auth
│  ├─ server/
│  │  ├─ dal/                       # DATA ACCESS LAYER — unico punto d'accesso ai dati
│  │  │  ├─ context.ts              # requireUser(), requireSpaceMember(spaceId, minRole)
│  │  │  ├─ transactions.ts
│  │  │  ├─ accounts.ts
│  │  │  └─ ...                     # un modulo per aggregato
│  │  ├─ actions/                   # Server Actions (thin): validano (Zod) → chiamano DAL
│  │  └─ services/                  # logica di dominio pura e testabile (no I/O)
│  │     ├─ money.ts
│  │     ├─ balances.ts
│  │     ├─ budget.ts
│  │     ├─ split.ts
│  │     └─ forecast.ts
│  ├─ lib/
│  │  ├─ validation/                # schemi Zod condivisi
│  │  ├─ money/                     # tipo Money + parse/format/arith
│  │  ├─ crypto/                    # AES-256-GCM helpers (campi sensibili)
│  │  ├─ rate-limit/
│  │  ├─ audit/                     # writeAuditLog()
│  │  └─ utils/
│  ├─ components/
│  │  ├─ ui/                        # shadcn/ui
│  │  └─ ...                        # componenti di dominio
│  ├─ i18n/                         # config next-intl
│  └─ middleware.ts                 # security headers + locale + guard sessione
├─ messages/                        # it.json (e future lingue)
├─ tests/
│  ├─ unit/                         # vitest
│  └─ e2e/                          # playwright
├─ public/                          # icone PWA, manifest
├─ drizzle.config.ts
├─ .env.example
├─ ARCHITECTURE.md
├─ ROADMAP.md
└─ DECISIONS.md
```

**Regola architetturale chiave (layering):**
`Server Action / Route Handler` → valida con Zod → chiama **DAL** → il DAL fa `requireSpaceMember` e poi usa Drizzle → la logica pura sta in `services/` (nessun I/O, 100% testabile). Le UI non importano mai Drizzle né il DAL direttamente per le scritture: passano dalle Server Actions.

---

## 4. Modello dati

Tutte le tabelle hanno `id` (testo, ULID/UUIDv7 ordinabile), `created_at`, `updated_at`. Dove indicato, `deleted_at` per soft-delete. FK con indici. Importi: `integer` (centesimi). Valute: ISO 4217 (`TEXT`, 3 char). Date: salviamo timestamp UTC (`integer` epoch ms) + dove serve `date` civile (`TEXT` `YYYY-MM-DD`) per evitare ambiguità di timezone sui report mensili.

### Identità (Better Auth, M0)
- `user`, `session`, `account` (credenziali/OAuth Better Auth), `verification`, `two_factor` — schema gestito dai plugin Better Auth. **Nota naming:** la tabella `account` di Better Auth NON è il nostro conto finanziario. Il nostro lo chiamiamo **`financial_account`** per evitare collisioni.

### Spazi e membership (M0/M1)
- `space` — `id`, `name`, `type` (`personal|business|shared`), `base_currency`, `owner_id` → user, `settings` (JSON: campi extra business, flag 2FA-required), `created_at`, `deleted_at`.
- `space_member` — `space_id`, `user_id`, `role` (`owner|admin|member|viewer`), `created_at`. Unique(`space_id`,`user_id`). **Tabella cardine della sicurezza.**
- **Membership via plugin `organization` di Better Auth** (deciso). Lo `space` è modellato come *organization*; `space_member` e gli inviti sono gestiti dalle tabelle del plugin (`organization`, `member`, `invitation`). I nostri 4 ruoli (`owner|admin|member|viewer`) sono mappati sul sistema ruoli/permessi del plugin. Aggiungiamo i campi di dominio (`type`, `base_currency`, `settings`) tramite metadata dell'organization o una tabella `space_profile` 1:1 collegata all'`organizationId`. Il DAL legge la membership dalle tabelle del plugin.

### Ledger (M1)
- `financial_account` — `space_id`, `name`, `type` (`bank|cash|card|ewallet|other`), `currency`, `initial_balance` (cent), `archived_at`, `deleted_at`. Saldo corrente **calcolato** (vedi §6), non memorizzato come verità.
- `category` — `space_id` (nullable per default globali), `name`, `kind` (`income|expense`), `parent_id` (self-FK, sottocategorie), `icon`, `color`, `deleted_at`.
- `tag` — `space_id`, `name`. Unique(`space_id`,`name`).
- `transaction` — `space_id`, `account_id`, `type` (`income|expense|transfer`), `amount` (cent, sempre positivo; il segno è dato dal `type`), `currency`, `booked_at` (timestamp), `value_date` (`YYYY-MM-DD`), `category_id`, `payee`, `note`, `attachment_id`, `created_by`, `deleted_at`. **Transfer:** `counter_account_id`, `counter_amount` (cent, per multi-valuta), `fx_rate` (memorizzato). Indici: (`space_id`,`value_date`), (`account_id`,`value_date`).
- `transaction_tag` — join `transaction_id`↔`tag_id`.
- `attachment` — `space_id`, `storage_key`, `mime`, `size`, `uploaded_by`. Storage: vedi §9.

### Budget & report (M2)
- `budget` — `space_id`, `category_id`, `period_type` (`monthly|annual|custom`), `period_start`/`period_end`, `amount` (cent), `rollover` (bool). Indice (`space_id`,`category_id`,`period_start`).

### Pianificazione (M3)
- `recurring_rule` — `space_id`, template transazione (account, type, amount, category, payee, note), `rrule` (stringa RFC 5545), `next_run` (`YYYY-MM-DD`), `mode` (`auto_post|suggest`), `last_posted_at`, `active`.
- (le occorrenze auto-postate diventano normali `transaction` con `recurring_rule_id` di provenienza)

### Obiettivi & patrimonio (M4)
- `goal` — `space_id`, `name`, `target_amount` (cent), `current_amount` (cent, o derivato da `linked_account_id`), `target_date`, `linked_account_id`, `achieved_at`.
- `liability` — `space_id`, `name`, `balance` (cent), `as_of` (`YYYY-MM-DD`) → per patrimonio netto = conti − passività.
- `net_worth_snapshot` — `space_id`, `date`, `assets` (cent), `liabilities` (cent). Storico per il grafico.

### Spese condivise (M5)
- `shared_expense` — `space_id`, `transaction_id` (opz.), `description`, `total_amount` (cent), `paid_by` (user), `date`.
- `expense_split` — `shared_expense_id`, `user_id`, `share_kind` (`amount|percent`), `share_value`, `computed_amount` (cent). I saldi reciproci e le compensazioni minime sono **calcolati** dal servizio `split.ts` (non memorizzati).
- `settlement` — `space_id`, `from_user`, `to_user`, `amount` (cent), `date`, `note` — storico rimborsi.

### Import (M6)
- `import_batch` — `space_id`, `source` (`csv|bank`), `status` (`pending|previewed|committed|reverted`), `column_mapping` (JSON), `file_ref`, `created_by`.
- `import_row` — `import_batch_id`, raw data (JSON), `dedup_hash`, `transaction_id` (se importata), `status`.
- `import_mapping_preset` — `space_id`, `bank_name`, `column_mapping` (JSON) — mappatura salvabile per banca.
- `category_rule` — `space_id`, condizione (payee match / regex), `category_id` — categorizzazione automatica.

### Revisione mensile (M7)
- `monthly_review` — `space_id`, `period` (`YYYY-MM`), `status` (`open|closed`), `snapshot` (JSON: numeri congelati del mese), `notes`, `created_by`, `closed_at`.
- `review_action_item` — `monthly_review_id`, `text`, `done`, `assignee` (user, per spazi shared).

### Open Banking (M8 — bloccato)
- `bank_connection` — `space_id`, `aggregator`, `institution_id`, `access_token` **cifrato (AES-256-GCM)**, `status`, `account_mapping` (JSON).

### Audit (M0)
- `audit_log` — `space_id` (nullable per eventi globali), `actor_user_id`, `action` (enum string), `entity_type`, `entity_id`, `metadata` (JSON), `ip`, `user_agent`, `created_at`. **Append-only** (nessun update/delete dall'app).

---

## 5. Sicurezza

### 5.1 Data Access Layer (cuore dell'isolamento)
Nessuna query di dominio gira senza passare da `server/dal/context.ts`:

```ts
// pseudo-firma
requireUser(): Promise<{ user, session }>            // 401 se assente
requireSpaceMember(spaceId, minRole): Promise<Ctx>   // 401/403; verifica space_member
```

- `requireSpaceMember` legge `space_member` **lato server** a ogni richiesta — uno `spaceId` dal client è solo una _claim_ da verificare, mai una fonte di verità.
- Gerarchia ruoli: `owner > admin > member > viewer`. `minRole` confronta sulla gerarchia.
- Tutte le query del DAL filtrano **sempre** per `space_id` derivato dal contesto verificato (non dall'input grezzo).
- Le `transaction`/entità referenziate (es. `account_id`) sono ri-verificate appartenere allo stesso spazio prima di scrivere (no IDOR cross-space).

### 5.2 Autenticazione (Better Auth)
- Password: **argon2id** (default Better Auth), policy di lunghezza minima via Zod.
- **Verifica email obbligatoria** prima di operazioni di scrittura sensibili.
- **Reset password** con token monouso a scadenza.
- **2FA TOTP** opzionale per utente; **attivabile come obbligatorio** a livello di spazio (flag in `space.settings`): se lo spazio lo richiede, l'accesso alle sue risorse esige una sessione con 2FA soddisfatto.
- Sessioni: cookie `httpOnly`, `Secure`, `SameSite=Lax` (Strict per endpoint sensibili), rotazione su login, scadenza assoluta + idle, revoca lato server.

### 5.3 Validazione & SQL
- **Zod su ogni** Server Action / Route Handler (input parse, mai trust). Schemi in `lib/validation`, riusati nei form client.
- Solo query Drizzle parametrizzate. Nessuna concatenazione SQL. `eslint` regola contro `sql.raw` con interpolazione.

### 5.4 Cifratura at-rest
- `lib/crypto`: AES-256-GCM (IV random per record, authTag salvato). Chiave da `ENCRYPTION_KEY` (32 byte base64) in env/secret manager. Usata per campi sensibili (token bancari M8, eventuali secret di connessione). Funzioni `encryptField`/`decryptField` + supporto rotazione chiave (key id prefissato).

### 5.5 Rate limiting
- Endpoint auth (login, register, reset, 2fa, invio email) e import: limiti per IP + per identità.
- Implementazione: in-memory token bucket per dev/single-instance; **se** deploy multi-istanza → store condiviso (Upstash Redis) — richiede tua conferma (servizio terzo). Astrazione `lib/rate-limit` per non vincolarci.

### 5.6 Security headers & CSRF
- `middleware.ts`: CSP (nonce-based per gli script), HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Server Actions: Next valida l'origin per default; aggiungiamo controllo origin esplicito su Route Handler mutanti. SameSite sui cookie come difesa CSRF primaria.

### 5.7 Audit log
- `lib/audit/writeAuditLog()` chiamato dalle Server Actions per: login/logout, cambi ruolo/membership, cancellazioni, export, import commit/revert, modifiche 2FA, creazione/cancellazione spazi. Cattura `actor`, `entity`, `metadata`, `ip`, `ua`, `timestamp`. Append-only.

### 5.8 Gestione segreti
- Solo env. `.env.example` documenta ogni variabile (senza valori). Niente segreti nel repo; `.gitignore` copre `.env*` tranne `.env.example`.

---

## 6. Logica di dominio (servizi puri, testabili)

- **`money.ts`** — tipo `Money` (cent: number intero + currency), `parse("1.234,56")`→cent (locale IT), `format(cent, currency, locale)`, `add/sub/mulRate/allocate` (allocate distribuisce resti senza perdere centesimi). Niente float.
- **`balances.ts`** — saldo conto = `initial_balance` + Σ(entrate) − Σ(uscite) ± transfer; saldo spazio aggregato in valuta base (conversione con fx salvato sulla transazione, fallback a tasso configurato). Calcolato on-demand con query aggregate; eventuale cache/materializzazione valutata se servono performance.
- **`budget.ts`** — speso vs budget per categoria/periodo, rollover (residuo del periodo precedente si somma).
- **`split.ts`** — da `expense_split` calcola saldi reciproci e **compensazioni minime** (greedy debiti/crediti, stile Splitwise).
- **`forecast.ts`** — proiezione saldi/cashflow futuri da `recurring_rule` (espansione RRULE) + medie storiche + scenari what-if.

Questi moduli non toccano DB/rete: ricevono dati, restituiscono risultati → coperti da unit test fin dalla milestone in cui nascono.

---

## 7. i18n
- `next-intl`, default `it`, routing `/[locale]/...`. Messaggi in `messages/it.json`. Formattazione numeri/valute/date via `Intl` con locale. Struttura pronta per `en` ecc. senza toccare i componenti.

## 8. Deploy & runtime (deciso: Vercel + Turso)
- Target: **Vercel + Turso**. Useremo **Node runtime** per le route che usano crypto/argon2/Drizzle (non Edge). Essendo serverless multi-istanza, il rate-limit in-memory NON è affidabile in prod → previsto store condiviso (Upstash Redis) dietro l'astrazione `lib/rate-limit`; in dev resta in-memory. La conferma sull'attivazione di Redis la chiederò quando avvicineremo il deploy.
- CI: GitHub Actions — lint, typecheck, vitest, build, playwright (su PR).

## 9. Allegati / file storage (da decidere a M1)
- Opzioni: (a) Turso/DB non adatto a blob grandi; (b) storage oggetti (Vercel Blob, S3/R2). Probabile **R2/S3-compatible** o Vercel Blob. È un servizio esterno → **chiederò conferma a M1** prima di scegliere. Fino ad allora l'allegato è opzionale e l'app funziona senza.

## 10. Testing strategy
- **Unit (Vitest):** money, balances, budget, split, forecast, DAL guard (membership/ruolo), crypto.
- **Integration:** Server Actions con DB libSQL in-memory/file temporaneo.
- **E2E (Playwright):** registrazione+verifica+login+2FA; creazione spazio→conto→transazione; spesa condivisa con split e compensazione.
- Cobertura prioritaria sulla logica monetaria e sull'isolamento dati.

## 11. Rischi noti & questioni aperte (per la revisione)
1. **Storage allegati**: servizio esterno — quale? (decido a M1, ti chiedo).
2. **PDF & grafici** (M2): librerie da confermare.
3. **Rate-limit multi-istanza**: serve Redis? Dipende dal deploy (Vercel scala) → probabile sì in prod.
4. ~~Inviti membri~~ **DECISO**: plugin `organization` di Better Auth come backend di membership/inviti, con i 4 ruoli mappati. Da validare in pratica in M0 il mapping ruoli/permessi.
5. **Multi-valuta & fx**: da dove prendiamo i tassi storici? Per ora `fx_rate` inserito manualmente/salvato sulla transazione; eventuale provider tassi è un'aggiunta futura (servizio esterno → conferma).
6. **Money come `number`**: i centesimi stanno in sicurezza entro `Number.MAX_SAFE_INTEGER` (~90.000 miliardi €). Sufficiente. Se mai servisse oltre, `bigint`. Per ora `number` intero.
