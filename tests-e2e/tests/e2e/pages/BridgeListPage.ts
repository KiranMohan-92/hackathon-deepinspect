import { type Page, type Locator, expect } from '@playwright/test';

export class BridgeListPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly scanButton: Locator;
  readonly demoButton: Locator;
  readonly cityModeButton: Locator;
  readonly bridgeModeButton: Locator;
  readonly coordsModeButton: Locator;
  readonly filterButtons: Locator;
  readonly bridgeList: Locator;
  readonly loadingIndicator: Locator;
  readonly errorAlert: Locator;
  readonly bridgeItems: Locator;
  readonly selectAllCheckbox: Locator;
  readonly analyzeSelectedButton: Locator;
  readonly roadClassTabs: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByLabel(/search query/i);
    this.scanButton = page.getByRole('button', { name: /start scan/i });
    this.demoButton = page.getByRole('button', { name: /load demo data/i });
    this.cityModeButton = page.getByRole('button', { name: /^city$/i });
    this.bridgeModeButton = page.getByRole('button', { name: /^bridge$/i });
    this.coordsModeButton = page.getByRole('button', { name: /^coords$/i });
    this.filterButtons = page.getByRole('button', { name: /^(all|critical|high|medium|ok)(?:\s*\(\d+\))?$/i });
    this.bridgeList = page.locator('[role="list"]').first();
    this.loadingIndicator = page.locator('[role="progressbar"]');
    this.errorAlert = page.locator('[role="alert"], [class*="error"]');
    this.bridgeItems = page.locator('[role="listitem"]');
    this.selectAllCheckbox = page.locator('input[type="checkbox"]').first();
    this.analyzeSelectedButton = page.getByRole('button', { name: /analyze.*\d+|analyze/i });
    this.roadClassTabs = page.locator('[role="tablist"] button');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async selectCityMode(): Promise<void> {
    await this.cityModeButton.click();
  }

  async selectBridgeMode(): Promise<void> {
    await this.bridgeModeButton.click();
  }

  async selectCoordsMode(): Promise<void> {
    await this.coordsModeButton.click();
  }

  async searchForCity(city: string): Promise<void> {
    await this.selectCityMode();
    await this.searchInput.fill(city);
    await this.scanButton.click();
  }

  async searchByCoords(lat: number, lon: number): Promise<void> {
    await this.selectCoordsMode();
    await this.searchInput.fill(`${lat}, ${lon}`);
    await this.scanButton.click();
  }

  async loadDemo(): Promise<void> {
    await this.demoButton.click();
  }

  async waitForLoadingComplete(timeout = 30000): Promise<void> {
    await expect(this.loadingIndicator).toBeHidden({ timeout });
    await this.page.getByText('DISCOVERING').waitFor({ state: 'hidden', timeout }).catch(() => {});
    await this.page.waitForTimeout(250);
  }

  async waitForBridgesToLoad(timeout = 10000): Promise<void> {
    await expect(this.bridgeItems.first()).toBeVisible({ timeout });
  }

  async getBridgeCount(): Promise<number> {
    return this.bridgeItems.count();
  }

  async filterByRiskTier(tier: 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'OK'): Promise<void> {
    const button = this.page.getByRole('button', { name: new RegExp(`^${tier}(?:\\s*\\(\\d+\\))?$`, 'i') });
    if (await button.isVisible()) {
      await button.click();
    }
  }

  async selectBridgeByIndex(index: number): Promise<void> {
    const items = this.bridgeItems;
    const count = await items.count();
    if (index < count) {
      await items.nth(index).getByRole('button', { name: /view details for bridge/i }).click();
    }
  }

  async selectBridgeByName(name: string): Promise<void> {
    const item = this.page.getByRole('button', { name: new RegExp(`view details for bridge.*${name}`, 'i') }).first();
    if (await item.isVisible()) {
      await item.click();
    }
  }

  async selectAllBridges(): Promise<void> {
    if (await this.selectAllCheckbox.isVisible()) {
      await this.selectAllCheckbox.check();
    }
  }

  async deselectAllBridges(): Promise<void> {
    if (await this.selectAllCheckbox.isVisible()) {
      await this.selectAllCheckbox.uncheck();
    }
  }

  async analyzeSelectedBridges(): Promise<void> {
    if (await this.analyzeSelectedButton.isVisible()) {
      await this.analyzeSelectedButton.click();
    }
  }

  async filterByRoadClass(roadClass: string): Promise<void> {
    const tab = this.roadClassTabs.getByText(roadClass, { exact: false });
    if (await tab.isVisible()) {
      await tab.click();
    }
  }

  async hasError(): Promise<boolean> {
    return (await this.errorAlert.count()) > 0;
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.hasError()) {
      return this.errorAlert.textContent();
    }
    return null;
  }

  async isLoading(): Promise<boolean> {
    return (await this.loadingIndicator.count()) > 0;
  }
}
