import { test as base } from '@playwright/test';
import { HomePage } from '@pages/home.page';
import { SearchResultsPage } from '@pages/search-results.page';

interface Fixtures {
  homePage: HomePage;
  searchResultsPage: SearchResultsPage;
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
});

export { expect } from '@playwright/test';
