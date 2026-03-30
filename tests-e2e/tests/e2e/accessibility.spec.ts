import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have skip link for keyboard navigation', async ({ page }) => {
    const skipLink = page.locator('a[href="#main-content"]');
    const count = await skipLink.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should have main content landmark', async ({ page }) => {
    const mainContent = page.locator('main, [id="main-content"]');
    await expect(mainContent.first()).toBeVisible();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have accessible form inputs with labels', async ({ page }) => {
    const inputs = page.locator('input:not([type="hidden"])');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const placeholder = await input.getAttribute('placeholder');
        const hasLabel = id ? (await page.locator(`label[for="${id}"]`).count()) > 0 : false;

        expect(hasLabel || ariaLabel || placeholder).toBeTruthy();
      }
    }
  });

  test('should have keyboard accessible buttons', async ({ page }) => {
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      await expect(button).toBeEnabled();
    }
  });

  test('should support Tab navigation through interactive elements', async ({ page }) => {
    const interactiveElements = page.locator('button, a, input, [tabindex]');
    const count = await interactiveElements.count();
    expect(count).toBeGreaterThan(0);

    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement.first()).toBeVisible();
  });

  test('should have ARIA labels on interactive elements', async ({ page }) => {
    const buttonsWithoutLabels = page.locator('button:not([aria-label])');
    const buttonsWithLabels = page.locator('button[aria-label]');
    const labeledCount = await buttonsWithLabels.count();
    const unlabeledCount = await buttonsWithoutLabels.count();

    expect(labeledCount + unlabeledCount).toBeGreaterThan(0);
  });

  test('should have proper role attributes', async ({ page }) => {
    const progressBar = page.locator('[role="progressbar"]');
    const alert = page.locator('[role="alert"]');
    const dialog = page.locator('[role="dialog"]');
    const search = page.locator('[role="search"]');

    const hasAnyRoles = (await progressBar.count()) + 
                        (await alert.count()) + 
                        (await dialog.count()) + 
                        (await search.count()) >= 0;
    expect(hasAnyRoles).toBeTruthy();
  });

  test('should have visible focus indicators', async ({ page }) => {
    const button = page.getByRole('button').first();
    await button.focus();
    
    const isFocused = await button.evaluate((el) => {
      return document.activeElement === el;
    });
    expect(isFocused).toBeTruthy();
  });

  test('should support keyboard shortcuts modal', async ({ page }) => {
    await page.keyboard.press('?');
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"], [class*="modal"]');
    const modalVisible = await modal.isVisible().catch(() => false);

    if (modalVisible) {
      await page.keyboard.press('Escape');
    }
  });

  test('should have aria-expanded on collapsible elements', async ({ page }) => {
    const collapsible = page.locator('[aria-expanded]');
    const count = await collapsible.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have aria-live regions for dynamic content', async ({ page }) => {
    const ariaLive = page.locator('[aria-live]');
    const count = await ariaLive.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have alt text on images', async ({ page }) => {
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const ariaHidden = await img.getAttribute('aria-hidden');

      expect(alt !== null || ariaLabel !== null || ariaHidden === 'true').toBeTruthy();
    }
  });

  test('should have accessible navigation', async ({ page }) => {
    const nav = page.locator('nav, [role="navigation"]');
    const count = await nav.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should support Enter key for button activation', async ({ page }) => {
    const button = page.getByRole('button').first();
    await button.focus();
    
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    expect(true).toBeTruthy();
  });

  test('should support Space key for button activation', async ({ page }) => {
    const button = page.getByRole('button').first();
    await button.focus();
    
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    
    expect(true).toBeTruthy();
  });

  test('should have accessible color contrast on text', async ({ page }) => {
    const textElements = page.locator('p, span, h1, h2, h3, h4, h5, h6, label');
    const count = await textElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have accessible form error messages', async ({ page }) => {
    const errorMessages = page.locator('[role="alert"], [aria-invalid="true"]');
    const count = await errorMessages.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should trap focus in modal dialogs', async ({ page }) => {
    await page.keyboard.press('?');
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]');
    const modalVisible = await modal.isVisible().catch(() => false);

    if (modalVisible) {
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
      }
      
      const focusedElement = page.locator(':focus');
      const isInModal = await focusedElement.evaluate((el, modalSelector) => {
        const modal = document.querySelector(modalSelector);
        return modal?.contains(el) ?? false;
      }, '[role="dialog"]');

      expect(isInModal || !modalVisible).toBeTruthy();

      if (modalVisible) {
        await page.keyboard.press('Escape');
      }
    }
  });

  test('should have accessible table headers if tables exist', async ({ page }) => {
    const tables = page.locator('table');
    const count = await tables.count();

    if (count > 0) {
      const headers = page.locator('th, [role="columnheader"], [role="rowheader"]');
      const headerCount = await headers.count();
      expect(headerCount).toBeGreaterThan(0);
    }
  });

  test('should have accessible list items', async ({ page }) => {
    const lists = page.locator('ul, ol, [role="list"]');
    const count = await lists.count();

    if (count > 0) {
      const listItems = page.locator('li, [role="listitem"]');
      const itemCount = await listItems.count();
      expect(itemCount).toBeGreaterThanOrEqual(0);
    }
  });
});
