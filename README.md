# Liverpool QA Automation

![E2E Tests](https://github.com/Meabellamy/liverpool-qa-automation/actions/workflows/test.yml/badge.svg)

Automatización end-to-end del flujo de búsqueda de [Liverpool.com.mx](https://www.liverpool.com.mx) (buscar "playstation 5", filtrar por color, ordenar por precio) con **Playwright + TypeScript**, más una capa de validación que cruza lo que se ve en pantalla contra la respuesta real de red que usa el frontend.

No es solo un script que hace clicks: está armado con Page Objects, tipado estricto, manejo explícito de esperas (nada de `waitForTimeout` a ciegas) y una corrida verde en GitHub Actions que puedes revisar tú mismo antes de clonar nada.

## Qué hace exactamente

1. Entra a Liverpool, busca "playstation 5", filtra por color "Blanco" y ordena de menor a mayor precio.
2. Extrae nombre y precio de los primeros 5 resultados y los imprime en consola.
3. Intercepta la respuesta de red real que usa el sitio para traer esos resultados, la compara contra lo que se ve en la UI (por SKU) y reporta cualquier diferencia de nombre o precio.

Los detalles de por qué se tomó cada decisión (selectores, el endpoint de red que se termina usando, un bug de parseo de precios que se encontró y corrigió, etc.) están en `TEST_STRATEGY.md`.

## Stack

- **Playwright Test** (TypeScript) como framework de automatización.
- **Page Object Model** para separar selectores/acciones del sitio de la lógica de los tests.
- **ESLint + Prettier** para mantener el código consistente.
- **GitHub Actions** para correr todo en CI y publicar el reporte como artifact.

## Requisitos previos

- Node.js 20 o superior.
- npm (viene con Node).

## Instalación

```bash
git clone https://github.com/Meabellamy/liverpool-qa-automation.git
cd liverpool-qa-automation
npm install
npx playwright install --with-deps
```

El último comando descarga los navegadores que usa Playwright (Chromium, Firefox y WebKit). Solo hace falta correrlo una vez.

## Cómo correr las pruebas

```bash
# Modo headless (por defecto, sin ventana visible)
npm test

# Modo headed (con ventana visible del navegador, útil para depurar)
npm run test:headed

# Solo en Chromium (más rápido, es el navegador principal del proyecto)
npm run test:chromium

# Modo UI de Playwright (interfaz visual para ver y depurar los tests paso a paso)
npm run test:ui
```

Después de correr las pruebas, para ver el reporte HTML con el detalle de cada test:

```bash
npm run report
```

### Una aclaración importante sobre el modo headless

Liverpool.com.mx usa **Akamai Bot Manager**, y en las pruebas que hice durante el desarrollo confirmé que bloquea a Chromium cuando corre en modo `--headless` nativo (responde "Access Denied" directo, sin importar el user-agent ni otros ajustes anti-detección). En modo headed no hay ningún problema.

Por eso, si corres `npm test` en tu máquina y el sitio te bloquea, es un comportamiento esperado y está documentado a detalle en `TEST_STRATEGY.md`. Para verlo funcionar sin este problema tienes dos opciones:

- Correrlo en modo headed: `npm run test:headed`.
- Revisar la corrida en GitHub Actions (ver sección de abajo), donde el pipeline resuelve esto corriendo el navegador dentro de un framebuffer virtual (Xvfb) — headed desde el punto de vista de Chrome, pero sin ninguna ventana visible en el runner.

## Variables de entorno

El proyecto no tiene ningún valor hardcodeado en el código: todo lo que puede cambiar entre corridas vive en variables de entorno, con valores por default razonables si no las defines.

```bash
cp .env.example .env
```

| Variable | Para qué sirve | Valor por default |
|---|---|---|
| `BASE_URL` | URL base del sitio a probar | `https://www.liverpool.com.mx` |
| `SEARCH_TERM` | Término de búsqueda (permite correr el mismo test con "xbox series x", "nintendo switch", etc. sin tocar código) | `playstation 5` |
| `COLOR_FILTER` | Color a filtrar en los resultados | `Blanco` |
| `RESULTS_LIMIT` | Cuántos resultados de arriba se extraen y validan | `5` |
| `MIN_CROSS_VALIDATION_MATCHES` | Mínimo de resultados de la UI que deben aparecer en la respuesta de red interceptada | `3` |

## CI / GitHub Actions

El workflow vive en `.github/workflows/test.yml` y corre en cada push. Instala dependencias, instala Chromium, y ejecuta las pruebas dentro de Xvfb (por la razón explicada arriba). Al final sube el reporte HTML como artifact, sin importar si las pruebas pasaron o fallaron.

Puedes ver una corrida real y verde aquí: **[github.com/Meabellamy/liverpool-qa-automation/actions](https://github.com/Meabellamy/liverpool-qa-automation/actions)**

Para descargar el reporte de una corrida en GitHub: entra al run correspondiente → sección "Artifacts" (abajo del todo) → descarga `playwright-report` → abre `index.html` en tu navegador.

## Estructura del proyecto

```
├── .github/workflows/test.yml   # pipeline de CI
├── src/
│   ├── pages/                   # Page Objects (HomePage, SearchResultsPage)
│   ├── utils/                   # interceptor de red, validador UI vs API, parseo de precios, logger
│   ├── api/                     # tipos compartidos (Product)
│   ├── fixtures/                # fixtures de Playwright que inyectan los Page Objects a los tests
│   └── config/                  # lectura tipada de variables de entorno
├── tests/e2e/
│   ├── search-flow.spec.ts          # Parte 1: búsqueda, filtro, orden y extracción
│   └── network-validation.spec.ts   # Parte 2: interceptación de red y cruce UI vs API
├── playwright.config.ts
└── TEST_STRATEGY.md
```

## Comandos útiles adicionales

```bash
npm run typecheck    # revisa tipos de TypeScript sin compilar
npm run lint          # revisa el código con ESLint
npm run format        # formatea el código con Prettier
```

## Documento de estrategia

Las decisiones de qué automatizar, qué no y por qué, los riesgos de flakiness detectados (y cómo se mitigaron), y qué cambiaría para meter esto en un pipeline de CI con 50+ suites más, están en **[`TEST_STRATEGY.md`](./TEST_STRATEGY.md)**.
