import { test, expect, Page } from '@playwright/test';
import { BridgeListPage } from './pages/BridgeListPage';
import { BridgeDetailPage } from './pages/BridgeDetailPage';
import { API_ROUTES, fulfillApiRoute, mockHealthAPI } from './support/apiMocks';

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

function formatSSE(events: unknown[]): string {
  return `${events.map((event) => `data: ${JSON.stringify(event)}`).join('\n\n')}\n\n`;
}

async function mockDemoAPI(page: Page, bridges = mockBridges) {
  await page.route(API_ROUTES.demo, async (route) => {
    await fulfillApiRoute(route, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bridges),
    });
  });
}

async function mockAnalyzeAPI(
  page: Page,
  report = mockAnalysisReport,
  { includeComplete = true }: { includeComplete?: boolean } = {},
) {
  const events: unknown[] = [
    { type: 'thinking_step', stage: 'vision', heading: '0', step: 'Analyzing Street View imagery...' },
    { type: 'thinking_step', stage: 'context', heading: null, step: 'Evaluating historical construction data...' },
    { type: 'thinking_step', stage: 'risk', heading: null, step: 'Calculating composite risk score...' },
  ];
  if (includeComplete) {
    events.push({ type: 'complete', report });
  }
  const body = formatSSE(events);

  await page.route(API_ROUTES.analyze, async (route) => {
    await fulfillApiRoute(route, {
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
      },
      body,
    });
  });
}

async function openFirstBridge(page: Page) {
  const bridgeButton = page.getByRole('button', { name: /view details for bridge/i }).first();
  await expect(bridgeButton).toBeVisible({ timeout: 5000 });
  await bridgeButton.click();
}

async function mockStreetViewImages(page: Page) {
  const image = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  );

  await page.route(API_ROUTES.images, async (route) => {
    await fulfillApiRoute(route, {
      headers: { 'Content-Type': 'image/png' },
      body: image,
    });
  });
}

test.describe('Bridge Analysis Flow', () => {
  let bridgeListPage: BridgeListPage;
  let bridgeDetailPage: BridgeDetailPage;

  test.beforeEach(async ({ page }) => {
    bridgeListPage = new BridgeListPage(page);
    bridgeDetailPage = new BridgeDetailPage(page);

    await mockHealthAPI(page);
    await mockDemoAPI(page);
    await mockAnalyzeAPI(page);
    await mockStreetViewImages(page);
    await page.goto('/');
  });

  test('should open bridge detail panel when bridge is selected from list', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await openFirstBridge(page);
    await expect(bridgeDetailPage.panel).toBeVisible({ timeout: 5000 });
  });

  test('should show Run Deep Analysis button in bridge detail panel', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await openFirstBridge(page);
    
    await expect(bridgeDetailPage.analyzeButton).toBeVisible({ timeout: 5000 });
  });

  test('should trigger deep analysis when Run Deep Analysis button is clicked', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await openFirstBridge(page);
    
    await bridgeDetailPage.runDeepAnalysis();
    
    await expect(bridgeDetailPage.analyzeButton).toBeHidden({ timeout: 10000 });
    await expect(bridgeDetailPage.riskTier).toBeVisible({ timeout: 10000 });
  });

  test('should display SSE progress updates (thinking steps) during analysis', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await openFirstBridge(page);
    await page.unroute(API_ROUTES.analyze);
    await mockAnalyzeAPI(page, mockAnalysisReport, { includeComplete: false });
    
    await bridgeDetailPage.runDeepAnalysis();
    
    await expect(page.getByText(/AI REASONING|VISION|CONTEXT|RISK/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should render final report with risk score and tier after analysis', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await openFirstBridge(page);
    
    await bridgeDetailPage.runDeepAnalysis();
    await bridgeDetailPage.waitForAnalysisComplete();
    
    await expect(bridgeDetailPage.riskTier).toBeVisible({ timeout: 10000 });
    await expect(bridgeDetailPage.riskScore).toBeVisible({ timeout: 10000 });
  });

  test('should display Street View images in report', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await openFirstBridge(page);
    
    await bridgeDetailPage.runDeepAnalysis();
    await bridgeDetailPage.waitForAnalysisComplete();
    
    await expect(bridgeDetailPage.streetViewImages.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show condition summary in report', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await openFirstBridge(page);
    
    await bridgeDetailPage.runDeepAnalysis();
    await bridgeDetailPage.waitForAnalysisComplete();
    
    await bridgeDetailPage.conditionSummary.scrollIntoViewIfNeeded().catch(() => {});
    await expect(bridgeDetailPage.conditionSummary).toBeVisible({ timeout: 10000 });
  });

  test('should display key risk factors in report', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await openFirstBridge(page);
    
    await bridgeDetailPage.runDeepAnalysis();
    await bridgeDetailPage.waitForAnalysisComplete();
    
    await bridgeDetailPage.keyRiskFactors.scrollIntoViewIfNeeded().catch(() => {});
    await expect(bridgeDetailPage.keyRiskFactors).toBeVisible({ timeout: 10000 });
  });

  test('should show recommended action in report', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await openFirstBridge(page);
    
    await bridgeDetailPage.runDeepAnalysis();
    await bridgeDetailPage.waitForAnalysisComplete();
    
    await bridgeDetailPage.recommendedAction.scrollIntoViewIfNeeded().catch(() => {});
    await expect(bridgeDetailPage.recommendedAction).toBeVisible({ timeout: 10000 });
  });

  test('should close bridge detail panel when close button is clicked', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await openFirstBridge(page);
    
    await expect(bridgeDetailPage.panel).toBeVisible({ timeout: 5000 });
    
    await bridgeDetailPage.close();
    await expect(bridgeDetailPage.analyzeButton).toBeHidden({ timeout: 5000 });
  });
});
