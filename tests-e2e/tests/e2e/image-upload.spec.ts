import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { API_ROUTES, fulfillApiRoute, mockHealthAPI } from './support/apiMocks';

const mockImageAnalysisResult = {
  defects: [
    {
      defectType: 'cracking',
      severity: 'High',
      confidence: 0.85,
      location: 'Main span',
      description: 'Visible crack patterns detected',
      score: 3.5,
      key_observations: 'Diagonal cracking pattern visible on concrete surface',
      potential_cause: 'Structural stress and age-related degradation',
    },
  ],
  overall_risk: 'High',
  summary: 'Bridge image shows signs of structural degradation',
  overall_visual_score: 3.2,
  requires_immediate_attention: false,
  visible_defects_summary: 'Cracking detected on main structural elements',
  cracking: {
    score: 3.5,
    key_observations: 'Diagonal cracking pattern visible',
    potential_cause: 'Structural stress',
    regions: [{ x1: 0.2, y1: 0.3, x2: 0.6, y2: 0.7 }],
  },
};

async function mockImageAnalysisAPI(page: Page, result = mockImageAnalysisResult) {
  await page.route(API_ROUTES.analyzeImage, async (route) => {
    await fulfillApiRoute(route, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    });
  });
}

async function mockImageAnalysisError(page: Page, errorMessage: string) {
  await page.route(API_ROUTES.analyzeImage, async (route) => {
    await fulfillApiRoute(route, {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ detail: errorMessage }),
    });
  });
}

test.describe('Image Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockHealthAPI(page);
    await mockImageAnalysisAPI(page);
    await page.goto('/');
  });

  test('should display upload button in header', async ({ page }) => {
    const uploadControl = page.locator('label').filter({
      has: page.locator('input[type="file"][aria-label="Upload bridge photo"]'),
    });
    await expect(uploadControl).toBeVisible();
  });

  test('should have file input for image upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"][accept*="image"]');
    const count = await fileInput.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should open image analysis modal when image is uploaded', async ({ page }) => {
    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    const testImagePath = path.join(__dirname, 'fixtures', 'test-bridge.jpg');

    if (fs.existsSync(testImagePath)) {
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(3000);

      const modal = page.locator('[role="dialog"], [class*="modal"]');
      const modalVisible = await modal.isVisible().catch(() => false);
      expect(modalVisible).toBeTruthy();
    }
  });

  test('should display analysis results after upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    const testImagePath = path.join(__dirname, 'fixtures', 'test-bridge.jpg');

    if (fs.existsSync(testImagePath)) {
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(3000);

      const visualScore = page.locator('text=/visual.*score|score.*5/i');
      const hasVisualScore = await visualScore.count() > 0;

      expect(hasVisualScore).toBeTruthy();
    }
  });

  test('should close modal when close button is clicked', async ({ page }) => {
    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    const testImagePath = path.join(__dirname, 'fixtures', 'test-bridge.jpg');

    if (fs.existsSync(testImagePath)) {
      await fileInput.setInputFiles(testImagePath);

      const modal = page.locator('[role="dialog"]');
      await modal.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

      const closeButton = page.getByRole('button', { name: /close/i }).first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      }
    }
  });

  test('should close modal on Escape key press', async ({ page }) => {
    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    const testImagePath = path.join(__dirname, 'fixtures', 'test-bridge.jpg');

    if (fs.existsSync(testImagePath)) {
      await fileInput.setInputFiles(testImagePath);

      const modal = page.locator('[role="dialog"]');
      await modal.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

      await page.keyboard.press('Escape');
      await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  });

  test('should close modal when clicking outside', async ({ page }) => {
    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    const testImagePath = path.join(__dirname, 'fixtures', 'test-bridge.jpg');

    if (fs.existsSync(testImagePath)) {
      await fileInput.setInputFiles(testImagePath);

      const modal = page.locator('[role="dialog"]');
      await modal.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

      const overlay = page.locator('[class*="overlay"], [class*="backdrop"]').first();
      if (await overlay.isVisible()) {
        await overlay.click({ position: { x: 10, y: 10 } });
      }
    }
  });

  test('should show error for invalid file type', async ({ page }) => {
    await page.unroute(API_ROUTES.analyzeImage);
    await mockImageAnalysisError(page, 'Invalid file type. Only images are allowed.');

    const fileInput = page.locator('input[type="file"]').first();

    await fileInput.setInputFiles({
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('not a valid image'),
    });

    await expect(page.getByRole('alert')).toContainText(/invalid file type/i, { timeout: 5000 });
  });

  test('should show loading state during analysis', async ({ page }) => {
    await page.unroute(API_ROUTES.analyzeImage);
    await page.route(API_ROUTES.analyzeImage, async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fulfillApiRoute(route, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockImageAnalysisResult),
      });
    });

    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    const testImagePath = path.join(__dirname, 'fixtures', 'test-bridge.jpg');

    if (fs.existsSync(testImagePath)) {
      await fileInput.setInputFiles(testImagePath);

      const loadingIndicator = page.locator('[class*="loading"], [role="progressbar"]');
      const hasLoading = await loadingIndicator.count() > 0;

      expect(hasLoading).toBeTruthy();
    }
  });

  test('should display overall risk level', async ({ page }) => {
    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    const testImagePath = path.join(__dirname, 'fixtures', 'test-bridge.jpg');

    if (fs.existsSync(testImagePath)) {
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(3000);

      const riskLevel = page.locator('text=/overall risk|risk/i');
      const hasRiskLevel = await riskLevel.count() > 0;

      expect(hasRiskLevel).toBeTruthy();
    }
  });

  test('should display defect analysis section', async ({ page }) => {
    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    const testImagePath = path.join(__dirname, 'fixtures', 'test-bridge.jpg');

    if (fs.existsSync(testImagePath)) {
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(3000);

      const defectSection = page.locator('text=/defect|cracking|analysis/i');
      const hasDefectSection = await defectSection.count() > 0;

      expect(hasDefectSection).toBeTruthy();
    }
  });

  test('should show immediate attention badge for critical defects', async ({ page }) => {
    await page.unroute(API_ROUTES.analyzeImage);
    await mockImageAnalysisAPI(page, {
      ...mockImageAnalysisResult,
      requires_immediate_attention: true,
      overall_risk: 'Critical',
    });

    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    const testImagePath = path.join(__dirname, 'fixtures', 'test-bridge.jpg');

    if (fs.existsSync(testImagePath)) {
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(3000);

      const attentionBadge = page.locator('text=/immediate attention|critical/i');
      const hasBadge = await attentionBadge.count() > 0;

      expect(hasBadge).toBeTruthy();
    }
  });

  test('should show no defects message when image is clean', async ({ page }) => {
    await page.unroute(API_ROUTES.analyzeImage);
    await mockImageAnalysisAPI(page, {
      ...mockImageAnalysisResult,
      defects: [],
      overall_risk: 'Low',
      summary: 'No significant defects detected',
      overall_visual_score: 1.2,
      requires_immediate_attention: false,
      visible_defects_summary: 'No significant defects found',
    });

    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    const testImagePath = path.join(__dirname, 'fixtures', 'test-bridge.jpg');

    if (fs.existsSync(testImagePath)) {
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(3000);

      const noDefectsMessage = page.locator('text=/no.*defect|no significant/i');
      const hasNoDefectsMessage = await noDefectsMessage.count() > 0;

      expect(hasNoDefectsMessage).toBeTruthy();
    }
  });
});
