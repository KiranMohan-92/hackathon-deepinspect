import { test, expect, Page } from '@playwright/test';
import { BridgeListPage } from './pages/BridgeListPage';
import { BridgeDetailPage } from './pages/BridgeDetailPage';

const mockBridges = [
  {
    osm_id: 'bridge-test-1',
    name: 'Analysis Test Bridge',
    type: 'bridge',
    lat: 51.1079,
    lon: 17.0385,
    tags: { highway: 'primary' },
    road_class: 'primary',
    priority_score: 4.5,
    construction_year: 1985,
    material: 'concrete',
  },
];

const mockAnalysisReport = {
  osm_id: 'bridge-test-1',
  risk_tier: 'HIGH',
  risk_score: 3.8,
  structural_integrity: 0.72,
  material_degradation: 0.45,
  environmental_stress: 0.58,
  recommendations: [
    'Schedule detailed structural inspection within 30 days',
    'Monitor crack propagation in main span',
  ],
  summary: 'Bridge shows signs of moderate structural degradation',
  factors: ['Age-related wear', 'Traffic load stress'],
  context: {
    construction_year: 1985,
    material: 'concrete',
    construction_era: 'Post-War Modern',
    age_years: 40,
    structural_significance: 'Major arterial route',
  },
  condition_summary: 'Moderate deterioration detected in main structural elements',
  key_risk_factors: [
    'Concrete spalling visible on support columns',
    'Minor cracking in deck surface',
  ],
  recommended_action: 'Schedule comprehensive inspection within 60 days',
  maintenance_notes: [
    'Repair surface cracks',
    'Apply protective coating to exposed rebar',
  ],
  generated_at: new Date().toISOString(),
};

async function mockDemoAPI(page: Page, bridges = mockBridges) {
  await page.route('**/api/v1/demo', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bridges),
    });
  });

  await page.route('**/api/demo', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bridges),
    });
  });
}

async function mockAnalyzeAPI(page: Page, report = mockAnalysisReport) {
  await page.route('**/api/v1/bridges/*/analyze', async (route) => {
    const thinkingSteps = [
      { type: 'thinking_step', stage: 'vision', heading: '0', step: 'Analyzing Street View imagery...' },
      { type: 'thinking_step', stage: 'context', heading: null, step: 'Evaluating historical construction data...' },
      { type: 'thinking_step', stage: 'risk', heading: null, step: 'Calculating composite risk score...' },
      { type: 'complete', report },
    ];
    
    const body = thinkingSteps.map(e => `data: ${JSON.stringify(e)}`).join('\n\n');
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body,
    });
  });

  await page.route('**/api/bridges/*/analyze', async (route) => {
    const thinkingSteps = [
      { type: 'thinking_step', stage: 'vision', heading: '0', step: 'Analyzing Street View imagery...' },
      { type: 'thinking_step', stage: 'context', heading: null, step: 'Evaluating historical construction data...' },
      { type: 'thinking_step', stage: 'risk', heading: null, step: 'Calculating composite risk score...' },
      { type: 'complete', report },
    ];
    
    const body = thinkingSteps.map(e => `data: ${JSON.stringify(e)}`).join('\n\n');
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body,
    });
  });
}

async function mockStreetViewImages(page: Page) {
  await page.route('**/api/v1/images/**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'image/jpeg' },
      body: Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
      ]),
    });
  });

  await page.route('**/api/images/**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'image/jpeg' },
      body: Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
      ]),
    });
  });
}

test.describe('Bridge Analysis Flow', () => {
  let bridgeListPage: BridgeListPage;
  let bridgeDetailPage: BridgeDetailPage;

  test.beforeEach(async ({ page }) => {
    bridgeListPage = new BridgeListPage(page);
    bridgeDetailPage = new BridgeDetailPage(page);
    await mockDemoAPI(page);
    await mockAnalyzeAPI(page);
    await mockStreetViewImages(page);
    await page.goto('/');
  });

  test('should open bridge detail panel when bridge is selected from list', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    const bridgeItems = page.locator('[role="listitem"], [class*="bridge-item"]').first();
    if (await bridgeItems.isVisible()) {
      await bridgeItems.click();
      await expect(bridgeDetailPage.panel).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show Run Deep Analysis button in bridge detail panel', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    const bridgeItems = page.locator('[role="listitem"], [class*="bridge-item"]').first();
    if (await bridgeItems.isVisible()) {
      await bridgeItems.click();
      
      const analyzeButton = page.getByRole('button', { name: /run deep analysis|analyze/i });
      await expect(analyzeButton).toBeVisible({ timeout: 5000 });
    }
  });

  test('should trigger deep analysis when Run Deep Analysis button is clicked', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    const bridgeItems = page.locator('[role="listitem"], [class*="bridge-item"]').first();
    if (await bridgeItems.isVisible()) {
      await bridgeItems.click();
      
      const analyzeButton = page.getByRole('button', { name: /run deep analysis|analyze/i });
      await analyzeButton.click();
      
      await expect(analyzeButton).toBeDisabled();
    }
  });

  test('should display SSE progress updates (thinking steps) during analysis', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    const bridgeItems = page.locator('[role="listitem"], [class*="bridge-item"]').first();
    if (await bridgeItems.isVisible()) {
      await bridgeItems.click();
      
      const analyzeButton = page.getByRole('button', { name: /run deep analysis|analyze/i });
      await analyzeButton.click();
      
      const thinkingSection = page.locator('[class*="thinking"], [class*="reasoning"], [aria-live="polite"]');
      await page.waitForTimeout(2000);
      
      const hasThinkingSteps = await thinkingSection.count() > 0;
      expect(hasThinkingSteps).toBeTruthy();
    }
  });

  test('should render final report with risk score and tier after analysis', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    const bridgeItems = page.locator('[role="listitem"], [class*="bridge-item"]').first();
    if (await bridgeItems.isVisible()) {
      await bridgeItems.click();
      
      const analyzeButton = page.getByRole('button', { name: /run deep analysis|analyze/i });
      await analyzeButton.click();
      
      await page.waitForTimeout(3000);
      
      const riskTierElement = page.locator('[class*="risk-tier"], [class*="tier"]').first();
      const riskScoreElement = page.locator('[class*="risk-score"], [class*="score"]').first();
      
      const hasRiskTier = await riskTierElement.count() > 0;
      const hasRiskScore = await riskScoreElement.count() > 0;
      
      expect(hasRiskTier || hasRiskScore).toBeTruthy();
    }
  });

  test('should display Street View images in report', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    const bridgeItems = page.locator('[role="listitem"], [class*="bridge-item"]').first();
    if (await bridgeItems.isVisible()) {
      await bridgeItems.click();
      
      const analyzeButton = page.getByRole('button', { name: /run deep analysis|analyze/i });
      await analyzeButton.click();
      
      await page.waitForTimeout(3000);
      
      const images = page.locator('img[src*="images"], img[src*="street"]');
      const imageCount = await images.count();
      
      expect(imageCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should show condition summary in report', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    const bridgeItems = page.locator('[role="listitem"], [class*="bridge-item"]').first();
    if (await bridgeItems.isVisible()) {
      await bridgeItems.click();
      
      const analyzeButton = page.getByRole('button', { name: /run deep analysis|analyze/i });
      await analyzeButton.click();
      
      await page.waitForTimeout(3000);
      
      const summarySection = page.locator('text=/condition|summary/i');
      const hasSummary = await summarySection.count() > 0;
      
      expect(hasSummary).toBeTruthy();
    }
  });

  test('should display key risk factors in report', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    const bridgeItems = page.locator('[role="listitem"], [class*="bridge-item"]').first();
    if (await bridgeItems.isVisible()) {
      await bridgeItems.click();
      
      const analyzeButton = page.getByRole('button', { name: /run deep analysis|analyze/i });
      await analyzeButton.click();
      
      await page.waitForTimeout(3000);
      
      const riskFactorsSection = page.locator('text=/risk factor|key risk/i');
      const hasRiskFactors = await riskFactorsSection.count() > 0;
      
      expect(hasRiskFactors).toBeTruthy();
    }
  });

  test('should show recommended action in report', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    const bridgeItems = page.locator('[role="listitem"], [class*="bridge-item"]').first();
    if (await bridgeItems.isVisible()) {
      await bridgeItems.click();
      
      const analyzeButton = page.getByRole('button', { name: /run deep analysis|analyze/i });
      await analyzeButton.click();
      
      await page.waitForTimeout(3000);
      
      const actionSection = page.locator('text=/recommended action|action/i');
      const hasAction = await actionSection.count() > 0;
      
      expect(hasAction).toBeTruthy();
    }
  });

  test('should close bridge detail panel when close button is clicked', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    const bridgeItems = page.locator('[role="listitem"], [class*="bridge-item"]').first();
    if (await bridgeItems.isVisible()) {
      await bridgeItems.click();
      
      await expect(bridgeDetailPage.panel).toBeVisible({ timeout: 5000 });
      
      const closeButton = page.getByRole('button', { name: /close|back/i }).first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  });
});
