// e2e/decision-mode.spec.ts
import { expect, test } from '@playwright/test';

test.describe('Decision Mode E2E', () => {
  test('should switch decision mode and see badge update', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173');
    
    // Switch to Profile tab
    await page.getByRole('button', { name: 'Profile' }).click();
    
    // Verify heuristic is selected by default
    const decisionModeSelect = page.getByLabel('Decision mode');
    await expect(decisionModeSelect).toHaveValue('heuristic');
    
    // Change to hybrid_ml
    await decisionModeSelect.selectOption('hybrid_ml');
    
    // Switch back to Decider tab
    await page.getByRole('button', { name: 'Decider' }).click();
    
    // Verify badge shows "Hybrid ML"
    await expect(page.getByText('Hybrid ML')).toBeVisible();
    
    // Fill in some offer data
    await page.getByLabel('Offer payout ($)').fill('25');
    await page.getByLabel('Projected finish').fill('19:00');
    
    // Verify decision is still computed
    await expect(page.getByText(/ACCEPT|REJECT/)).toBeVisible();
    
    // Switch back to Profile tab to verify persistence
    await page.getByRole('button', { name: 'Profile' }).click();
    
    // Verify hybrid_ml is still selected
    await expect(decisionModeSelect).toHaveValue('hybrid_ml');
  });

  test('should show correct mode badge after page reload', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Set to hybrid_ml
    await page.getByRole('button', { name: 'Profile' }).click();
    await page.getByLabel('Decision mode').selectOption('hybrid_ml');
    
    // Reload page
    await page.reload();
    
    // Wait for app to load and switch to decider tab
    await page.getByRole('button', { name: 'Decider' }).click();
    
    // Verify badge persists
    await expect(page.getByText('Hybrid ML')).toBeVisible();
  });

  test('should work offline with heuristic mode', async ({ page, context }) => {
    await page.goto('http://localhost:5173');
    
    // Go offline
    await context.setOffline(true);
    
    // Verify app still works
    await page.getByLabel('Offer payout ($)').fill('20');
    await page.getByLabel('Projected finish').fill('18:30');
    
    // Should still compute decision
    await expect(page.getByText(/ACCEPT|REJECT/)).toBeVisible();
    
    // Switch to hybrid_ml while offline
    await page.getByRole('button', { name: 'Profile' }).click();
    await page.getByLabel('Decision mode').selectOption('hybrid_ml');
    await page.getByRole('button', { name: 'Decider' }).click();
    
    // Should show Hybrid ML badge even offline
    await expect(page.getByText('Hybrid ML')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
  });
});