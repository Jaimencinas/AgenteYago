"use client";

import { useRef } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import BotonFacturar from "@/components/BotonFacturar";
import InformeSendcloud, { InformeSendcloudRef } from "@/components/InformeSendcloud";

export default function Dashboard() {
  const informeRef = useRef<InformeSendcloudRef>(null);

  return (
    <div className="max-w-[960px] mx-auto px-5 pt-10 pb-16">
      <header className="flex items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-[0.6rem]">
          <div className="font-display w-[34px] h-[34px] rounded-full bg-brand-600 flex items-center justify-center text-white font-bold">
            V
          </div>
          <div className="font-display font-semibold text-[1.05rem] tracking-wide">
            VOLTA <span className="text-brand-600">Baterías</span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <div className="text-center mb-11">
        <h1 className="font-display font-bold text-[clamp(1.8rem,4vw,2.6rem)] tracking-wide mb-[0.6rem]">
          Facturación Sendcloud
        </h1>
        <p className="text-carbon-400 max-w-[560px] mx-auto">
          Dispara el escenario de Make.com que procesa las etiquetas de Sendcloud (Airtable → BOT VOLTA →
          WooCommerce → Holded) y consulta aquí el resultado.
        </p>
      </div>

      <BotonFacturar onCompletado={() => informeRef.current?.actualizar()} />

      <div className="flex justify-center -mt-8 mb-10">
        <button
          onClick={() => informeRef.current?.actualizar()}
          type="button"
          className="text-carbon-400 hover:text-carbon-700 dark:hover:text-carbon-200 text-[0.88rem] font-medium transition-colors"
        >
          ↻ Actualizar informe
        </button>
      </div>

      <InformeSendcloud ref={informeRef} />

      <footer className="mt-12 text-center text-carbon-400 text-[0.78rem]">
        Dashboard interno · Facturación Sendcloud · Volta Baterías
      </footer>
    </div>
  );
}
