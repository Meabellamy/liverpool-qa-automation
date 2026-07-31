import { test, expect } from '@fixtures/test-fixtures';
import { env } from '@config/env';
import { extractProductsFromSearchResponse } from '@utils/network-interceptor';
import { crossValidateProducts } from '@utils/product-validator';
import { logCrossValidationResult } from '@utils/logger';

test.describe('Validacion cruzada UI vs respuesta de red interceptada', () => {
  test('al menos 3 de los 5 resultados de la UI aparecen en la respuesta interceptada', async ({
    homePage,
    searchResultsPage,
    searchInterceptor,
  }) => {
    await homePage.goto();
    await homePage.search(env.searchTerm);
    await searchResultsPage.filterByColor(env.colorFilter);
    await searchResultsPage.sortByPriceLowToHigh();

    const uiProducts = await searchResultsPage.extractTopProducts(env.resultsLimit);

    // la interceptamos DESPUES de que la pagina ya cargo el estado final
    // (filtrado + ordenado), asi que corresponde exactamente a lo que se ve en pantalla
    const interceptedJson = searchInterceptor.getLastCapturedJson();
    const apiProducts = extractProductsFromSearchResponse(interceptedJson);

    expect(apiProducts.length).toBeGreaterThan(0);

    const result = crossValidateProducts(uiProducts, apiProducts);
    logCrossValidationResult(result);

    expect(result.matchedBySku).toBeGreaterThanOrEqual(env.minCrossValidationMatches);
  });
});
