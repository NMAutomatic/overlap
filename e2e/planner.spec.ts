import { expect, test } from '@playwright/test';

type SharedPlan = {
  date: string;
  places: Array<{ zone: string; start: number; end: number }>;
  duration: number;
  index: number;
  weekdays: boolean;
};

const sharedPlan: SharedPlan = {
  date: '2026-09-21',
  places: [
    { zone: 'UTC', start: 540, end: 1080 },
    { zone: 'America/Toronto', start: 540, end: 1080 },
  ],
  duration: 60,
  index: 40,
  weekdays: false,
};

function planPath(plan: SharedPlan) {
  return `/overlap/#${encodeURIComponent(JSON.stringify(plan))}`;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('overlap-language-v1', 'en'));
});

test('copies a restorable share link and keeps edits after refresh', async ({ page }) => {
  await page.goto(planPath(sharedPlan));

  await expect(page.getByLabel('Duration')).toHaveValue('60');
  await page.getByRole('button', { name: 'Copy plan link' }).press('Enter');
  await expect(page.locator('#notice')).toContainText('Plan link copied');

  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(page.url());

  await page.getByLabel('Duration').selectOption('90');
  await expect(page.getByLabel('Duration')).toHaveValue('90');
  await page.reload();
  await expect(page.getByLabel('Duration')).toHaveValue('90');

  await page.goto('/overlap/#not-a-valid-plan');
  await expect(page.getByRole('alert')).toContainText('Shared plan not loaded');
  await expect(page.getByRole('button', { name: 'Continue with this plan' })).toBeVisible();
});

test('adds, rebases and removes cities without changing the meeting', async ({ page }) => {
  await page.goto(planPath({ ...sharedPlan, places: [sharedPlan.places[0]] }));

  await page.getByRole('button', { name: 'Add city' }).press('Enter');
  await expect(page.getByRole('searchbox', { name: 'Search city or time zone' })).toBeFocused();
  await page.getByRole('searchbox', { name: 'Search city or time zone' }).fill('Tokyo');
  await page.locator('[data-zone="Asia/Tokyo"]').press('Enter');

  await expect(page.locator('.city-row')).toHaveCount(2);
  await expect(page.getByLabel('Tokyo availability start')).toBeFocused();
  await expect(page.locator('.meeting-ticket')).toContainText('10:00 – 11:00');
  await expect(page.locator('.meeting-ticket')).toContainText('19:00 – 20:00');

  await page.getByRole('button', { name: 'Use Tokyo as base city' }).press('Enter');
  await expect(page.getByLabel('Planning date')).toBeFocused();
  await expect(page.locator('.city-row').first().locator('h3')).toContainText('Tokyo');
  await expect(page.locator('.city-row').first().locator('h3')).toContainText('BASE');
  await expect(page.locator('.meeting-ticket')).toContainText('10:00 – 11:00');
  await expect(page.locator('.meeting-ticket')).toContainText('19:00 – 20:00');

  await page.getByRole('button', { name: 'Remove UTC' }).press('Enter');
  await expect(page.locator('.city-row')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Add city' })).toBeFocused();
});

test('preserves focus through keyboard-driven rerenders', async ({ page }) => {
  await page.goto(planPath({ ...sharedPlan, places: [sharedPlan.places[0]] }));

  const globalPreset = page.getByRole('button', { name: 'Global team' });
  await globalPreset.press('Enter');
  await expect(globalPreset).toBeFocused();
  await expect(page.locator('.city-row')).toHaveCount(3);

  await page.getByRole('button', { name: 'Add availability window for Los Angeles' }).press('Enter');
  await expect(page.locator('[data-city="0"][data-window="1"][data-hours="start"]')).toBeFocused();
  await page.getByRole('button', { name: 'Remove window 2 for Los Angeles' }).press('Enter');
  await expect(page.getByRole('button', { name: 'Add availability window for Los Angeles' })).toBeFocused();

  await page.getByRole('button', { name: 'Chinese interface' }).press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('#language-toggle')).toBeFocused();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
});
