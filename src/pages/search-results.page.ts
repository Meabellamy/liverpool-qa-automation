import type { Locator, Page } from '@playwright/test';
import { BasePage } from '@pages/base.page';
import { parsePriceText } from '@utils/price';
import type { Product } from '@api/product.types';

const PRODUCT_GRID_ID = '#plp-page-card-product-list';
const SORT_BUTTON_TESTID = 'dropdown-sorting-button';

export class SearchResultsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get productGrid(): Locator {
    return this.page.locator(PRODUCT_GRID_ID);
  }

  private get productCards(): Locator {
    return this.productGrid.locator('section[data-testid$="-card"]');
  }

  /**
   * Filtra por color usando el checkbox del sidebar. El value del input
   * sigue el patron "NombreColor~~#hexcolor", por eso el ^= en vez de
   * depender del id del contenedor (ese id lo genera React con useId y
   * cambia entre builds, no es confiable como selector).
   */
  async filterByColor(color: string): Promise<void> {
    const checkbox = this.page.locator(`input[type="checkbox"][value^="${color}~~"]`);
    await checkbox.scrollIntoViewIfNeeded();
    await this.clickAndWaitForResultsReload(checkbox);
  }

  /**
   * Al elegir color o orden, Liverpool hace una navegacion "suave" (cambia
   * la url y vuelve a pintar el grid) en vez de un reload completo de
   * pagina. Si solo esperamos un timeout fijo, en ocasiones el siguiente
   * paso se ejecuta mientras la navegacion sigue en curso y terminamos
   * interactuando con contenido a medio cargar (fue justo lo que nos paso
   * en la exploracion manual del Paso 1). Por eso esperamos explicitamente
   * a que la url cambie y a que el documento termine de cargar antes de
   * seguir.
   */
  private async clickAndWaitForResultsReload(target: Locator): Promise<void> {
    const urlBefore = this.page.url();
    await target.click({ force: true });
    await this.page.waitForFunction((previousUrl) => window.location.href !== previousUrl, urlBefore);
    await this.page.waitForLoadState('domcontentloaded');
    await this.productGrid.waitFor({ state: 'visible' });
  }

  async sortByPriceLowToHigh(): Promise<void> {
    await this.page.getByTestId(SORT_BUTTON_TESTID).click();
    const option = this.page.getByRole('option', { name: 'Menor precio', exact: true });
    await option.waitFor({ state: 'visible' });
    await this.clickAndWaitForResultsReload(option);
  }

  /**
   * Saca nombre y precio de las primeras `limit` cards tal como se ven en
   * pantalla. El nombre "visible" es la union de la marca (h4) y la
   * descripcion corta (h3); no es el titulo completo del producto (ese
   * vive en el JSON de la respuesta, lo usamos en la Parte 2 para el
   * cruce), pero es justo lo que un usuario real ve en la pagina.
   */
  async extractTopProducts(limit: number): Promise<Product[]> {
    const cards = this.productCards;
    const count = Math.min(limit, await cards.count());
    const products: Product[] = [];

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const sku = await this.getSkuFromCard(card);
      const brand = (await card.locator('h4').first().textContent())?.trim() ?? '';
      const shortDescription = (await card.locator('h3').first().textContent())?.trim() ?? '';
      const priceText = await this.getCurrentPriceText(card, sku);

      products.push({
        sku,
        name: `${brand} ${shortDescription}`.trim(),
        price: parsePriceText(priceText),
      });
    }

    return products;
  }

  /**
   * Cuando un producto tiene descuento, el contenedor de precio trae DOS
   * precios pegados en el texto: el actual (data-testid="discounted") y el
   * tachado original (data-testid="original"), ej. textContent completo
   * queda como "$146.30$209.00" y si no los separamos el parseo de numero
   * sale mal. Si no hay descuento, esos sub-testids no existen y usamos el
   * contenedor de precio completo tal cual.
   */
  private async getCurrentPriceText(card: Locator, sku: string): Promise<string> {
    const priceContainer = card.locator(`[data-testid="${sku}-price"]`).first();
    const discountedPrice = priceContainer.locator('[data-testid="discounted"]');

    if (await discountedPrice.count()) {
      return (await discountedPrice.first().textContent()) ?? '';
    }

    return (await priceContainer.textContent()) ?? '';
  }

  private async getSkuFromCard(card: Locator): Promise<string> {
    const testId = await card.getAttribute('data-testid');
    if (!testId) {
      throw new Error('Una card de producto no tiene data-testid, no se puede sacar el sku');
    }
    // el testid de la card es literalmente "{sku}-card"
    return testId.replace(/-card$/, '');
  }
}
