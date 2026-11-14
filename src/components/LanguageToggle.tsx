"use client";

import { LOCALES, setLocale, useLocale, useT } from "@/lib/i18n";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t.language.label} className={`flex rounded-full bg-surface p-1 shadow-card ${className}`}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          lang={l === "pt" ? "pt-BR" : "en"}
          title={t.language.names[l]}
          onClick={() => setLocale(l)}
          className={`rounded-full px-2.5 py-1.5 text-xs font-bold uppercase transition-colors duration-200 ${
            locale === l ? "bg-ink text-white" : "text-ink-2 hover:bg-sunken hover:text-ink"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
