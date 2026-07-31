import { test, expect } from '@fixtures/test-fixtures';
import { env } from '@config/env';

test.describe('Busqueda de Playstation 5 en Liverpool', () => {
  test('filtra por color y ordena por precio, muestra los primeros 5 resultados', async ({
    homePage,
    searchResultsPage,
  }) => {
    await homePage.goto();
    await homePage.search(env.searchTerm);

    await searchResultsPage.filterByColor(env.colorFilter);
    await searchResultsPage.sortByPriceLowToHigh();

    const products = await searchResultsPage.extractTopProducts(env.resultsLimit);

    console.log('Primeros resultados (nombre - precio):');
    for (const product of products) {
      console.log(`  - ${product.name} - $${product.price}`);
    }

    expect(products).toHaveLength(env.resultsLimit);
    for (const product of products) {
      expect(product.sku).toMatch(/^\d+$/);
      expect(product.price).toBeGreaterThan(0);
    }

    // si de verdad esta ordenado de menor a mayor, cada precio debe ser >= al anterior
    for (let i = 1; i < products.length; i++) {
      expect(products[i].price).toBeGreaterThanOrEqual(products[i - 1].price);
    }
  });
});
