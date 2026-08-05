const MAKE_API_TOKEN = process.env.MAKE_API_TOKEN;
const MAKE_REGION = process.env.MAKE_REGION;
const MAKE_SCENARIO_ID = process.env.MAKE_SCENARIO_ID;

function baseUrl() {
  if (!MAKE_REGION) {
    throw new Error("Falta la variable de entorno MAKE_REGION (ej: eu2.make.com)");
  }
  return `https://${MAKE_REGION}/api/v2`;
}

function headers() {
  if (!MAKE_API_TOKEN) {
    throw new Error("Falta la variable de entorno MAKE_API_TOKEN");
  }
  return {
    Authorization: `Token ${MAKE_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function scenarioId() {
  if (!MAKE_SCENARIO_ID) {
    throw new Error("Falta la variable de entorno MAKE_SCENARIO_ID");
  }
  return MAKE_SCENARIO_ID;
}

/** Activa o desactiva el escenario, equivalente al toggle "Every 15 minutes". */
export async function cambiarEstadoEscenario(activo: boolean) {
  const endpoint = activo ? "start" : "stop";
  const res = await fetch(`${baseUrl()}/scenarios/${scenarioId()}/${endpoint}`, {
    method: "POST",
    headers: headers(),
  });

  if (!res.ok) {
    const detalle = await res.text();
    // "ya está activo/inactivo" no es un error real, solo lo ignoramos.
    if (!detalle.includes("already")) {
      throw new Error(`Error al cambiar el estado del escenario de Make (${res.status}): ${detalle}`);
    }
    return null;
  }

  return res.json();
}

/**
 * Dispara el escenario, equivalente a pulsar "Run once" en Make.
 * La API de Make exige que el escenario esté activado para poder
 * ejecutarlo bajo demanda (a diferencia del botón "Run once" del
 * editor, que funciona igual esté activado o no). Por eso lo
 * activamos justo antes de lanzarlo y lo volvemos a apagar justo
 * después, dejando el toggle "Every 15 minutes" como estaba.
 */
export async function ejecutarEscenario() {
  await cambiarEstadoEscenario(true);

  try {
    const res = await fetch(`${baseUrl()}/scenarios/${scenarioId()}/run`, {
      method: "POST",
      headers: headers(),
    });

    if (!res.ok) {
      const detalle = await res.text();
      throw new Error(`Error al ejecutar el escenario de Make (${res.status}): ${detalle}`);
    }

    return await res.json();
  } finally {
    // Restaurar el estado apagado no debe hacer fallar la operación si el
    // "run" ya se disparó correctamente.
    await cambiarEstadoEscenario(false).catch(() => {});
  }
}
