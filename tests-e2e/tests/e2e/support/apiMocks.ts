import type { Page, Route } from '@playwright/test';

export const API_ROUTES = {
  analyze: /\/api(?:\/v1)?\/bridges\/[^/]+\/analyze(?:\?.*)?$/,
  analyzeImage: /\/api(?:\/v1)?\/analyze-image(?:\?.*)?$/,
  demo: /\/api(?:\/v1)?\/demo(?:\?.*)?$/,
  health: /\/health(?:\?.*)?$/,
  images: /\/api(?:\/v1)?\/images\//,
  scan: /\/api(?:\/v1)?\/scan(?:\?.*)?$/,
} as const;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

type MockRouteResponse = {
  body?: Buffer | string;
  headers?: Record<string, string>;
  status?: number;
};

export async function fulfillApiRoute(route: Route, response: MockRouteResponse): Promise<void> {
  if (route.request().method() === 'OPTIONS') {
    await route.fulfill({
      status: 204,
      headers: CORS_HEADERS,
    });
    return;
  }

  await route.fulfill({
    status: response.status ?? 200,
    headers: {
      ...CORS_HEADERS,
      ...response.headers,
    },
    body: response.body,
  });
}

export async function mockHealthAPI(page: Page): Promise<void> {
  await page.route(API_ROUTES.health, async (route) => {
    await fulfillApiRoute(route, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ok',
        version: '1.1.0',
        model: 'test',
        missing_keys: [],
      }),
    });
  });
}
