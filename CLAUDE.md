# CLAUDE.md — Dashboard Volta (Facturación Sendcloud)

Este archivo guía a Claude Code en el desarrollo y mantenimiento de este proyecto. Léelo antes de tocar código.

## 1. Qué es este proyecto

Un dashboard interno, simple, con **un único botón**: **"Facturar Etiquetas Sendcloud"**.

Al pulsarlo:
1. Se dispara el escenario de Make.com que procesa las etiquetas de Sendcloud (búsqueda en Airtable, notificaciones por Telegram vía BOT VOLTA, creación de pedidos/facturas en WooCommerce y Holded).
2. El escenario, en cada una de sus ramas finales, escribe su resultado en la tabla de Airtable ya usada por el flujo.
3. El dashboard lee esa tabla y muestra un **informe persistente** con el resultado de la última ejecución (y su histórico), sin que el usuario tenga que volver a Make ni a Airtable.

> Diagrama de referencia del escenario de Make: router central → Iterator → Router por rama → Airtable (Search Records) → Telegram (BOT VOLTA) en unas ramas, y Tools (Set/Aggregate variable) → WooCommerce → Tools → Holded (Make an API Call) en otras. El nodo Holded es el final real de cada rama de facturación.

## 2. Identidad visual — extraída de `volta-coche-demo-v4_3.html`

El HTML de referencia es la demo de la homepage de **Volta Baterías** ("el supermercado de las baterías": coche, moto, camión, caravana, náutica, bici, patinete, herramientas y energía portátil). Está construido en React (JSX compilado) + Tailwind, con soporte nativo de modo claro/oscuro. El dashboard de facturación debe usar exactamente este mismo sistema, no un estilo genérico.

### Paleta de colores

| Token | Hex | Uso |
|---|---|---|
| `brand-400` | `#FF6E63` | rojo claro, estados hover suaves |
| `brand-500` | `#EF4640` | hover de botones primarios |
| **`brand-600`** | **`#E53935`** | **Color primario / CTA principal** (botones "Elegir", selección, foco de inputs, alertas) |
| `brand-700` | `#C62828` | rojo oscuro, estados activos/pressed |
| `accent-blue` | `#2E5FDE` | acento secundario (iconos, detalles decorativos, no para CTAs principales) |
| `whatsapp` | `#25D366` | solo para CTA de contacto por WhatsApp |
| `carbon-50` | `#F6F6F6` | fondo claro general |
| `carbon-100` | `#EDEDED` | fondo de tarjetas/inputs en claro |
| `carbon-200` | `#DBDBDB` | bordes en modo claro |
| `carbon-300`–`carbon-400` | `#B3B3B3` / `#8C8C8C` | texto secundario, placeholders |
| `carbon-700` | `#3B3B3B` | bordes en modo oscuro |
| `carbon-800` | `#2B2B2B` | superficies en modo oscuro |
| `carbon-900` | `#1A1A1A` | fondo modo oscuro |
| **`carbon-950`** | **`#121212`** | texto principal en claro / fondo más oscuro |

> Importante: el **rojo (`brand-600`) es el color de marca principal**, no el azul. El azul (`#2E5FDE`) aparece solo como acento puntual (decoración de inputs, iconografía), nunca como color de fondo de un botón principal.

### Tipografía

- **Títulos / cifras destacadas** (`font-display`): `'Oswald Variable', Oswald, Arial Narrow, system-ui, sans-serif` — tipografía condensada, de trazo industrial/automotriz. Números de precio y encabezados usan `font-display font-bold` con `tabular-nums`.
- **Texto de interfaz / cuerpo** (`font-sans`): `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica Neue, Arial, sans-serif`.

### Componentes y estilo

- **Botón primario (CTA)**: forma píldora (`rounded-full`), fondo `brand-600`, texto blanco, `hover:bg-brand-500` + `shadow-glow` (halo rojo: `box-shadow: 0 0 0 1px rgba(229,57,53,.22), 0 8px 40px -8px rgba(229,57,53,.35)`), icono al final del texto (ej. flecha), transición suave (`transition-all duration-300`).
- **Botón secundario/terciario**: texto plano en `carbon-400`, `hover:text-carbon-700` (claro) / `hover:text-carbon-200` (oscuro), sin fondo.
- **Inputs**: borde `border-2 border-carbon-200` (oscuro: `border-carbon-700`), `focus:border-brand-600`, sin outline. Mensajes de error/alerta en `text-brand-600` con icono ⚠.
- **Modo claro/oscuro nativo**: todo el sistema usa clases `dark:` de Tailwind — el dashboard debe soportar ambos modos igual que el sitio original, con toggle "Modo claro" / "Modo oscuro".
- **Radios de borde**: variados según el elemento — `9999px` (píldora, botones/badges), `1.5rem`/`1rem` (tarjetas grandes), `.5rem`/`.375rem` (inputs, elementos pequeños).

### Aplicación al Dashboard

- Botón **"Facturar Etiquetas Sendcloud"**: replicar el estilo del botón "Elegir"/"Ver opciones en mi zona" — píldora roja (`brand-600`), texto blanco, icono, `shadow-glow` al hover, y estado deshabilitado/cargando mientras se procesa.
- Sección de **informe**: tarjetas con bordes `carbon-200`/`carbon-700` y fondo `carbon-50`/`carbon-900` según modo, títulos en `font-display`, cifras (nº de etiquetas, importes) en `font-display font-bold tabular-nums`.
- Reutilizar `Oswald Variable` (Google Fonts) + la pila `font-sans` del sitio para que el dashboard se sienta parte de la misma familia de producto que la tienda.

## 3. Stack técnico

- **Next.js** (App Router) — un solo proyecto full-stack, sin necesidad de backend separado.
- Frontend: React + **Tailwind CSS**, configurado con los tokens de marca de Volta Baterías (ver sección 2: `brand-*`, `carbon-*`) para que el dashboard comparta look & feel con la tienda.
- Fuente `Oswald Variable` cargada vía Google Fonts (o self-hosted) para `font-display`.
- Backend: API Routes de Next.js (`/app/api/...`), donde viven las claves y llamadas server-side.
- Sin base de datos propia: **Airtable es la única fuente de verdad** para el histórico de informes (respuesta del usuario: reutilizar la tabla ya usada en el escenario de Make).
- Soporte de modo claro/oscuro con `dark:` de Tailwind, igual que el sitio de referencia.

Motivo de esta elección: el dashboard es deliberadamente simple (1 botón + 1 informe), y tanto el trigger (Make) como la persistencia (Airtable) son servicios externos ya existentes. No tiene sentido añadir una base de datos nueva.

## 4. Flujo de datos

```
[Usuario pulsa "Facturar Etiquetas Sendcloud"]
        │
        ▼
POST /api/facturar  (API route de Next.js)
        │
        ▼
Llama al Webhook de Make.com que dispara el escenario
        │
        ▼
Make ejecuta el árbol completo (Sendcloud → Airtable → ramas → Holded)
        │
        ▼
Cada rama, al terminar, escribe/actualiza una fila en Airtable
        │
        ▼
GET /api/informe  (API route de Next.js, server-side, con la API key de Airtable)
        │
        ▼
Lee la tabla de Airtable y devuelve las filas relevantes (última ejecución + histórico)
        │
        ▼
Frontend renderiza el informe en el Dashboard
```

**Importante sobre el "final del árbol":** como el escenario tiene varias ramas en paralelo, no hay un único punto de "fin" que se pueda esperar de forma síncrona con una respuesta HTTP inmediata. Por eso el informe se lee por **polling** (o botón "Actualizar informe") contra Airtable en vez de esperar una respuesta directa del webhook. Esto también da histórico gratis: cada fila de Airtable es una entrada del informe.

## 5. Estructura de carpetas (propuesta)

```
/app
  /page.tsx                 → Dashboard: botón + informe
  /api/facturar/route.ts    → dispara el webhook de Make
  /api/informe/route.ts     → lee Airtable y devuelve el informe
/components
  /BotonFacturar.tsx
  /InformeSendcloud.tsx
/lib
  /airtable.ts              → cliente Airtable server-side
  /make.ts                  → helper para llamar al webhook
.env.local                  → variables de entorno (nunca commitear)
CLAUDE.md
```

## 6. Variables de entorno necesarias

```
MAKE_WEBHOOK_URL=            # URL del webhook que dispara el escenario en Make
AIRTABLE_API_KEY=            # Personal Access Token de Airtable
AIRTABLE_BASE_ID=            # ID de la base
AIRTABLE_TABLE_NAME=         # Nombre/ID de la tabla usada por el escenario
```

Todas se leen **solo en server-side** (API routes). Nunca exponer `AIRTABLE_API_KEY` al cliente.

## 7. Esquema de la tabla de Airtable — PENDIENTE DE CONFIRMAR

Necesito los nombres de campo reales de la tabla que ya usa el escenario para poder mapear el informe correctamente. Campos que probablemente existen (a confirmar):

- [ ] ID de etiqueta / pedido Sendcloud
- [ ] Estado (OK / Error / Pendiente)
- [ ] ID de factura en Holded
- [ ] Fecha/hora de procesamiento
- [ ] Mensaje de error (si aplica)

Hasta confirmar esto, el helper `lib/airtable.ts` debe traer **todos los campos tal cual** de la tabla, sin asumir nombres concretos, y el componente `InformeSendcloud.tsx` debe renderizarlos de forma genérica (tabla dinámica por claves) para no romperse si el esquema cambia.

## 8. Comportamiento esperado del Dashboard

- Un único botón: **"Facturar Etiquetas Sendcloud"**.
- Al pulsar: estado de carga visible, deshabilitar el botón mientras se dispara el webhook (evitar doble clic / doble ejecución del escenario).
- Debajo del botón: sección **"Último informe"** con las filas más recientes de Airtable relacionadas con la ejecución.
- Botón secundario **"Actualizar informe"** para refrescar contra Airtable sin volver a facturar.
- Opcional: histórico completo en una vista/tab separada, ordenado por fecha descendente.

## 9. Fuera de alcance (de momento)

- Autenticación de usuarios (si se necesita, valorar algo simple tipo contraseña única de acceso, no un sistema de cuentas completo).
- Edición de datos desde el dashboard (es solo lectura + disparo del proceso).
- Reintentos automáticos de filas en error — mostrar el error, no gestionarlo.

## 10. Comandos

```bash
npm install
npm run dev       # desarrollo local
npm run build     # build de producción
npm run lint
```

## 11. Convenciones

- TypeScript estricto.
- Nada de lógica de negocio en componentes de UI: toda llamada a Airtable/Make vive en `/lib` y se consume desde `/app/api`.
- Comentarios y nombres de variables en español, coherente con el resto del proyecto (BOT VOLTA, Facturar, Informe, etc.).

---

**Próximos pasos para completar este archivo:**
1. ~~Subir `volta-coche-demo-v4_3.html` → identidad visual.~~ ✅ Hecho (sección 2).
2. Confirmar nombres de campo de la tabla de Airtable → rellenar sección 7.
3. Confirmar si el webhook de Make ya existe o hay que crearlo → rellenar sección 6.
