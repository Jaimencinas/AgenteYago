const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;

export type FilaAirtable = {
  id: string;
  campos: Record<string, unknown>;
  creadoEn: string;
};

/**
 * Trae todos los campos tal cual de la tabla, sin asumir nombres concretos
 * (esquema aún pendiente de confirmar — ver CLAUDE.md sección 7).
 * Se ordena por fecha de creación del registro en Airtable, que siempre
 * existe, en vez de asumir el nombre de un campo de fecha concreto.
 */
export async function obtenerInforme(): Promise<FilaAirtable[]> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
    throw new Error(
      "Faltan variables de entorno de Airtable (AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME)"
    );
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Error al leer Airtable (${res.status}): ${detalle}`);
  }

  const data = await res.json();

  const filas: FilaAirtable[] = (data.records ?? []).map(
    (registro: { id: string; fields: Record<string, unknown>; createdTime: string }) => ({
      id: registro.id,
      campos: registro.fields,
      creadoEn: registro.createdTime,
    })
  );

  return filas.sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));
}

/**
 * Orden real de los campos tal y como están definidos en Airtable
 * (vía la API de metadatos), para que el informe los muestre en ese
 * mismo orden en vez del orden en que aparecen dentro de cada registro.
 * Si el token no tiene permiso de esquema (scope schema.bases:read),
 * devuelve null y el informe cae al orden de aparición como antes.
 */
export async function obtenerOrdenCampos(): Promise<string[] | null> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) return null;

  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json();
  const tabla = (data.tables ?? []).find(
    (t: { id: string; name: string }) => t.name === AIRTABLE_TABLE_NAME || t.id === AIRTABLE_TABLE_NAME
  );
  if (!tabla) return null;

  return tabla.fields.map((f: { name: string }) => f.name);
}
