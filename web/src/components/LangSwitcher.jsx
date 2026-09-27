import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n.js";

// variant="onDark" pour les en-têtes toujours sombres (hero client/accueil),
// variant="surface" (défaut) pour les en-têtes qui suivent le thème clair/sombre.
export default function LangSwitcher({ className = "", variant = "surface" }) {
  const { i18n, t } = useTranslation();
  const onDark = variant === "onDark";

  return (
    <div
      className={`inline-flex rounded-full p-1 text-sm ${
        onDark ? "bg-white/15" : "bg-sand-100 dark:bg-olive-800 shadow-sm"
      } ${className}`}
    >
      {["ar", "en"].map((lng) => (
        <button
          key={lng}
          onClick={() => setLanguage(lng)}
          className={`rounded-full px-3 py-1 transition ${
            i18n.language === lng
              ? "bg-olive-600 text-white"
              : onDark
                ? "text-white/80"
                : "text-olive-700 dark:text-sand-200"
          }`}
        >
          {t(`lang.${lng}`)}
        </button>
      ))}
    </div>
  );
}
