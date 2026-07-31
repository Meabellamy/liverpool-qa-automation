/**
 * Forma comun de un producto, ya sea que venga de la UI (scrapeado del DOM)
 * o de la respuesta interceptada de red. Usar el mismo tipo en ambos lados
 * facilita comparar uno contra otro en la Parte 2.
 */
export interface Product {
  /** SKU del producto, viene en el data-testid de la card y en el JSON de red */
  sku: string;
  name: string;
  price: number;
}
