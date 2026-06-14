import type { MetadataRoute } from "next";

/** Web App Manifest (servito a /manifest.webmanifest). Rende TRACKIT installabile. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TRACKIT",
    short_name: "TRACKIT",
    description:
      "Tracciamento, pianificazione e gestione delle finanze personali e aziendali.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "it",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
