import type { Page, Response } from '@playwright/test';
import type { Product } from '@api/product.types';

/**
 * Cuando el usuario filtra por color u ordena, el frontend le pega a este
 * BFF (Backend for Frontend) para traer el nuevo listado, en vez de hacer un
 * reload completo de pagina. A diferencia de la carga inicial de /tienda
 * (que es SSR puro), esta si es una respuesta JSON limpia y facil de leer -
 * la encontramos inspeccionando la pestana de red manualmente en el Paso 1
 * y confirmando el hallazgo en la validacion del Paso 3 (ver
 * docs/internal/EXPLORATION.md).
 */
const PRODUCT_SEARCH_ENDPOINT = '/web-bff/product/search';

interface BffVariant {
  skuId?: string;
  title?: string;
  prices?: {
    salePrice?: string;
  };
}

interface BffProduct {
  id?: string;
  title?: string;
  variants?: BffVariant[];
}

interface BffSearchResponse {
  products?: BffProduct[];
}

export class SearchResponseInterceptor {
  private lastBody: string | null = null;

  constructor(private readonly page: Page) {
    this.page.on('response', this.handleResponse);
  }

  private handleResponse = async (response: Response): Promise<void> => {
    if (!response.url().includes(PRODUCT_SEARCH_ENDPOINT)) return;

    try {
      // nos quedamos siempre con la ULTIMA respuesta de este endpoint: cada
      // filtro/orden dispara una nueva, y la ultima es la que corresponde al
      // estado final que ya vimos renderizado cuando extraemos de la UI
      this.lastBody = await response.text();
    } catch {
      // si la request se cancelo o hubo un error de red, no es algo que
      // nos interese resolver aqui, simplemente la ignoramos
    }
  };

  getLastCapturedJson(): string {
    if (!this.lastBody) {
      throw new Error(
        `No se intercepto ninguna respuesta de "${PRODUCT_SEARCH_ENDPOINT}" todavia. ` +
          'Este endpoint solo se dispara al filtrar u ordenar, asegurate de haber hecho eso antes de leerlo.',
      );
    }
    return this.lastBody;
  }

  /** Hay que llamarlo al terminar el test para no dejar el listener pegado. */
  dispose(): void {
    this.page.off('response', this.handleResponse);
  }
}

/**
 * Convierte la respuesta cruda del BFF en nuestra forma comun de Product.
 * Cada producto puede tener varias variantes (por color/talla), asi que
 * aplanamos todo a nivel de sku - es el mismo nivel de detalle que sacamos
 * de la UI (cada card visible = un sku especifico).
 */
export function extractProductsFromSearchResponse(rawJson: string): Product[] {
  const data = JSON.parse(rawJson) as BffSearchResponse;
  const products: Product[] = [];

  for (const product of data.products ?? []) {
    for (const variant of product.variants ?? []) {
      const salePrice = variant.prices?.salePrice;
      if (!variant.skuId || !salePrice) continue;

      products.push({
        sku: variant.skuId,
        name: variant.title ?? product.title ?? '',
        price: Number.parseFloat(salePrice),
      });
    }
  }

  return products;
}
