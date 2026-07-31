import type { CrossValidationResult } from '@utils/product-validator';

/**
 * Nada elegante, solo queremos que las discrepancias queden claras en el log
 * de la corrida (y por lo tanto tambien dentro del reporte HTML de Playwright,
 * que captura la consola de cada test).
 */
export function logCrossValidationResult(result: CrossValidationResult): void {
  console.log(
    `Cruce UI <-> respuesta interceptada: ${result.matchedBySku}/${result.totalUiProducts} productos de la UI encontrados por SKU en la respuesta de red.`,
  );

  if (result.discrepancies.length === 0) {
    console.log('Sin discrepancias de nombre o precio.');
    return;
  }

  console.log(`Se encontraron ${result.discrepancies.length} discrepancia(s):`);
  for (const discrepancy of result.discrepancies) {
    if (discrepancy.field === 'missing-in-api') {
      console.log(`  - SKU ${discrepancy.sku}: no aparecio en la respuesta interceptada (UI: "${discrepancy.uiValue}")`);
      continue;
    }

    console.log(
      `  - SKU ${discrepancy.sku} [${discrepancy.field}]: UI="${discrepancy.uiValue}" vs API="${discrepancy.apiValue}"`,
    );
  }
}
