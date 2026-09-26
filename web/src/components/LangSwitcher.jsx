import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n.js";

export default function LangSwitcher({ className = "" }) {
  const { i18n, t } = useTranslation();

  return (
    <div className={`inline-flex rounded-full bg-white/70 p-1 text-sm shadow-sm ${className}`}>
      {["ar", "en"].map((lng) => (
        <button
          key={lng}
          onClick={() => setLanguage(lng)}
          className={`rounded-full px-3 py-1 transition ${
            i18n.language === lng ? "bg-olive-600 text-white" : "text-olive-700"
          }`}
        >
          {t(`lang.${lng}`)}
        </button>
      ))}
    </div>
  );
}
