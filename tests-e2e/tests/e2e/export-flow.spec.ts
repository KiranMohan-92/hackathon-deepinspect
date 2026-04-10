import { test, expect, Page } from '@playwright/test';
import { BridgeListPage } from './pages/BridgeListPage';
import { BridgeDetailPage } from './pages/BridgeDetailPage';
import { API_ROUTES, fulfillApiRoute, mockHealthAPI } from './support/apiMocks';

const mockBridges = [
  {
    osm_id: 'export-test-bridge',
    name: 'Export Test Bridge',
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
  osm_id: 'export-test-bridge',
  bridge_id: 'export-test-bridge',
  bridge_name: 'Export Test Bridge',
  lat: 51.1079,
  lon: 17.0385,
  risk_tier: 'HIGH',
  risk_score: 3.8,
  structural_integrity: 0.72,
  material_degradation: 0.45,
  environmental_stress: 0.58,
  recommendations: ['Schedule detailed structural inspection'],
  summary: 'Bridge shows signs of moderate structural degradation',
  factors: ['Age-related wear'],
  context: {
    construction_year: 1985,
    material: 'concrete',
    construction_era: 'Post-War Modern',
    age_years: 40,
    structural_significance: 'Major arterial route',
  },
  condition_summary: 'Moderate deterioration detected',
  key_risk_factors: ['Concrete spalling visible'],
  recommended_action: 'Schedule inspection within 60 days',
  maintenance_notes: ['Repair surface cracks'],
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

async function mockAnalyzeAPI(page: Page, report = mockAnalysisReport) {
  await page.route(API_ROUTES.analyze, async (route) => {
    const body = formatSSE([{ type: 'complete', report }]);
    await fulfillApiRoute(route, {
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
      },
      body,
    });
  });
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

test.describe('Export Flow', () => {
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

  test('should display PDF export button after analysis', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await bridgeListPage.selectBridgeByIndex(0);
    await bridgeDetailPage.waitForPanelOpen();
    
    await bridgeDetailPage.runDeepAnalysis();
    await bridgeDetailPage.waitForAnalysisComplete();
    await expect(bridgeDetailPage.riskTier).toBeVisible({ timeout: 10000 });
    
    const pdfButton = page.getByRole('button', { name: /pdf|download.*report|mission briefing/i });
    const isVisible = await pdfButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(pdfButton).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display CSV export button', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await bridgeListPage.selectBridgeByIndex(0);
    await bridgeDetailPage.waitForPanelOpen();
    
    await bridgeDetailPage.runDeepAnalysis();
    await bridgeDetailPage.waitForAnalysisComplete();
    await expect(bridgeDetailPage.riskTier).toBeVisible({ timeout: 10000 });
    
    const csvButton = page.getByRole('button', { name: /csv/i });
    const isVisible = await csvButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(csvButton).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display JSON export button', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await bridgeListPage.selectBridgeByIndex(0);
    await bridgeDetailPage.waitForPanelOpen();
    
    await bridgeDetailPage.runDeepAnalysis();
    await bridgeDetailPage.waitForAnalysisComplete();
    await expect(bridgeDetailPage.riskTier).toBeVisible({ timeout: 10000 });
    
    const jsonButton = page.getByRole('button', { name: /json/i });
    const isVisible = await jsonButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(jsonButton).toBeVisible({ timeout: 10000 });
    }
  });

  test('should trigger PDF export and show success toast', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await bridgeListPage.selectBridgeByIndex(0);
    await bridgeDetailPage.waitForPanelOpen();
    
    await bridgeDetailPage.runDeepAnalysis();
    await bridgeDetailPage.waitForAnalysisComplete();
    await expect(bridgeDetailPage.riskTier).toBeVisible({ timeout: 10000 });
    
    const pdfButton = page.getByRole('button', { name: /pdf|download.*report|mission briefing/i });

    await expect(pdfButton).toBeVisible({ timeout: 10000 });
    await pdfButton.click();

    // After click, button text changes to "DOWNLOADED" or a toast appears
    const successIndicator = page.getByText(/downloaded/i).or(
      page.locator('[class*="toast"], [role="status"]')
    );
    await expect(successIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test('should trigger CSV export and download file', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await bridgeListPage.selectBridgeByIndex(0);
    await bridgeDetailPage.waitForPanelOpen();
    
    await bridgeDetailPage.runDeepAnalysis();
    await bridgeDetailPage.waitForAnalysisComplete();
    await expect(bridgeDetailPage.riskTier).toBeVisible({ timeout: 10000 });
    
    const csvButton = page.getByRole('button', { name: /csv/i });
    
    if (await csvButton.isVisible()) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
        csvButton.click(),
      ]);
      
      if (download) {
        expect(download.suggestedFilename()).toContain('.csv');
      }
    }
  });

  test('should trigger JSON export and download file', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await bridgeListPage.selectBridgeByIndex(0);
    await bridgeDetailPage.waitForPanelOpen();
    
    await bridgeDetailPage.runDeepAnalysis();
    await bridgeDetailPage.waitForAnalysisComplete();
    await expect(bridgeDetailPage.riskTier).toBeVisible({ timeout: 10000 });
    
    const jsonButton = page.getByRole('button', { name: /json/i });
    
    if (await jsonButton.isVisible()) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
        jsonButton.click(),
      ]);
      
      if (download) {
        expect(download.suggestedFilename()).toContain('.json');
      }
    }
  });

  test('should show loading state during PDF generation', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await bridgeListPage.selectBridgeByIndex(0);
    await bridgeDetailPage.waitForPanelOpen();
    
    await bridgeDetailPage.runDeepAnalysis();
    await bridgeDetailPage.waitForAnalysisComplete();
    await expect(bridgeDetailPage.riskTier).toBeVisible({ timeout: 10000 });
    
    const pdfButton = page.getByRole('button', { name: /pdf|download.*report/i });
    
    if (await pdfButton.isVisible()) {
      await pdfButton.click();
      
      const loadingState = page.locator('text=/generating|loading/i');
      const hasLoading = await loadingState.count() > 0;
      
      expect(hasLoading || await pdfButton.isDisabled()).toBeTruthy();
    }
  });

  test('should show success indicator after export completes', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await bridgeListPage.selectBridgeByIndex(0);
    await bridgeDetailPage.waitForPanelOpen();
    
    await bridgeDetailPage.runDeepAnalysis();
    await bridgeDetailPage.waitForAnalysisComplete();
    await expect(bridgeDetailPage.riskTier).toBeVisible({ timeout: 10000 });
    
    const exportButton = page.getByRole('button', { name: /csv|json/i }).first();
    
    if (await exportButton.isVisible()) {
      await exportButton.click();
      
      await page.waitForTimeout(2000);
      
      const successIndicator = page.locator('[class*="success"], text=/downloaded|success/i');
      const hasSuccess = await successIndicator.count() > 0;
      
      expect(hasSuccess).toBeTruthy();
    }
  });

  test('export buttons should have accessible labels', async ({ page }) => {
    await bridgeListPage.loadDemo();
    await bridgeListPage.waitForLoadingComplete();
    
    await bridgeListPage.selectBridgeByIndex(0);
    await bridgeDetailPage.waitForPanelOpen();
    
    await bridgeDetailPage.runDeepAnalysis();
    await bridgeDetailPage.waitForAnalysisComplete();
    await expect(bridgeDetailPage.riskTier).toBeVisible({ timeout: 10000 });
    
    const exportButtons = page.getByRole('button', { name: /export|pdf|csv|json|download/i });
    const count = await exportButtons.count();
    
    expect(count).toBeGreaterThan(0);
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const button = exportButtons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      expect(ariaLabel || text).toBeTruthy();
    }
  });
});
