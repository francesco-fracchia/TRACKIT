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
**Perché:** requisito di sicurezza esplicito. `@node-rs/argon2` ha binari precompilati (napi), niente toolchain di build. NB: argon2id è già il *default* della libreria, quindi non passiamo opzioni esplicite (evita anche un problema con `isolatedModules` + const enum `Algorithm`).

### D8 — Stack risolto a versioni recenti
**Scelta:** Next **16** (non 15), React 19.2, TypeScript **6**, Tailwind **v4**, Zod **4**, ESLint **9**.
**Perché:** `npm install latest` ha risolto a queste major. Conseguenze gestite: Next 16 ha rinominato `middleware.ts` → **`proxy.ts`** (runtime nodejs, no edge) e rimosso `next lint` (uso `eslint .`).

### D9 — i18n senza prefisso URL (per ora)
**Scelta:** next-intl configurato *senza* segmento `[locale]` e senza middleware di locale, finché c'è una sola lingua (IT).
**Perché:** evita di accoppiare il proxy di sicurezza (CSP nonce) con la logica di routing locale. Quando aggiungeremo una seconda lingua passeremo a `[locale]` + middleware composto.

### D10 — `env.ts` senza `server-only`
**Scelta:** il modulo di validazione env (e il client `db`) NON usano il marker `server-only`.
**Perché:** sono importati anche da script Node (migrazioni, CLI Better Auth) dove `server-only` lancerebbe. La protezione anti-leak resta: non vengono importati da Client Component. I moduli puramente server (DAL `context`, `audit`) invece usano `server-only`.

### D11 — Provider email differito
**Scelta:** in M0 `sendEmail` logga in console; nessun provider reale.
**Perché:** un provider SMTP/transactional è un servizio terzo → richiede conferma esplicita. La firma di `sendEmail` è il punto di estensione, il resto non cambierà.

### D12 — ESLint flat config senza FlatCompat
**Scelta:** flat config basata su `typescript-eslint` + `@next/eslint-plugin-next` diretti, non `FlatCompat(next/core-web-vitals)`.
**Perché:** FlatCompat con eslint-config-next su ESLint 9 crashava ("circular structure"). La config diretta è più robusta. Regola custom: vietato `sql.raw()`.

### D13 — Ruolo `viewer` e access-control granulare differiti a M1
**Scelta:** in M0 il plugin organization usa i ruoli nativi (owner/admin/member); il ruolo `viewer` e l'access-control fine verranno configurati in M1 con la UI di gestione membri. La gerarchia dei 4 ruoli è però già implementata e testata nel DAL (`roles.ts`).
**Perché:** M0 non ha ancora UI membri; meglio configurare l'AC quando serve davvero, evitando astrazioni premature.

## 2026-06-14 — M1

### D14 — Allegati su Vercel Blob (confermato)
**Scelta:** gli allegati delle transazioni usano **Vercel Blob** (`@vercel/blob`).
**Perché:** scelta del committente. **Gating:** l'upload è abilitato solo se `BLOB_READ_WRITE_TOKEN` è presente; in locale senza token l'app funziona, semplicemente non permette upload. Servizio a consumo.

### D15 — Categorie per-spazio (non globali) con seed
**Scelta:** `category.organizationId` NOT NULL; alla creazione di uno spazio vengono seminate categorie di default (italiane). Niente categorie globali condivise.
**Perché:** isolamento più semplice e pulito (ogni spazio possiede e può modificare le proprie categorie) senza righe "globali" speciali da gestire nelle query.

### D16 — Importi con segno implicito dal `type`
**Scelta:** `transaction.amount` è sempre positivo (intero, centesimi); il segno/effetto sul saldo è dato dal `type` (income +, expense −, transfer sposta da `accountId` a `counterAccountId`).
**Perché:** evita ambiguità e doppia codifica del segno; i calcoli di saldo sono espliciti in `balances.ts`.

### D17 — Spazio identificato in URL (`/[spaceId]/...`)
**Scelta:** le route dell'area dati vivono sotto `/(app)/[spaceId]/...`; ogni pagina/azione verifica la membership con `requireSpaceMember(spaceId)`. L'`activeOrganizationId` di Better Auth non è la fonte di verità.
**Perché:** URL espliciti e condivisibili; isolamento garantito dal DAL ad ogni richiesta.

### D18 — Allegati: upload server action + Blob `public` con URL non indovinabile
**Scelta:** upload via server action (`uploadAttachmentAction`) che valida tipo (PNG/JPEG/WEBP/PDF) e dimensione (max 5MB), salva su Vercel Blob con `access: "public"` e chiave random per-spazio. L'`attachmentId` viene poi collegato alla transazione (verifica appartenenza allo spazio).
**Perché:** semplice e robusto. **Limite noto:** l'URL Blob è pubblico ma non indovinabile; per ricevute sensibili un accesso firmato/privato è un miglioramento futuro (Blob private access). L'upload è disabilitato se manca `BLOB_READ_WRITE_TOKEN` (l'app resta usabile).

## 2026-06-14 — M2

### D19 — Rate limiting: Better Auth integrato, storage DB
**Scelta:** usato il rate limiting integrato di Better Auth (non la `lib/rate-limit` custom) per gli endpoint auth, con `storage: "database"`.
**Perché:** copre tutti gli endpoint del catch-all `/api/auth/*` con regole per-path; lo storage DB è condiviso tra istanze serverless (Vercel) → niente Redis. `lib/rate-limit` resta per endpoint custom (es. import M6).

### D20 — Grafici con Recharts; PDF con @react-pdf/renderer
**Scelta:** **Recharts** per i grafici della dashboard; **@react-pdf/renderer** per i report PDF (oltre all'export CSV).
**Perché:** scelte del committente. Recharts: componibile, leggero, React-native. @react-pdf/renderer: genera PDF server-side senza browser headless (no servizi esterni).

### D21 — Budget come target ricorrente per categoria
**Scelta:** un budget è (categoria, periodType `monthly|annual`, importo, rollover). Si applica ad ogni periodo del tipo scelto; lo "speso" è calcolato per il periodo selezionato. Il rollover porta l'inutilizzato al periodo successivo.
**Perché:** modello semplice e familiare (cap per categoria) che copre mensile/annuale senza una riga per ogni singolo mese. La logica è pura e testata in `budget.ts`.

## 2026-06-14 — M3

### D22 — Ricorrenze con `rrule` (RFC 5545)
**Scelta:** la libreria `rrule` per definire ed espandere le ricorrenze. Wrapper in `lib/recurrence.ts` (build della stringa rule + espansione in un intervallo, in UTC).
**Perché:** scelta del committente; standard RFC 5545 robusto, evita bug di calcolo date fatti a mano.

### D23 — Auto-post ricorrenze on-demand (niente cron in M3)
**Scelta:** le ricorrenze in modalità `auto_post` generano transazioni quando l'utente apre la pianificazione / preme "Registra scadute" (azione manuale). Niente job schedulato in M3.
**Perché:** Vercel serverless non ha un processo persistente; un cron (Vercel Cron / route protetta) è un'aggiunta successiva. Per ora il posting avviene al caricamento della pagina pianificazione (idempotente: avanza `lastRunAt`).

### D24 — Proiezioni: forecast puro deterministico
**Scelta:** `forecast.ts` proietta i saldi futuri partendo dal saldo attuale + movimenti pianificati (ricorrenze espanse) + un delta mensile "what-if" opzionale. Funzioni pure e testate.
**Perché:** logica critica isolata dall'I/O; gli scenari what-if sono semplici aggiustamenti deterministici, non previsioni statistiche (quelle eventualmente dopo).

## 2026-06-14 — M6

### D25 — Parsing CSV con `papaparse`
**Scelta:** `papaparse` per il parsing dei CSV bancari (lato server, nelle server action).
**Perché:** scelta del committente; robusto su delimitatori/virgolette/encoding reali.

### D26 — Import reversibile via `import_batch` + `transaction.importBatchId`
**Scelta:** l'import crea un `import_batch` e collega le transazioni con `transaction.import_batch_id`. Il revert cancella (soft-delete) le transazioni del batch e marca il batch `reverted`. NON persistiamo le righe grezze (`import_row`) come nello schema iniziale: il batch + il link sulle transazioni bastano per anteprima→commit→revert.
**Perché:** flusso reversibile completo con meno tabelle/complessità. Le righe grezze si possono aggiungere se servirà rivedere un import non committato.

### D27 — Deduplica per hash (data+importo+beneficiario)
**Scelta:** ogni riga importata ha un `dedup_hash` = hash di (valueDate, amount, payee normalizzato). In anteprima si segnalano i duplicati rispetto alle transazioni esistenti e all'interno del batch; al commit i duplicati esatti vengono saltati.
**Perché:** evita doppi inserimenti reimportando lo stesso estratto. Deterministico e testabile.

## 2026-06-14 — Deploy & email

### D28 — Email via SMTP (nodemailer), provider-agnostico
**Scelta:** `sendEmail` invia tramite SMTP con `nodemailer` quando sono presenti `SMTP_HOST/PORT/USER/PASSWORD`; altrimenti logga in console (dev). Nessun SDK proprietario.
**Perché:** il committente vuole una soluzione gratuita e non vincolante. SMTP funziona con qualunque provider free (Brevo 300/giorno senza dominio, Gmail, Resend SMTP, …) cambiando solo le env. Firebase scartato: non è un servizio SMTP. `nodemailer` in `serverExternalPackages` (node-only). Modulo senza `server-only` perché caricato anche dalla CLI `auth:generate` (vedi D10).

### D29 — Verifica email disattivata di default (scelta committente)
**Scelta:** `AUTH_REQUIRE_EMAIL_VERIFICATION` ora default **false**: registrazione e accesso sono immediati (nessuna mail di verifica). Riattivabile con env `="true"`. La pagina di sign-up, se la registrazione autentica subito (token presente), reindirizza a `/spaces` invece di mostrare "controlla la tua email".
**Perché:** richiesta esplicita del committente per semplificare l'onboarding (D7/M0 prevedeva la verifica obbligatoria — questa decisione la supera consapevolmente). **Trade-off di sicurezza:** senza verifica chiunque può registrarsi con un'email non sua; resta consigliato riattivarla in produzione una volta configurato un SMTP. Reset password e inviti continuano a usare l'email quando l'SMTP è presente.

### D30 — Eliminazione spazio: hard delete, owner-only, cancellazione esplicita
**Scelta:** `/[spaceId]/settings` → "Zona pericolosa" con eliminazione definitiva, abilitata solo digitando il nome esatto dello spazio; il DAL `deleteSpace` richiede ruolo **owner** e cancella esplicitamente, in una transaction, tutte le tabelle dello spazio (incluse le figlie senza organizationId: transaction_tag, expense_split, review_action_item), poi member/invitation/organization. Gli audit log NON vengono cancellati.
**Perché:** richiesta del committente. Cancellazione esplicita (non solo `onDelete: cascade`) perché su Turso l'enforcement delle foreign key non è garantito a runtime → evita dati orfani. Conferma forte (type-to-confirm) per un'azione irreversibile.

### D31 — Movimenti "solo storico" (excludeFromBalance)
**Scelta:** flag `transaction.exclude_from_balance` (default false). Se true, la transazione è inclusa in report/grafici (cashflow, spese per categoria, budget) ma **esclusa dal calcolo del saldo** (filtrata in `listAccounts`). Checkbox nel form transazione + badge "storico" in lista.
**Perché:** richiesta del committente per inserire storico di mesi passati senza alterare il saldo attuale (anche storico parziale). Trade-off accettato: in quei periodi "entrate − uscite" non concilia con la variazione di saldo (dati informativi). Alternativa "coerente" (saldo iniziale storico + storico completo) non scelta.

### D32 — Sezione "Fatturato" per gli spazi business
**Scelta:** gli spazi di tipo `business` hanno una sezione **Fatturato** (`/[spaceId]/revenue`): totale storico, totale per anno selezionabile, media mensile e ripartizione per mese (grafico + tabella). Il tab compare nella nav solo se `space.type === "business"`. Il fatturato = somma delle **entrate** (`type=income`), incluse quelle "solo storico" (sono comunque fatturato).
**Perché:** richiesta del committente; un'attività ha bisogno di un quadro sugli incassi distinto dal saldo. Nessuna nuova tabella: riusa le transazioni e l'analytics esistente. **Possibile estensione:** distinzione imponibile/IVA, fatturato per categoria/cliente.
