import { type Page, type Locator, expect } from '@playwright/test';

export class MapPage {
  readonly page: Page;
  readonly mapContainer: Locator;
  readonly zoomInButton: Locator;
  readonly zoomOutButton: Locator;
  readonly bridgeMarkers: Locator;
  readonly viewportScanButton: Locator;
  readonly filterBar: Locator;
  readonly viewportSummary: Locator;
  readonly hoverCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mapContainer = page.locator('.leaflet-container').first();
    this.zoomInButton = page.locator('.leaflet-control-zoom-in, [class*="zoom-in"]');
    this.zoomOutButton = page.locator('.leaflet-control-zoom-out, [class*="zoom-out"]');
    this.bridgeMarkers = page.locator('[class*="leaflet-marker"], [class*="marker-icon"], [class*="bridge-marker"]');
    this.viewportScanButton = page.getByRole('button', { name: /scan current map area/i });
    this.filterBar = page.getByRole('group', { name: /filter bridges by risk/i });
    this.viewportSummary = page.locator('[class*="summary"], [aria-live="polite"]');
    this.hoverCard = page.locator('[role="tooltip"], [class*="tooltip"], [class*="hover-card"]');
  }

  async waitForMapLoad(timeout = 10000): Promise<void> {
    await expect(this.mapContainer).toBeVisible({ timeout });
    await this.page.waitForTimeout(500);
  }

  async getMarkerCount(): Promise<number> {
    return this.bridgeMarkers.count();
  }

  async hasMarkers(): Promise<boolean> {
    return (await this.bridgeMarkers.count()) > 0;
  }

  async zoomIn(times = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      if (await this.zoomInButton.isVisible()) {
        await this.zoomInButton.click();
        await this.page.waitForTimeout(300);
      }
    }
  }

  async zoomOut(times = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      if (await this.zoomOutButton.isVisible()) {
        await this.zoomOutButton.click();
        await this.page.waitForTimeout(300);
      }
    }
  }

  async clickScanArea(): Promise<void> {
    if (await this.viewportScanButton.isVisible()) {
      await this.viewportScanButton.click();
    }
  }

  async hoverOnMarker(index = 0): Promise<void> {
    const marker = this.bridgeMarkers.nth(index);
    if (await marker.isVisible()) {
      await marker.hover();
    }
  }

  async clickOnMarker(index = 0): Promise<void> {
    const marker = this.bridgeMarkers.nth(index);
    if (await marker.isVisible()) {
      await marker.click();
    }
  }

  async getViewportSummary(): Promise<string | null> {
    if (await this.viewportSummary.isVisible()) {
      return this.viewportSummary.textContent();
    }
    return null;
  }

  async hasHoverCard(): Promise<boolean> {
    await this.page.waitForTimeout(500);
    return (await this.hoverCard.count()) > 0;
  }

  async getFilterButtons(): Promise<Locator[]> {
    const buttons = this.page.getByRole('button', { name: /all|critical|high|medium|low/i });
    const count = await buttons.count();
    const result: Locator[] = [];
    for (let i = 0; i < count; i++) {
      result.push(buttons.nth(i));
    }
    return result;
  }

  async clickFilterButton(tier: string): Promise<void> {
    const button = this.page.getByRole('button', { name: new RegExp(`^${tier}(?:\\s*\\(\\d+\\))?$`, 'i') });
    if (await button.isVisible()) {
      await button.click();
    }
  }

  async getVisibleBridgeCount(): Promise<number> {
    const summary = await this.getViewportSummary();
    if (summary) {
      const match = summary.match(/(\d+)\s+of\s+(\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return await this.getMarkerCount();
  }

  async panMap(dx: number, dy: number): Promise<void> {
    const mapBounds = await this.mapContainer.boundingBox();
    if (mapBounds) {
      const centerX = mapBounds.x + mapBounds.width / 2;
      const centerY = mapBounds.y + mapBounds.height / 2;
      await this.page.mouse.move(centerX, centerY);
      await this.page.mouse.down();
      await this.page.mouse.move(centerX + dx, centerY + dy);
      await this.page.mouse.up();
      await this.page.waitForTimeout(500);
    }
  }
}
