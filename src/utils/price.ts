/**
 * Los precios en Liverpool vienen renderizados como "$1,499" + un span con
 * un "." invisible (solo de relleno visual) + "00". Con textContent (no
 * innerText) nos quedamos con todo ese texto tal cual, incluyendo el punto,
 * asi que solo hace falta limpiar simbolos y comas de miles.
 */
export function parsePriceText(rawText: string): number {
  const cleaned = rawText.replace(/[^0-9.]/g, '');
  const value = Number.parseFloat(cleaned);

  if (Number.isNaN(value)) {
    throw new Error(`No se pudo convertir el texto de precio a numero: "${rawText}"`);
  }

  return value;
}
