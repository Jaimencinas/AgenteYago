"use client";

import { useState } from "react";
import type { ResumenLote } from "@/components/InformeSendcloud";

type Estado = { texto: string; tipo: "ok" | "info" | "error" | "" };

export default function BotonFacturar({
  onCompletado,
}: {
  onCompletado?: () => Promise<ResumenLote | null>;
}) {
  const [cargando, setCargando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [cambiandoPausa, setCambiandoPausa] = useState(false);
  const [estado, setEstado] = useState<Estado>({ texto: "", tipo: "" });

  async function facturar() {
    setCargando(true);
    setEstado({ texto: "", tipo: "" });
    try {
      const res = await fetch("/api/facturar", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setEstado({
        texto: "Escenario disparado en Make. Recogiendo el resultado del lote…",
        tipo: "ok",
      });

      // Le damos margen al escenario para arrancar de verdad y a Make para
      // escribir los resultados en Airtable antes de apagarlo y consultar
      // el informe (si apagamos demasiado pronto, Make puede cancelar la
      // ejecución que se acaba de lanzar).
      setTimeout(async () => {
        fetch("/api/pausar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activo: false }),
        }).catch(() => {});

        const resumen = await onCompletado?.();
        if (resumen) {
          setEstado({
            texto: `Lote recogido: ${resumen.total} pedido${resumen.total === 1 ? "" : "s"} (${resumen.ok} OK · ${resumen.error} con error) — ${resumen.texto}`,
            tipo: "info",
          });
        }
      }, 8000);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "Error desconocido";
      setEstado({ texto: `Error al facturar: ${mensaje}`, tipo: "error" });
    } finally {
      setCargando(false);
    }
  }

  async function alternarPausa() {
    setCambiandoPausa(true);
    setEstado({ texto: "", tipo: "" });
    try {
      const nuevoPausado = !pausado;
      const res = await fetch("/api/pausar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !nuevoPausado }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setPausado(nuevoPausado);
      setEstado({
        texto: nuevoPausado
          ? "Escenario en pausa: la ejecución automática cada 15 minutos queda desactivada. Puedes seguir facturando manualmente con el botón de arriba."
          : "Escenario reanudado: volverá a ejecutarse automáticamente cada 15 minutos.",
        tipo: "ok",
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "Error desconocido";
      setEstado({ texto: `Error al cambiar el estado: ${mensaje}`, tipo: "error" });
    } finally {
      setCambiandoPausa(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-[0.85rem] mb-12">
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={facturar}
          disabled={cargando}
          type="button"
          className="inline-flex items-center gap-[0.6rem] rounded-full bg-brand-600 px-[2.1rem] py-4 font-semibold text-white shadow-glow transition-all duration-300 hover:bg-brand-500 hover:-translate-y-px active:bg-brand-700 disabled:opacity-65 disabled:cursor-not-allowed disabled:shadow-none disabled:pointer-events-none group"
        >
          {cargando ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              <span>Facturando…</span>
            </>
          ) : (
            <>
              <span>Facturar Etiquetas Sendcloud</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </>
          )}
        </button>

        <button
          onClick={alternarPausa}
          disabled={cambiandoPausa}
          type="button"
          className={`inline-flex items-center gap-2 rounded-full border-[1.5px] px-[1.6rem] py-[0.9rem] font-semibold text-[0.95rem] transition-all duration-200 disabled:opacity-55 disabled:cursor-not-allowed ${
            pausado
              ? "border-brand-600 text-brand-600 bg-brand-600/[0.06]"
              : "border-carbon-200 dark:border-carbon-700 bg-white dark:bg-carbon-800 text-carbon-950 dark:text-carbon-50 hover:border-brand-600 hover:text-brand-600"
          }`}
        >
          {pausado ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 5v14l12-7z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          )}
          <span>{pausado ? "Reanudar Escenario" : "Pausar Escenario"}</span>
        </button>
      </div>

      <p
        className={`text-[0.85rem] min-h-[1.2em] text-center max-w-[520px] ${
          estado.tipo === "ok"
            ? "text-green-600"
            : estado.tipo === "info"
            ? "text-accent-blue"
            : estado.tipo === "error"
            ? "text-brand-600"
            : "text-carbon-400"
        }`}
      >
        {estado.texto}
      </p>
    </div>
  );
}
