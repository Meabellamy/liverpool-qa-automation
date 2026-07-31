import type { Product } from '@api/product.types';

export type DiscrepancyField = 'missing-in-api' | 'price' | 'name';

export interface Discrepancy {
  sku: string;
  field: DiscrepancyField;
  uiValue: string | number;
  apiValue?: string | number;
}

export interface CrossValidationResult {
  totalUiProducts: number;
  matchedBySku: number;
  discrepancies: Discrepancy[];
}

const PRICE_TOLERANCE = 0.01;

/**
 * Cruza los productos que sacamos de la UI contra los que vinieron en la
 * respuesta interceptada, usando el SKU como llave (es el dato mas confiable
 * que tenemos de los dos lados, ver docs/internal/EXPLORATION.md). El nombre
 * en la UI es solo "marca + descripcion corta" mientras que en la respuesta
 * interceptada es el titulo completo, asi que para nombre no pedimos
 * igualdad exacta sino que se parezcan razonablemente.
 */
export function crossValidateProducts(
  uiProducts: Product[],
  apiProducts: Product[],
): CrossValidationResult {
  const apiBySku = new Map(apiProducts.map((product) => [product.sku, product]));
  const discrepancies: Discrepancy[] = [];
  let matchedBySku = 0;

  for (const uiProduct of uiProducts) {
    const apiProduct = apiBySku.get(uiProduct.sku);

    if (!apiProduct) {
      discrepancies.push({ sku: uiProduct.sku, field: 'missing-in-api', uiValue: uiProduct.name });
      continue;
    }

    matchedBySku++;

    if (Math.abs(apiProduct.price - uiProduct.price) > PRICE_TOLERANCE) {
      discrepancies.push({
        sku: uiProduct.sku,
        field: 'price',
        uiValue: uiProduct.price,
        apiValue: apiProduct.price,
      });
    }

    if (!namesLookAlike(uiProduct.name, apiProduct.name)) {
      discrepancies.push({
        sku: uiProduct.sku,
        field: 'name',
        uiValue: uiProduct.name,
        apiValue: apiProduct.name,
      });
    }
  }

  return { totalUiProducts: uiProducts.length, matchedBySku, discrepancies };
}

/**
 * No esperamos que el nombre de la UI (marca + descripcion corta) sea igual
 * caracter por caracter al titulo completo de la respuesta interceptada, asi
 * que comparamos por palabras en comun en vez de igualdad exacta o substring.
 */
function namesLookAlike(uiName: string, apiName: string): boolean {
  const uiWords = normalizeToWordSet(uiName);
  const apiWords = normalizeToWordSet(apiName);

  if (uiWords.size === 0) return false;

  let sharedWords = 0;
  for (const word of uiWords) {
    if (apiWords.has(word)) sharedWords++;
  }

  return sharedWords / uiWords.size >= 0.5;
}

function normalizeToWordSet(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos para no fallar por "á" vs "a"
    .replace(/[^a-z0-9\s]/g, ' ');

  return new Set(normalized.split(/\s+/).filter((word) => word.length > 2));
}
