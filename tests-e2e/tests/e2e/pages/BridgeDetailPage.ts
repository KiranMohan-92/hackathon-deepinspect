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
    this.panel = page.locator('[class*="panel"]').last();
    this.bridgeName = page.locator('[class*="panel"] [class*="title"], [class*="panel"] h2, [class*="panel"] h3').first();
    this.bridgeCoordinates = page.locator('[class*="panel"] [class*="coordinates"], [class*="panel"] [class*="mono"]').first();
    this.analyzeButton = page.getByRole('button', { name: /run deep analysis|analyze/i });
    this.riskScore = page.locator('[class*="score"], [data-testid="risk-score"]');
    this.riskTier = page.locator('[class*="tier"], [data-testid="risk-tier"]');
    this.riskBadge = page.locator('[class*="badge"], [class*="risk-badge"]');
    this.streetViewImages = page.locator('[class*="panel"] img, [class*="image-viewer"] img');
    this.thinkingSteps = page.locator('[class*="thinking"], [class*="reasoning"], [class*="steps"]');
    this.closeButton = page.getByRole('button', { name: /close|back/i }).first();
    this.conditionSummary = page.locator('text=/condition summary|condition/i');
    this.keyRiskFactors = page.locator('text=/key risk factor|risk factor/i');
    this.recommendedAction = page.locator('text=/recommended action|action/i');
    this.maintenanceNotes = page.locator('text=/maintenance|task/i');
    this.bridgeContext = page.locator('text=/built|material|era|age/i');
    this.exportSection = page.locator('[class*="export"], [class*="download"]');
  }

  async openBridgeByOsmId(osmId: string): Promise<void> {
    const bridgeItem = this.page.locator(`[data-osm-id="${osmId}"], :text("${osmId}")`).first();
    await bridgeItem.click();
    await this.waitForPanelOpen();
  }

  async openBridgeByIndex(index: number): Promise<void> {
    const items = this.page.locator('[role="listitem"], [class*="bridge-item"]');
    const count = await items.count();
    if (index < count) {
      await items.nth(index).click();
      await this.waitForPanelOpen();
    }
  }

  async waitForPanelOpen(timeout = 5000): Promise<void> {
    await this.panel.waitFor({ state: 'visible', timeout });
  }

  async waitForAnalysisStart(timeout = 5000): Promise<void> {
    await this.analyzeButton.waitFor({ state: 'hidden', timeout }).catch(() => {});
  }

  async waitForAnalysisComplete(timeout = 60000): Promise<void> {
    await this.thinkingSteps.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await this.analyzeButton.waitFor({ state: 'hidden', timeout }).catch(() => {});
    await this.riskBadge.first().waitFor({ state: 'visible', timeout }).catch(() => {});
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
    const buttonText = await this.analyzeButton.textContent();
    return buttonText?.toLowerCase().includes('analyzing') ?? false;
  }
}
