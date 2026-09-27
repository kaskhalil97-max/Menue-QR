import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getTheme, toggleTheme } from "../theme.js";

// variant="onDark" pour les en-têtes toujours sombres (hero client/accueil),
// variant="surface" (défaut) pour les en-têtes qui suivent le thème clair/sombre.
export default function ThemeToggle({ className = "", variant = "surface" }) {
  const [theme, setThemeState] = useState(getTheme);
  const onDark = variant === "onDark";

  function handleClick() {
    setThemeState(toggleTheme());
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Toggle theme"
      className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
        onDark ? "bg-white/15 text-white/80" : "bg-sand-100 text-olive-700 dark:bg-olive-800 dark:text-sand-200"
      } ${className}`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
