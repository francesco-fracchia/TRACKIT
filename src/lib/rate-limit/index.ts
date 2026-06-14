/**
 * Rate limiting — astrazione con implementazione in-memory (fixed window).
 *
 * ATTENZIONE: l'implementazione in-memory è adatta solo a dev / singola
 * istanza. In produzione su Vercel (serverless multi-istanza) lo stato in
 * memoria non è condiviso: andrà sostituito con uno store distribuito
 * (Upstash Redis) dietro questa stessa interfaccia, dopo conferma. Vedi
 * DECISIONS. I call site NON cambieranno.
 */

export interface RateLimitOptions {
  /** Numero massimo di richieste nella finestra. */
  limit: number;
  /** Ampiezza della finestra in millisecondi. */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms in cui la finestra si resetta. */
  resetAt: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

/**
 * Registra un tentativo per `key` e indica se è entro il limite.
 * `key` tipicamente combina scopo + identità (es. `login:<ip>`).
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, limit: opts.limit, remaining: opts.limit - 1, resetAt };
  }

  bucket.count += 1;
  const remaining = Math.max(0, opts.limit - bucket.count);
  return {
    success: bucket.count <= opts.limit,
    limit: opts.limit,
    remaining,
    resetAt: bucket.resetAt,
  };
}

/** Azzera lo stato (utile nei test). */
export function resetRateLimitStore(): void {
  store.clear();
}
