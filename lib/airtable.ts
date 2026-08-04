const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;

export type FilaAirtable = {
  id: string;
  campos: Record<string, unknown>;
};

/**
 * Trae todos los campos tal cual de la tabla, sin asumir nombres concretos
 * (esquema aún pendiente de confirmar — ver CLAUDE.md sección 7).
 */
export async function obtenerInforme(): Promise<FilaAirtable[]> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
    throw new Error(
      "Faltan variables de entorno de Airtable (AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME)"
    );
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
    AIRTABLE_TABLE_NAME
  )}?sort%5B0%5D%5Bfield%5D=Fecha&sort%5B0%5D%5Bdirection%5D=desc`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Error al leer Airtable (${res.status}): ${detalle}`);
  }

  const data = await res.json();

  return (data.records ?? []).map((registro: { id: string; fields: Record<string, unknown> }) => ({
    id: registro.id,
    campos: registro.fields,
  }));
}
