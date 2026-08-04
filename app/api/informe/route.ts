import { NextResponse } from "next/server";
import { obtenerInforme } from "@/lib/airtable";

const DATOS_EJEMPLO = [
  {
    id: "ejemplo-1",
    campos: {
      "ID Etiqueta": "SC-88213",
      Estado: "OK",
      "Factura Holded": "HLD-2026-0417",
      Fecha: "2026-08-04T09:12:00.000Z",
    },
  },
  {
    id: "ejemplo-2",
    campos: {
      "ID Etiqueta": "SC-88215",
      Estado: "Error",
      "Factura Holded": null,
      Fecha: "2026-08-04T09:13:00.000Z",
      Mensaje: "Pedido no encontrado en WooCommerce",
    },
  },
];

export async function GET() {
  try {
    const filas = await obtenerInforme();
    return NextResponse.json({ ok: true, filas, ejemplo: false });
  } catch (error) {
    // Airtable aún no configurado: devolvemos datos de ejemplo en vez de romper el dashboard.
    return NextResponse.json({ ok: true, filas: DATOS_EJEMPLO, ejemplo: true });
  }
}
