import { NextResponse } from "next/server";
import { ejecutarEscenario } from "@/lib/make";

export async function POST() {
  try {
    const resultado = await ejecutarEscenario();
    return NextResponse.json({ ok: true, resultado });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
