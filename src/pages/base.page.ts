import type { Page } from '@playwright/test';

/**
 * Cosas que casi cualquier pagina del sitio necesita en algun momento.
 * Las paginas concretas heredan de aqui para no repetir este tipo de codigo.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Liverpool muestra una barra de cookies fija abajo. No bloquea la
   * interaccion con el buscador ni con los filtros, pero por higiene visual
   * (y para que no estorbe en los screenshots del reporte) la cerramos si
   * aparece. Si no aparece no truena, simplemente seguimos.
   */
  async closeCookieBanner(): Promise<void> {
    const closeButton = this.page.getByRole('button', { name: /cerrar|aceptar/i }).first();
    if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeButton.click().catch(() => {
        // si por algun motivo ya no esta ahi cuando intentamos hacer click, no pasa nada
      });
    }
  }
}
