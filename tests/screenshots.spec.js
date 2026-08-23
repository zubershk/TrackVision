import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, '..', 'documentation', 'blackbook', 'figures');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('TrackVision Screenshot Capture', () => {
  test('capture landing page and UI screenshots', async ({ page }) => {
    // Navigate to the running preview server
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for landing page to load
    await page.waitForSelector('text=TrackVision', { timeout: 30000 });
    console.log('Landing page loaded');
    
    // Screenshot 1: Landing page
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-landing-page.png'), fullPage: true });
    console.log('Captured: 01-landing-page.png');
    
    // Click "Launch Command Center" to enter the app
    const launchBtn = page.locator('button:has-text("Launch Command Center")').first();
    if (await launchBtn.count() > 0) {
      await launchBtn.click();
      console.log('Clicked Launch Command Center');
    } else {
      // Fallback: any button with CPU icon or similar
      await page.locator('button').first().click();
    }
    
    // Wait for Command Center to load
    await page.waitForTimeout(3000);
    
    // Screenshot 2: Command Center initial state (Standby)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-command-center-standby.png'), fullPage: true });
    console.log('Captured: 02-command-center-standby.png');
    
    // Wait for models to load (the boot sequence)
    await page.waitForTimeout(10000);
    
    // Screenshot 3: Command Center ready state (models loaded, waiting to start)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-command-center-ready.png'), fullPage: true });
    console.log('Captured: 03-command-center-ready.png');
    
    // Screenshot 4: Vision Panel (click Vision tab)
    const visionTab = page.locator('[role="tab"]:has-text("Vision")').first();
    if (await visionTab.count() > 0) {
      await visionTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-vision-panel.png'), fullPage: true });
      console.log('Captured: 04-vision-panel.png');
    }
    
    // Screenshot 5: Analytics/Settings Panel
    const settingsTab = page.locator('[role="tab"]:has-text("Analytics")').first();
    if (await settingsTab.count() > 0) {
      await settingsTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-analytics-panel.png'), fullPage: true });
      console.log('Captured: 05-analytics-panel.png');
    }
    
    // Screenshot 6: Tracks/Track Inspector Panel
    const tracksTab = page.locator('[role="tab"]:has-text("Tracks")').first();
    if (await tracksTab.count() > 0) {
      await tracksTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-track-inspector.png'), fullPage: true });
      console.log('Captured: 06-track-inspector.png');
    }
    
    // Screenshot 7: Scene Map Panel
    const sceneTab = page.locator('[role="tab"]:has-text("Scene")').first();
    if (await sceneTab.count() > 0) {
      await sceneTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-scene-map.png'), fullPage: true });
      console.log('Captured: 07-scene-map.png');
    }
    
    // Screenshot 8: Timeline/History Panel
    const historyTab = page.locator('[role="tab"]:has-text("History")').first();
    if (await historyTab.count() > 0) {
      await historyTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-timeline.png'), fullPage: true });
      console.log('Captured: 08-timeline.png');
    }
    
    // Screenshot 9: Live tab (main view with camera placeholder)
    const liveTab = page.locator('[role="tab"]:has-text("Live")').first();
    if (await liveTab.count() > 0) {
      await liveTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-live-view.png'), fullPage: true });
      console.log('Captured: 09-live-view.png');
    }
    
    // Screenshot 10: Command Palette (Ctrl+K)
    await page.keyboard.press('Control+K');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-command-palette.png'), fullPage: true });
    console.log('Captured: 10-command-palette.png');
    
    // Screenshot 11: Mobile responsive view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-mobile-view.png'), fullPage: true });
    console.log('Captured: 11-mobile-view.png');
    
    // Restore desktop view for final composite
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    
    // Screenshot 12: Final composite (Live view with all UI elements)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12-final-composite.png'), fullPage: true });
    console.log('Captured: 12-final-composite.png');
    
    console.log('All available UI screenshots captured successfully!');
    console.log('Note: Actual tracking output screenshots require live camera feed and are marked as placeholders in FIGURE_MANIFEST.md');
  });
});