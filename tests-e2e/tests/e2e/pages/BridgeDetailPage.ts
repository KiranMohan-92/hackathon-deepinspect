import { type Page, type Locator, expect } from '@playwright/test';

export class BridgeDetailPage {
  readonly page: Page;
  readonly panel: Locator;
  readonly bridgeName: Locator;
  readonly bridgeCoordinates: Locator;
  readonly analyzeButton: Locator;
  readonly riskScore: Locator;
  readonly riskTier: Locator;
  readonly riskBadge: Locator;
  readonly streetViewImages: Locator;
  readonly thinkingSteps: Locator;
  readonly closeButton: Locator;
  readonly conditionSummary: Locator;
  readonly keyRiskFactors: Locator;
  readonly recommendedAction: Locator;
  readonly maintenanceNotes: Locator;
  readonly bridgeContext: Locator;
  readonly exportSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.panel = page.locator('main > div').last();
    this.bridgeName = this.panel.locator('p.font-medium').first();
    this.bridgeCoordinates = this.panel.locator('.font-mono').filter({ hasText: /^-?\d+\.\d+,\s*-?\d+\.\d+$/ }).first();
    this.analyzeButton = page.getByRole('button', { name: /^run deep analysis$/i });
    this.riskScore = this.panel.getByText(/^[0-5]\.\d$/).first();
    this.riskTier = this.panel.getByText(/^(CRITICAL|HIGH|MEDIUM|OK)$/).first();
    this.riskBadge = this.riskTier;
    this.streetViewImages = this.panel.locator('img[alt^="Street view"]');
    this.thinkingSteps = this.panel.getByText(/AI REASONING|VISION|CONTEXT|RISK/i);
    this.closeButton = this.panel.locator('button[title="Back to list"], button').first();
    this.conditionSummary = this.panel.getByText(/^CONDITION SUMMARY$/i);
    this.keyRiskFactors = this.panel.getByText(/^KEY RISK FACTORS$/i);
    this.recommendedAction = this.panel.getByText(/^RECOMMENDED ACTION$/i);
    this.maintenanceNotes = this.panel.getByText(/^MAINTENANCE TASKS$/i);
    this.bridgeContext = this.panel.getByText(/^(BUILT|MATERIAL|ERA|AGE)$/i);
    this.exportSection = this.panel.getByRole('button', { name: /download pdf report|generating pdf|downloaded/i });
  }

  async openBridgeByOsmId(osmId: string): Promise<void> {
    const bridgeItem = this.page.locator(`[data-osm-id="${osmId}"], :text("${osmId}")`).first();
    await bridgeItem.click();
    await this.waitForPanelOpen();
  }

  async openBridgeByIndex(index: number): Promise<void> {
    const items = this.page.locator('[role="listitem"]');
    const count = await items.count();
    if (index < count) {
      await items.nth(index).getByRole('button', { name: /view details for bridge/i }).click();
      await this.waitForPanelOpen();
    }
  }

  async waitForPanelOpen(timeout = 5000): Promise<void> {
    await expect(this.panel).toBeVisible({ timeout });
  }

  async waitForAnalysisStart(timeout = 5000): Promise<void> {
    await this.page.getByRole('button', { name: /analyzing/i }).waitFor({ state: 'visible', timeout }).catch(() => {});
  }

  async waitForAnalysisComplete(timeout = 15000): Promise<void> {
    await expect(this.analyzeButton).toBeHidden({ timeout });
    await expect(this.riskBadge).toBeVisible({ timeout });
    await this.page.waitForTimeout(250);
  }

  async runDeepAnalysis(): Promise<void> {
    if (await this.analyzeButton.isVisible()) {
      await this.analyzeButton.click();
    }
  }

  async hasRiskScore(): Promise<boolean> {
    return (await this.riskScore.count()) > 0;
  }

  async hasRiskTier(): Promise<boolean> {
    return (await this.riskTier.count()) > 0;
  }

  async hasStreetViewImages(): Promise<boolean> {
    return (await this.streetViewImages.count()) > 0;
  }

  async hasThinkingSteps(): Promise<boolean> {
    return (await this.thinkingSteps.count()) > 0;
  }

  async hasConditionSummary(): Promise<boolean> {
    return (await this.conditionSummary.count()) > 0;
  }

  async hasKeyRiskFactors(): Promise<boolean> {
    return (await this.keyRiskFactors.count()) > 0;
  }

  async hasRecommendedAction(): Promise<boolean> {
    return (await this.recommendedAction.count()) > 0;
  }

  async hasMaintenanceNotes(): Promise<boolean> {
    return (await this.maintenanceNotes.count()) > 0;
  }

  async close(): Promise<void> {
    if (await this.closeButton.isVisible()) {
      await this.closeButton.click();
    }
  }

  async getBridgeName(): Promise<string | null> {
    if (await this.bridgeName.isVisible()) {
      return this.bridgeName.textContent();
    }
    return null;
  }

  async getRiskTierText(): Promise<string | null> {
    const badge = this.riskBadge.first();
    if (await badge.isVisible()) {
      return badge.textContent();
    }
    return null;
  }

  async isAnalyzing(): Promise<boolean> {
    return (await this.page.getByRole('button', { name: /analyzing/i }).count()) > 0;
  }
}
