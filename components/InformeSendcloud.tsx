"use client";

import { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";

type FilaAirtable = { id: string; campos: Record<string, unknown> };

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

const InformeSendcloud = forwardRef<InformeSendcloudRef>(function InformeSendcloud(_props, ref) {
  const [filas, setFilas] = useState<FilaAirtable[]>([]);
  const [esEjemplo, setEsEjemplo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/informe", { cache: "no-store" });
      const data = await res.json();
      setFilas(data.filas ?? []);
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

  const columnas = Array.from(
    filas.reduce((acc, fila) => {
      Object.keys(fila.campos).forEach((clave) => acc.add(clave));
      return acc;
    }, new Set<string>())
  );

  const claveEstado = columnas.find((c) => c.toLowerCase().includes("estado"));

  return (
    <section className="mt-4">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-[1.1rem]">
        <h2 className="font-display font-semibold text-[1.3rem]">Último informe</h2>
        <span className="text-carbon-400 text-[0.82rem]">
          {esEjemplo && "Datos de ejemplo (Airtable sin configurar) · "}
          {actualizadoEn ? `Actualizado ${actualizadoEn.toLocaleString("es-ES")}` : cargando ? "Cargando…" : ""}
        </span>
      </div>

      <div className="bg-white dark:bg-carbon-800 border-[1.5px] border-carbon-200 dark:border-carbon-700 rounded-3xl overflow-hidden overflow-x-auto">
        {filas.length === 0 ? (
          <div className="p-12 text-center text-carbon-400">
            {cargando ? "Cargando informe…" : "Todavía no hay registros en Airtable."}
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
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.id} className="hover:bg-brand-600/[0.03] border-b border-carbon-200 dark:border-carbon-700 last:border-none">
                  {columnas.map((col) => (
                    <td key={col} className="px-[1.1rem] py-[0.85rem] align-top tabular-nums text-carbon-950 dark:text-carbon-50">
                      {col === claveEstado ? badgeEstado(fila.campos[col]) : formatearValor(fila.campos[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
});

export default InformeSendcloud;
