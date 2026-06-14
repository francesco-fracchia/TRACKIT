import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy di sicurezza (ex middleware — Next 16 ha rinominato la convenzione).
 * Genera un nonce per-richiesta e imposta una CSP stringente. Il nonce viene
 * iniettato negli header di *richiesta* così che Next.js lo applichi
 * automaticamente ai propri script inline (hydration); è anche esposto come
 * `x-nonce` per i componenti che ne hanno bisogno (es. lo script anti-flash
 * di next-themes).
 *
 * Runtime: nodejs (la convenzione `proxy` non supporta edge). `crypto` e
 * `btoa` sono comunque disponibili globalmente in Node.
 *
 * Nota i18n: con un'unica lingua (IT) e `localePrefix: "as-needed"` non serve
 * redirect di locale, quindi qui non c'è logica next-intl. Verrà reintrodotta
 * quando aggiungeremo una seconda lingua (vedi DECISIONS).
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))),
  );

  const isDev = process.env.NODE_ENV !== "production";

  // In dev, React Refresh richiede 'unsafe-eval'. In prod la script-src è
  // limitata a self + nonce (+ strict-dynamic per gli script caricati dai fidati).
  const scriptSrc = isDev
    ? `'self' 'unsafe-eval' 'nonce-${nonce}'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  const csp = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    // Gli stili usano 'unsafe-inline': i nonce sugli stili sono impraticabili
    // con Tailwind/Next; lo script-src resta la difesa principale anti-XSS.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Far leggere la CSP a Next sulla *richiesta* abilita l'iniezione automatica
  // del nonce sugli script generati dal framework.
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  // Applica a tutte le route tranne asset statici, immagini e file pubblici.
  matcher: [
    {
      source:
        "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|sw.js).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
