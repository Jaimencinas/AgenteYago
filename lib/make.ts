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

/** Dispara el escenario, equivalente a pulsar "Run once" en Make. */
export async function ejecutarEscenario() {
  const res = await fetch(`${baseUrl()}/scenarios/${scenarioId()}/run`, {
    method: "POST",
    headers: headers(),
  });

  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Error al ejecutar el escenario de Make (${res.status}): ${detalle}`);
  }

  return res.json();
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
    throw new Error(`Error al cambiar el estado del escenario de Make (${res.status}): ${detalle}`);
  }

  return res.json();
}
