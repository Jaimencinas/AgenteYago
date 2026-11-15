"use client";

import { useState } from "react";
import type { ResumenLote } from "@/components/InformeSendcloud";

type Estado = { texto: string; tipo: "ok" | "info" | "error" | "" };

// Tiempos del sondeo del informe tras disparar el escenario.
const MARGEN_PAUSA_MS = 8_000; // margen antes de apagar la programación en Make
const INTERVALO_SONDEO_MS = 6_000; // cada cuánto se consulta Airtable
const SONDEOS_ESTABLES_PARA_CERRAR = 4; // ~24 s seguidos sin filas nuevas => lote cerrado
const SIN_FILAS_MAX_MS = 90_000; // si en este tiempo no aparece ninguna fila, paramos
const MAX_ESPERA_MS = 8 * 60_000; // tope absoluto de espera

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const contadores = (r: ResumenLote | null) => (r ? ` (${r.ok} OK · ${r.error} con error)` : "");

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
      // Foto del informe ANTES de disparar: sirve para distinguir el lote
      // nuevo del último lote que ya estaba en Airtable.
      const base = (await onCompletado?.()) ?? null;

      const res = await fetch("/api/facturar", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setEstado({
        texto: "Escenario disparado en Make. Recogiendo el resultado del lote…",
        tipo: "ok",
      });

      // Le damos margen al escenario para arrancar de verdad antes de apagar
      // la programación (si apagamos demasiado pronto, Make puede cancelar
      // la ejecución que se acaba de lanzar). La ejecución en curso sigue.
      setTimeout(() => {
        fetch("/api/pausar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activo: false }),
        }).catch(() => {});
      }, MARGEN_PAUSA_MS);

      // Make escribe en Airtable una fila por pedido a medida que avanza, y
      // con lotes grandes tarda varios minutos. En vez de esperar un tiempo
      // fijo, sondeamos el informe y damos el lote por cerrado cuando lleva
      // un rato sin aparecer filas nuevas.
      const inicio = Date.now();
      let ultimoTotal = 0;
      let sondeosEstables = 0;
      let resumen: ResumenLote | null = null;

      while (Date.now() - inicio < MAX_ESPERA_MS) {
        await esperar(INTERVALO_SONDEO_MS);
        const actual = (await onCompletado?.()) ?? null;
        const hayLoteNuevo =
          actual !== null &&
          (base === null || actual.texto !== base.texto || actual.total !== base.total);
        const total = hayLoteNuevo && actual ? actual.total : 0;

        if (total > 0) {
          resumen = actual;
          sondeosEstables = total === ultimoTotal ? sondeosEstables + 1 : 0;
          ultimoTotal = total;
          setEstado({
            texto: `Recogiendo resultados… ${total} pedido${total === 1 ? "" : "s"} hasta ahora${contadores(resumen)}`,
            tipo: "ok",
          });
          if (sondeosEstables >= SONDEOS_ESTABLES_PARA_CERRAR) break;
        } else if (Date.now() - inicio > SIN_FILAS_MAX_MS) {
          break;
        }
      }

      if (resumen && ultimoTotal > 0) {
        setEstado({
          texto: `Lote recogido: ${resumen.total} pedido${resumen.total === 1 ? "" : "s"}${contadores(resumen)} — ${resumen.texto}`,
          tipo: "info",
        });
      } else {
        setEstado({
          texto: "Escenario ejecutado, pero no ha aparecido ningún pedido nuevo en Airtable (¿no había etiquetas pendientes?). Pulsa «Actualizar informe» para comprobarlo.",
          tipo: "info",
        });
      }
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
