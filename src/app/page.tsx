import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">TRACKIT</span>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          {t("heading")}
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          {t("subheading")}
        </p>
        <Button size="lg">{t("getStarted")}</Button>
      </div>
    </main>
  );
}
