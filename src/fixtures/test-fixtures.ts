import { test as base } from '@playwright/test';
import { HomePage } from '@pages/home.page';
import { SearchResultsPage } from '@pages/search-results.page';
import { SearchResponseInterceptor } from '@utils/network-interceptor';

interface Fixtures {
  homePage: HomePage;
  searchResultsPage: SearchResultsPage;
  searchInterceptor: SearchResponseInterceptor;
}

/**
 * Extendemos el test base de Playwright para que cada spec reciba sus page
 * objects ya listos, sin tener que hacer "new HomePage(page)" en cada archivo.
 */
export const test = base.extend<Fixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  searchResultsPage: async ({ page }, use) => {
    await use(new SearchResultsPage(page));
  },
  // se registra ANTES de que el test navegue a ningun lado, para no perdernos
  // ninguna respuesta de documento de /tienda
  searchInterceptor: async ({ page }, use) => {
    const interceptor = new SearchResponseInterceptor(page);
    await use(interceptor);
    interceptor.dispose();
  },
});

export { expect } from '@playwright/test';
