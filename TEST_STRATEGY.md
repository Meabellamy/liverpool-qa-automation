# Estrategia de Pruebas — Liverpool QA Challenge

> **Nota previa:** Antes de escribir código, hice una exploración manual de la aplicación (búsqueda, filtros y peticiones en DevTools). Descubrí que Liverpool maneja navegación con parámetros específicos en la URL (`/tienda?s=...`), hidratación diferida (Next.js SSR) y que los resultados finales de filtro/orden llegan por un endpoint propio (`/web-bff/product/search`), distinto al de la carga inicial. Esta inspección fue clave para diseñar locators estables y saber exactamente qué endpoint de red interceptar en la Parte 2.

---

## 1. ¿Qué NO automatizaría en esta entrega y por qué?

* **CAPTCHA / reCAPTCHA Enterprise:** son sistemas diseñados específicamente para frenar automatizaciones. Intentar evadirlos con OCR o parches introduce mucha fragilidad. Lo correcto en CI es usar entornos de prueba con claves de test o saltar el caso si la seguridad se activa.
* **Flujos de pago reales y login:** involucran datos personales (PII) y pasarelas con autenticación 3DS/SMS imposibles de automatizar de forma estable. Pertenecen a entornos de prueba con tarjetas de test.
* **Validaciones estéticas píxel a píxel:** la alineación visual cambia entre navegadores/dispositivos y genera falsos positivos. Prefiero automatizar contratos de UI/API y dejar el diseño fino a revisiones visuales puntuales.
* **Disponibilidad de inventario estricta:** el stock de un e-commerce real cambia segundo a segundo. En vez de validar que un producto específico esté en stock, valido la estructura (que precios, títulos y SKUs rendericen bien y sean consistentes entre UI y red).

---

## 2. Manejo de CAPTCHA si llega a aparecer

Mi enfoque sería más preventivo que reactivo, en este orden:

1. **Detección temprana y soft-skip:** antes de correr las aserciones del flujo, verificar si aparece un iframe de reCAPTCHA/hCaptcha en la página. Si el sitio lo dispara en CI, marcar el test con `test.skip()` indicando la razón en el reporte, en vez de dejar que la pipeline falle por un factor externo que no controlamos.
2. **Entornos de prueba reales:** si el equipo de producto puede exponer una bandera de "modo QA" o claves de prueba de reCAPTCHA (como ofrece Google para testing), usarlas en el ambiente de staging en vez de pelear contra la protección real.
3. **Evidencia en el reporte:** ya tengo `trace: 'retain-on-failure'` configurado en Playwright, así que si el test llega a fallar o bloquearse por seguridad, queda la traza completa (DOM, red, consola) disponible en el reporte HTML para diagnosticar sin tener que reproducirlo a mano.

---

## 3. Riesgos de Flakiness y Mitigaciones Aplicadas

* **Bloqueo por Akamai Bot Manager en modo headless (el hallazgo más importante del proyecto):** Liverpool usa Akamai Bot Manager, y confirmé que bloquea a Chromium específicamente cuando corre en modo `--headless` nativo (responde "Access Denied" directo desde el edge, sin importar user-agent ni otros ajustes anti-detección — lo probé también con el canal de Chrome real). En modo headed no hay ningún problema. La mitigación que apliqué en CI es correr los tests dentro de un framebuffer virtual (`xvfb-run`): Chrome corre en modo headed (sin mandar el flag que el sitio detecta), pero no hay ninguna ventana visible en el runner. Esto está resuelto y verificado en la pipeline de GitHub Actions del repo.
* **Cambios en el catálogo:** nombres y precios varían entre ejecuciones porque es un sitio de producción real. Por eso las aserciones no comparan contra valores fijos ("debe salir tal producto"), sino invariantes estructurales: orden ascendente de precio, SKU numérico válido, y cruce por SKU contra la respuesta de red interceptada.
* **Carga diferida (SSR / hidratación) y navegación por SPA:** al filtrar por color o cambiar el orden, el sitio hace una navegación "suave" (cambia la URL y vuelve a pintar el grid) en vez de un reload completo. Si solo se espera un timeout fijo, el siguiente paso puede ejecutarse mientras la navegación sigue en curso. Lo resolví esperando explícitamente el cambio de URL (`waitForFunction` sobre `window.location.href`) más `waitForLoadState('domcontentloaded')` y la visibilidad del grid de resultados antes de continuar. Cero `waitForTimeout` hardcodeados en el flujo principal.
* **Precio con descuento mal parseado:** cuando un producto tiene descuento, el contenedor de precio concatena el precio vigente y el tachado original en el mismo texto (ej. `"$146.30$209.00"`), lo que rompía el parseo a número. Se corrigió priorizando el nodo del precio vigente cuando existe.
* **Banners de cookies/promociones:** se manejan con un click defensivo (busca el botón, si no aparece en unos segundos simplemente continúa) para no hacer fallar el test por un elemento opcional.

---

## 4. Escalabilidad a 50+ Tests en Paralelo en CI

Si tuviera que integrar esta suite a un pipeline de gran escala con decenas de suites más:

1. **Sharding de Playwright:** dividiría los tests entre múltiples jobs en paralelo con `npx playwright test --shard=x/y` en GitHub Actions, reduciendo drásticamente el tiempo de feedback.
2. **Consolidación de reportes:** cada shard generaría un reporte `blob`, que se fusiona al final del pipeline en un único reporte HTML centralizado (`playwright merge-reports`).
3. **Caché de dependencias:** cachear `node_modules` y los binarios de navegadores de Playwright usando el hash de `package-lock.json`, para no volver a descargar/instalar todo en cada corrida.
4. **Verificación de tipos y lint como fail-fast:** correr `tsc --noEmit` y `eslint` antes de lanzar cualquier navegador, para fallar rápido ante errores de tipos o sintaxis sin gastar minutos de runner.
5. **Aislar por dominio/equipo:** si son 50+ suites de distintos equipos, las separaría por workflow o por tag (`@smoke`, `@regression`) para poder correr solo lo relevante en cada PR y dejar la suite completa para un run nocturno.

---

## Nota personal

El desarrollo de esta prueba se alargó bastante más de lo esperado por el bloqueo real de Akamai Bot Manager en modo headless: al principio parecía un problema de selectores o de publicidad/popups, y terminó siendo un bloqueo a nivel de WAF que solo se resolvió corriendo el navegador en modo headed dentro de un framebuffer virtual en CI. Esto me dejó una lección clara: el análisis exhaustivo del sitio real (DevTools, exploración manual, entender cómo se comporta antes de escribir el primer test) no es un paso opcional ni un lujo, es lo que termina definiendo si el framework es robusto o si se queda en un script frágil que funciona "a veces".
