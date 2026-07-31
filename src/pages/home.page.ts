import type { Page } from '@playwright/test';
import { BasePage } from '@pages/base.page';

// el testid del input de busqueda se repite igual para la version de escritorio
// y la de movil, por eso hay que filtrar por el que este realmente visible
const SEARCH_INPUT_TESTID = 'blt26617d4f2e17657d-header-search-input';

export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.closeCookieBanner();
  }

  /**
   * Escribe el termino en el buscador y presiona Enter. Liverpool hace una
   * navegacion completa a /tienda?s=<termino>, asi que esperamos a que la url
   * cambie en vez de solo esperar un timeout fijo.
   */
  async search(term: string): Promise<void> {
    const searchInput = this.page.getByTestId(SEARCH_INPUT_TESTID).locator('visible=true');
    await searchInput.click();
    await searchInput.fill(term);
    await Promise.all([
      this.page.waitForURL(/\/tienda\?s=/),
      searchInput.press('Enter'),
    ]);
  }
}
