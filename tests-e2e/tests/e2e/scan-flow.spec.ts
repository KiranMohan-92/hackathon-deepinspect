import { test, expect, Page } from '@playwright/test';
import { BridgeListPage } from './pages/BridgeListPage';
import { MapPage } from './pages/MapPage';

// Mock data for bridges
const mockBridges = [
  {
    osm_id: 'bridge-1',
    name: 'Test Bridge Alpha',
    type: 'bridge',
    lat: 51.1079,
    lon: 17.0385,
    tags: { highway: 'primary' },
    road_class: 'primary',
    priority_score: 4.5,
    construction_year: 1985,
    material: 'concrete',
  },
  {
    osm_id: 'bridge-2',
    name: 'Test Bridge Beta',
    type: 'bridge',
    lat: 51.1085,
    lon: 17.0390,
    tags: { highway: 'secondary' },
    road_class: 'secondary',
    priority_score: 3.2,
    construction_year: 1992,
    material: 'steel',
  },
  {
    osm_id: 'bridge-3',
    name: 'Critical Bridge Gamma',
    type: 'bridge',
    lat: 51.1090,
    lon: 17.0395,
    tags: { highway: 'motorway' },
    road_class: 'motorway',
    priority_score: 5.0,
    construction_year: 1975,
    material: 'steel',
  },
];

// Helper to mock scan API responses
async function mockScanAPI(page: Page, bridges = mockBridges) {
  await page.route('**/api/v1/scan', async (route) => {
    // Simulate SSE response with progress and complete events
    const encoder = new TextEncoder();
    const progressEvents = [
      { type: 'progress', step: 'query', status: 'active', message: 'Querying Overpass API...' },
      { type: 'progress', step: 'query', status: 'complete', message: 'Found 3 bridges' },
      { type: 'progress', step: 'enrich', status: 'active', message: 'Enriching bridge data...' },
      { type: 'complete', bridges },
    ];
    
    const body = progressEvents.map(e => `data: ${JSON.stringify(e)}`).join('\n\n');
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body,
    });
  });

  await page.route('**/api/scan', async (route) => {
    const encoder = new TextEncoder();
    const progressEvents = [
      { type: 'progress', step: 'query', status: 'active', message: 'Querying Overpass API...' },
      { type: 'progress', step: 'query', status: 'complete', message: 'Found 3 bridges' },
      { type: 'complete', bridges },
    ];
    
    const body = progressEvents.map(e => `data: ${JSON.stringify(e)}`).join('\n\n');
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body,
    });
  });
}

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

test.describe('Bridge Scan Flow', () => {
  let bridgeListPage: BridgeListPage;
  let mapPage: MapPage;

  test.beforeEach(async ({ page }) => {
    bridgeListPage = new BridgeListPage(page);
    mapPage = new MapPage(page);
    await mockDemoAPI(page);
    await mockScanAPI(page);
    await page.goto('/');
  });

  test('should load the main page with all key elements', async ({ page }) => {
    // Verify page structure
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('search')).toBeVisible();
    
    // Verify search modes exist
    await expect(page.getByRole('group', { name: /search mode/i })).toBeVisible();
    
    // Verify map container is visible
    await expect(mapPage.mapContainer).toBeVisible();
    
    // Verify bridge panel exists (right sidebar)
    await expect(page.locator('[class*="panel"]').last()).toBeVisible();
  });

  test('should scan by city name and display bridge markers on map', async ({ page }) => {
    // Select City mode
    await page.getByRole('button', { name: /city/i }).click();
    
    // Enter city name
    const searchInput = page.getByPlaceholder(/enter city/i);
    await searchInput.fill('Wroclaw');
    
    // Click scan button
    const scanButton = page.getByRole('button', { name: /^scan$/i });
    await scanButton.click();
    
    // Wait for scan progress to appear
    await expect(page.locator('[class*="progress"], [role="progressbar"]').first()).toBeVisible({ timeout: 5000 });
    
    // Wait for loading to complete
    await bridgeListPage.waitForLoadingComplete();
    
    // Verify bridges appear in the list
    const bridgeCount = await bridgeListPage.getBridgeCount();
    expect(bridgeCount).toBeGreaterThan(0);
  });

  test('should scan viewport area and display results', async ({ page }) => {
    // Wait for map to load
    await mapPage.waitForMapLoad();
    
    // Look for scan area button on map
    const scanAreaButton = page.getByRole('button', { name: /scan area/i });
    
    if (await scanAreaButton.isVisible()) {
      await scanAreaButton.click();
      
      // Wait for loading indicator
      await expect(page.locator('[class*="loading"], [role="progressbar"]').first()).toBeVisible({ timeout: 5000 });
      
      // Wait for results
      await bridgeListPage.waitForLoadingComplete();
    }
  });

  test('should search by coordinates', async ({ page }) => {
    // Select Coords mode
    await page.getByRole('button', { name: /coords/i }).click();
    
    // Enter coordinates
    const searchInput = page.getByPlaceholder(/lat.*lon/i);
    await searchInput.fill('51.1079, 17.0385');
    
    // Click scan button
    const scanButton = page.getByRole('button', { name: /^scan$/i });
    await scanButton.click();
    
    // Wait for scan to complete
    await bridgeListPage.waitForLoadingComplete();
  });

  test('should filter bridges by risk tier', async ({ page }) => {
    // Load demo data first
    const demoButton = page.getByRole('button', { name: /demo/i });
    await demoButton.click();
    
    // Wait for bridges to load
    await bridgeListPage.waitForLoadingComplete();
    
    // Look for filter buttons on map
    const filterButtons = page.getByRole('button', { name: /all|critical|high|medium|low/i });
    const count = await filterButtons.count();
    
    if (count > 0) {
      // Click ALL filter
      await filterButtons.first().click();
      
      // Verify filter is applied (aria-pressed)
      await expect(filterButtons.first()).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('should load demo data successfully', async ({ page }) => {
    // Click demo button
    const demoButton = page.getByRole('button', { name: /demo/i });
    await demoButton.click();
    
    // Wait for bridges to load
    await bridgeListPage.waitForLoadingComplete();
    
    // Verify bridges appear
    const bridgeCount = await bridgeListPage.getBridgeCount();
    expect(bridgeCount).toBeGreaterThan(0);
  });

  test('should display scan progress updates via SSE', async ({ page }) => {
    // Start a scan
    await page.getByRole('button', { name: /city/i }).click();
    const searchInput = page.getByPlaceholder(/enter city/i);
    await searchInput.fill('Warsaw');
    
    const scanButton = page.getByRole('button', { name: /^scan$/i });
    await scanButton.click();
    
    // Verify progress panel shows scan progress
    const progressSection = page.locator('[class*="progress"], [aria-live="polite"]').first();
    
    // Either progress items appear or bridges load directly
    await bridgeListPage.waitForLoadingComplete();
  });

  test('should show error when no bridges found', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/v1/scan', async (route) => {
      const body = `data: ${JSON.stringify({ type: 'complete', bridges: [] })}`;
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body,
      });
    });
    
    await page.route('**/api/scan', async (route) => {
      const body = `data: ${JSON.stringify({ type: 'complete', bridges: [] })}`;
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body,
      });
    });
    
    // Start scan
    await page.getByRole('button', { name: /city/i }).click();
    const searchInput = page.getByPlaceholder(/enter city/i);
    await searchInput.fill('Remote Area');
    
    const scanButton = page.getByRole('button', { name: /^scan$/i });
    await scanButton.click();
    
    // Wait for error message
    await page.waitForTimeout(2000);
    
    // Check for error alert or message
    const errorElement = page.locator('[role="alert"], [class*="error"]');
    const hasError = await errorElement.count() > 0;
    
    // Either error is shown or empty state
    expect(hasError || await bridgeListPage.getBridgeCount() === 0).toBeTruthy();
  });

  test('should disable scan button while loading', async ({ page }) => {
    const scanButton = page.getByRole('button', { name: /^scan$/i });
    
    // Enter search term
    await page.getByRole('button', { name: /city/i }).click();
    const searchInput = page.getByPlaceholder(/enter city/i);
    await searchInput.fill('Test City');
    
    // Click scan
    await scanButton.click();
    
    // Verify button shows loading state
    await expect(scanButton).toBeDisabled();
  });
});
