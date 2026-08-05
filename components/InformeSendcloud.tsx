"use client";

import { useEffect, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import * as XLSX from "xlsx";

type FilaAirtable = { id: string; campos: Record<string, unknown>; creadoEn: string };

function formatearValor(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
    return new Date(valor).toLocaleString("es-ES");
  }
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

function badgeEstado(valor: unknown) {
  const texto = String(valor ?? "").toLowerCase();
  if (texto.includes("ok") || texto.includes("factur")) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-600/10 text-green-600 text-[0.74rem] font-semibold px-[0.7rem] py-1">✓ {String(valor)}</span>;
  }
  if (texto.includes("error")) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-brand-600/10 text-brand-600 text-[0.74rem] font-semibold px-[0.7rem] py-1">⚠ {String(valor)}</span>;
  }
  if (texto.includes("pend")) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-accent-blue/10 text-accent-blue text-[0.74rem] font-semibold px-[0.7rem] py-1">⏳ {String(valor)}</span>;
  }
  return <span>{formatearValor(valor)}</span>;
}

export type InformeSendcloudRef = { actualizar: () => void };

// Filas creadas en Airtable con menos de esta diferencia entre sí se
// consideran del mismo lote (misma pulsación de "Facturar" o misma
// ejecución programada). Es una aproximación por cercanía temporal:
// Airtable no guarda todavía un "ID de ejecución" por fila.
const UMBRAL_LOTE_MINUTOS = 5;

type Lote = { id: string; inicio: Date; fin: Date; filas: FilaAirtable[] };

function agruparEnLotes(filas: FilaAirtable[]): Lote[] {
  const lotes: Lote[] = [];

  for (const fila of filas) {
    const fecha = new Date(fila.creadoEn);
    const ultimo = lotes[lotes.length - 1];

    if (ultimo && (ultimo.fin.getTime() - fecha.getTime()) / 60000 <= UMBRAL_LOTE_MINUTOS) {
      ultimo.filas.push(fila);
      if (fecha < ultimo.fin) ultimo.fin = fecha;
    } else {
      lotes.push({ id: fila.id, inicio: fecha, fin: fecha, filas: [fila] });
    }
  }

  return lotes;
}

function resumenLote(lote: Lote, claveEstado: string | undefined) {
  const mismaFecha = lote.inicio.toDateString() === lote.fin.toDateString();
  const rango = mismaFecha
    ? `${lote.fin.toLocaleDateString("es-ES")} · ${lote.fin.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}–${lote.inicio.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
    : `${lote.fin.toLocaleString("es-ES")} – ${lote.inicio.toLocaleString("es-ES")}`;

  if (!claveEstado) return rango;

  const ok = lote.filas.filter((f) => String(f.campos[claveEstado] ?? "").toLowerCase().includes("ok")).length;
  const error = lote.filas.filter((f) => String(f.campos[claveEstado] ?? "").toLowerCase().includes("error")).length;
  return `${rango} · ${ok} OK · ${error} con error`;
}

const InformeSendcloud = forwardRef<InformeSendcloudRef>(function InformeSendcloud(_props, ref) {
  const [filas, setFilas] = useState<FilaAirtable[]>([]);
  const [ordenCampos, setOrdenCampos] = useState<string[] | null>(null);
  const [esEjemplo, setEsEjemplo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null);

  const [soloCompletos, setSoloCompletos] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [lotesAbiertos, setLotesAbiertos] = useState<Set<string>>(new Set());

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/informe", { cache: "no-store" });
      const data = await res.json();
      setFilas(data.filas ?? []);
      setOrdenCampos(data.orden ?? null);
      setEsEjemplo(Boolean(data.ejemplo));
      setActualizadoEn(new Date());
    } finally {
      setCargando(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({ actualizar: cargar }), [cargar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const columnas = useMemo(() => {
    const presentes = filas.reduce((acc, fila) => {
      Object.keys(fila.campos).forEach((clave) => acc.add(clave));
      return acc;
    }, new Set<string>());

    if (ordenCampos) {
      // Orden real de Airtable primero; cualquier campo que no esté en el
      // esquema conocido (por si cambia) se añade al final.
      const conocidos = ordenCampos.filter((c) => presentes.has(c));
      const desconocidos = Array.from(presentes).filter((c) => !ordenCampos.includes(c));
      return [...conocidos, ...desconocidos];
    }

    return Array.from(presentes);
  }, [filas, ordenCampos]);

  const claveEstado = columnas.find((c) => c.toLowerCase().includes("estado"));

  const filasFiltradas = useMemo(() => {
    return filas.filter((fila) => {
      if (soloCompletos) {
        const tieneVacios = columnas.some((col) => {
          const v = fila.campos[col];
          return v === null || v === undefined || v === "";
        });
        if (tieneVacios) return false;
      }

      if (fechaDesde || fechaHasta) {
        const fecha = new Date(fila.creadoEn);
        if (fechaDesde && fecha < new Date(fechaDesde)) return false;
        if (fechaHasta && fecha > new Date(fechaHasta + "T23:59:59")) return false;
      }

      return true;
    });
  }, [filas, columnas, soloCompletos, fechaDesde, fechaHasta]);

  const lotes = useMemo(() => agruparEnLotes(filasFiltradas), [filasFiltradas]);

  // Al llegar datos nuevos, el lote más reciente empieza desplegado y el resto plegados.
  useEffect(() => {
    if (lotes.length > 0) setLotesAbiertos(new Set([lotes[0].id]));
  }, [filas]); // eslint-disable-line react-hooks/exhaustive-deps

  function alternarLote(id: string) {
    setLotesAbiertos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  function descargarExcel() {
    const filasExportar = filasFiltradas.map((fila) => {
      const fila_: Record<string, string> = {};
      columnas.forEach((col) => {
        fila_[col] = formatearValor(fila.campos[col]);
      });
      return fila_;
    });

    const hoja = XLSX.utils.json_to_sheet(filasExportar);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Informe Sendcloud");

    const fechaArchivo = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(libro, `informe-sendcloud-${fechaArchivo}.xlsx`);
  }

  return (
    <section className="mt-4">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-[1.1rem]">
        <h2 className="font-display font-semibold text-[1.3rem]">Último informe</h2>
        <span className="text-carbon-400 text-[0.82rem]">
          {esEjemplo && "Datos de ejemplo (Airtable sin configurar) · "}
          {actualizadoEn ? `Actualizado ${actualizadoEn.toLocaleString("es-ES")}` : cargando ? "Cargando…" : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 bg-white dark:bg-carbon-800 border-[1.5px] border-carbon-200 dark:border-carbon-700 rounded-2xl px-4 py-3">
        <label className="flex items-center gap-2 text-[0.85rem] text-carbon-950 dark:text-carbon-50 cursor-pointer">
          <input
            type="checkbox"
            checked={soloCompletos}
            onChange={(e) => setSoloCompletos(e.target.checked)}
            className="accent-brand-600 w-4 h-4"
          />
          Solo informes completos
        </label>

        <div className="flex items-center gap-2 text-[0.85rem]">
          <span className="text-carbon-400">Desde</span>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="border-2 border-carbon-200 dark:border-carbon-700 bg-transparent rounded-md px-2 py-1 text-carbon-950 dark:text-carbon-50 focus:border-brand-600 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-[0.85rem]">
          <span className="text-carbon-400">Hasta</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="border-2 border-carbon-200 dark:border-carbon-700 bg-transparent rounded-md px-2 py-1 text-carbon-950 dark:text-carbon-50 focus:border-brand-600 outline-none"
          />
        </div>

        {(soloCompletos || fechaDesde || fechaHasta) && (
          <button
            onClick={() => {
              setSoloCompletos(false);
              setFechaDesde("");
              setFechaHasta("");
            }}
            type="button"
            className="text-carbon-400 hover:text-brand-600 text-[0.82rem] transition-colors"
          >
            ✕ Limpiar filtros
          </button>
        )}

        <button
          onClick={descargarExcel}
          disabled={filasFiltradas.length === 0}
          type="button"
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-brand-600 text-white text-[0.85rem] font-semibold px-4 py-2 hover:bg-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⬇ Descargar Excel
        </button>
      </div>

      <div className="bg-white dark:bg-carbon-800 border-[1.5px] border-carbon-200 dark:border-carbon-700 rounded-3xl overflow-hidden overflow-x-auto">
        {filasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-carbon-400">
            {cargando
              ? "Cargando informe…"
              : filas.length === 0
              ? "Todavía no hay registros en Airtable."
              : "Ningún registro coincide con los filtros aplicados."}
          </div>
        ) : (
          <table className="w-full border-collapse text-[0.86rem] min-w-[560px]">
            <thead>
              <tr>
                {columnas.map((col) => (
                  <th
                    key={col}
                    className="text-left px-[1.1rem] py-[0.85rem] font-display font-medium text-[0.72rem] uppercase tracking-wider text-carbon-400 border-b-[1.5px] border-carbon-200 dark:border-carbon-700"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            {lotes.map((lote) => {
              const abierto = lotesAbiertos.has(lote.id);
              return (
                <tbody key={lote.id}>
                  <tr
                    onClick={() => alternarLote(lote.id)}
                    className="cursor-pointer bg-carbon-50 dark:bg-carbon-900 hover:bg-brand-600/[0.05] border-b border-carbon-200 dark:border-carbon-700"
                  >
                    <td colSpan={columnas.length} className="px-[1.1rem] py-[0.7rem] font-display font-medium text-carbon-950 dark:text-carbon-50">
                      <span className="inline-block w-4 transition-transform" style={{ transform: abierto ? "rotate(90deg)" : "rotate(0deg)" }}>
                        ▸
                      </span>{" "}
                      Lote de {lote.filas.length} — {resumenLote(lote, claveEstado)}
                    </td>
                  </tr>
                  {abierto &&
                    lote.filas.map((fila) => (
                      <tr key={fila.id} className="hover:bg-brand-600/[0.03] border-b border-carbon-200 dark:border-carbon-700 last:border-none">
                        {columnas.map((col) => (
                          <td key={col} className="px-[1.1rem] py-[0.85rem] align-top tabular-nums text-carbon-950 dark:text-carbon-50">
                            {col === claveEstado ? badgeEstado(fila.campos[col]) : formatearValor(fila.campos[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              );
            })}
          </table>
        )}
      </div>
    </section>
  );
});

export default InformeSendcloud;
