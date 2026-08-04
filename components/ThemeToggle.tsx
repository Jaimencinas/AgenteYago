"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    setOscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const nuevoOscuro = !oscuro;
    setOscuro(nuevoOscuro);
    document.documentElement.classList.toggle("dark", nuevoOscuro);
    localStorage.setItem("volta-theme", nuevoOscuro ? "dark" : "light");
  }

  return (
    <button
      onClick={alternar}
      type="button"
      className="flex items-center gap-1.5 rounded-full border-[1.5px] border-carbon-200 dark:border-carbon-700 bg-white dark:bg-carbon-800 px-4 py-[0.45rem] text-[0.8rem] text-carbon-400 hover:text-carbon-700 dark:hover:text-carbon-200 transition-all"
    >
      <span>{oscuro ? "☀️" : "🌙"}</span>
      <span>{oscuro ? "Modo claro" : "Modo oscuro"}</span>
    </button>
  );
}
