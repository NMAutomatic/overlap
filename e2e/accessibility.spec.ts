import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const plan = {
  date: '2026-09-21',
  places: [
    { zone: 'UTC', start: 540, end: 1080 },
    { zone: 'America/Toronto', start: 540, end: 1080 },
  ],
  duration: 60,
  index: 40,
  weekdays: false,
};
const planPath = `/overlap/#${encodeURIComponent(JSON.stringify(plan))}`;

async function expectNoWcagViolations(page: Page, state: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const summary = violations.map(violation => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.map(node => node.target),
  }));
  expect(violations, `${state}: ${JSON.stringify(summary, null, 2)}`).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('overlap-language-v1', 'en'));
  await page.goto(planPath);
  await expect(page.getByRole('region', { name: 'Time zone planner' })).toBeVisible();
});

test('planner has no detectable WCAG A or AA violations in both languages', async ({ page }) => {
  await expectNoWcagViolations(page, 'English planner');

  await page.getByRole('button', { name: 'Chinese interface' }).press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expectNoWcagViolations(page, 'Chinese planner');
});

test('primary dialogs have no detectable WCAG A or AA violations', async ({ page }) => {
  const dialogs = [
    { trigger: 'Add city', dialog: 'Add a city' },
    { trigger: 'My saved plans', dialog: 'My saved plans' },
    { trigger: 'Compare 7 days', dialog: 'Find a day that works.' },
  ];

  for (const { trigger, dialog } of dialogs) {
    await page.getByRole('button', { name: trigger }).press('Enter');
    await expect(page.getByRole('dialog', { name: dialog })).toBeVisible();
    await expectNoWcagViolations(page, `${dialog} dialog`);
    await page.keyboard.press('Escape');
  }

  await page.locator('#share-dialog').evaluate((element: HTMLDialogElement) => element.showModal());
  await expect(page.getByRole('dialog', { name: 'Your plan link' })).toBeVisible();
  await expectNoWcagViolations(page, 'Share link dialog');
});
