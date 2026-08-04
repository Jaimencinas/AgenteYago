import { NextResponse } from "next/server";
import { cambiarEstadoEscenario } from "@/lib/make";

export async function POST(request: Request) {
  try {
    const { activo } = await request.json();
    const resultado = await cambiarEstadoEscenario(Boolean(activo));
    return NextResponse.json({ ok: true, resultado });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
