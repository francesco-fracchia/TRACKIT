"use client";

import { useEffect } from "react";

/** Registra il service worker (solo in produzione, per non disturbare l'HMR). */
export function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registrazione SW fallita: l'app funziona comunque (degrado morbido).
      });
    }
  }, []);

  return null;
}
