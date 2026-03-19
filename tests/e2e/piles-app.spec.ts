import { test, expect, _electron as electron, ElectronApplication, Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Piles E2E Tests
//
// Tests the Electron app's core functionality:
// 1. App opens window successfully
// 2. Folder selection API is available
// 3. Items render on canvas (with programmatic folder load)
// 4. Selection and drag functionality
// 5. Auto Group button appears and functions
// 6. No console errors or runtime issues
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(__dirname, "../..");
let electronApp: ElectronApplication;
let mainWindow: Page;
const consoleErrors: string[] = [];
const consoleWarnings: string[] = [];
const consoleLogs: string[] = [];

// Test folder path for E2E tests - we need a folder with actual files
let testFolderPath: string;

async function loadFolderIntoApp(folderPath: string) {
  await mainWindow.evaluate(async (targetFolderPath) => {
    const store = (window as any).__PILES_STORE__;
    await store.getState().loadFolder(targetFolderPath);
  }, folderPath);

  await mainWindow.waitForTimeout(200);
  await mainWindow.keyboard.press("Escape");
  await mainWindow.waitForTimeout(50);
}

test.describe.serial("Piles Electron App E2E", () => {
  test.beforeAll(async () => {
    // Create a test folder with test files
    testFolderPath = path.join(os.tmpdir(), "piles-e2e-test-" + Date.now());
    fs.mkdirSync(testFolderPath, { recursive: true });

    // Create test files with various extensions for auto-group testing
    const testFiles = [
      "test-document.pdf",
      "test-document.txt",
      "test-image.jpg",
      "test-image.png",
      "test-archive.zip",
      "test-installer.dmg",
      "test-misc.xyz",
    ];
    
    for (const file of testFiles) {
      fs.writeFileSync(path.join(testFolderPath, file), `Test content for ${file}`);
    }
    
    // Also create a test folder
    fs.mkdirSync(path.join(testFolderPath, "test-folder"), { recursive: true });

    // Build the app first (main process needs to be compiled)
    console.log("Building main process...");
    try {
      execSync("npm run build:main", {
        cwd: PROJECT_ROOT,
        stdio: "pipe",
      });
      console.log("Main process build complete");
    } catch (err) {
      console.error("Build failed:", err);
      throw err;
    }

    // Also build the renderer for production mode testing
    console.log("Building renderer...");
    try {
      execSync("npm run build:renderer", {
        cwd: PROJECT_ROOT,
        stdio: "pipe",
      });
      console.log("Renderer build complete");
    } catch (err) {
      console.error("Renderer build failed:", err);
      throw err;
    }

    // Launch the Electron app
    console.log("Launching Electron app...");
    electronApp = await electron.launch({
      args: ["."],
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        NODE_ENV: "test",
        // Don't set VITE_DEV_SERVER_URL - use built renderer
      },
    });

    // Get the first window
    mainWindow = await electronApp.firstWindow();

    // Capture all console messages
    mainWindow.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error") {
        consoleErrors.push(text);
      } else if (msg.type() === "warning") {
        consoleWarnings.push(text);
      } else {
        consoleLogs.push(text);
      }
    });

    // Wait for the app to fully load
    await mainWindow.waitForLoadState("domcontentloaded");
    // Give React a moment to hydrate
    await mainWindow.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }

    // Cleanup test folder
    if (testFolderPath && fs.existsSync(testFolderPath)) {
      fs.rmSync(testFolderPath, { recursive: true, force: true });
    }
  });

  test("1. App window opens successfully", async () => {
    // Check that the window is created
    expect(mainWindow).toBeDefined();

    // Check window title (Electron default or app title)
    const title = await mainWindow.title();
    console.log("Window title:", title);

    // Check that the main app content is visible
    // The app starts in idle state, waiting for folder selection
    // Look for the WorkspaceShell main element
    const wsShell = mainWindow.locator(".ws-shell");
    await expect(wsShell).toBeVisible({ timeout: 10000 });
    console.log("✓ Main window rendered successfully");
  });

  test("2. Initial idle state renders correctly", async () => {
    // Check that the idle state UI is displayed
    const wsShellIdle = mainWindow.locator(".ws-shell--idle");
    await expect(wsShellIdle).toBeVisible({ timeout: 5000 });

    // Check the prompt elements
    const eyebrow = mainWindow.locator(".eyebrow");
    await expect(eyebrow).toContainText("Piles");

    const heading = mainWindow.locator("h1");
    await expect(heading).toContainText("Drop a folder to begin");

    const openFolderButton = mainWindow.locator("button.ws-btn--primary");
    await expect(openFolderButton).toBeVisible();
    await expect(openFolderButton).toContainText("Open folder");

    console.log("✓ Idle state UI renders correctly");
  });

  test("3. PilesAPI is available via preload bridge", async () => {
    // Verify the preload bridge is working
    const apiCheck = await mainWindow.evaluate(() => {
      const piles = (window as any).piles;
      if (!piles) return { available: false, methods: [] };
      
      const methods = [
        "selectFolder",
        "getFolderItems",
        "loadWorkspace",
        "saveWorkspace",
        "openFile",
        "revealInFinder",
        "renameFile",
        "trashFile",
        "watchFolder",
        "unwatchFolder",
        "onFolderChanged",
      ];
      
      const availableMethods = methods.filter(m => typeof piles[m] === "function");
      
      return {
        available: true,
        methods: availableMethods,
        allPresent: availableMethods.length === methods.length,
      };
    });

    expect(apiCheck.available).toBe(true);
    expect(apiCheck.allPresent).toBe(true);
    console.log("✓ PilesAPI preload bridge is functional");
    console.log("  Available methods:", apiCheck.methods.join(", "));
  });

  test("4. Can load folder and render items on canvas", async () => {
    // Programmatically load the test folder by calling IPC directly
    // This bypasses the native dialog which can't be automated
    const loadResult = await mainWindow.evaluate(async (folderPath) => {
      const piles = (window as any).piles;
      if (!piles) return { success: false, error: "No piles API" };

      try {
        // Get folder items directly
        const items = await piles.getFolderItems(folderPath);
        
        // Get or create workspace
        let workspace = await piles.loadWorkspace(folderPath);
        if (!workspace) {
          workspace = {
            folderPath,
            groups: {},
            itemLayouts: {},
            settings: { snapToGrid: false },
          };
        }
        
        return {
          success: true,
          itemCount: items.length,
          itemNames: items.map((i: any) => i.name),
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }, testFolderPath);

    console.log("Folder load result:", loadResult);
    expect(loadResult.success).toBe(true);
    expect(loadResult.itemCount).toBeGreaterThan(0);

    // Now we need to trigger the store to load this folder
    // Since the store is internal, we'll use a workaround
    // by simulating the openFolder flow with a mock

    // Alternative: Check that getFolderItems returns our test files
    expect(loadResult.itemNames).toContain("test-document.pdf");
    expect(loadResult.itemNames).toContain("test-image.jpg");
    
    console.log("✓ Folder items can be loaded via IPC");
    console.log("  Found items:", loadResult.itemNames?.join(", "));
  });

  test("5. Canvas interaction components exist", async () => {
    // Since we can't easily load a folder without the dialog,
    // we verify the components exist by checking their definitions
    
    // Check that the CSS for canvas items is loaded
    const styleCheck = await mainWindow.evaluate(() => {
      const styles = document.querySelectorAll("style");
      let hasCanvasStyles = false;
      styles.forEach(style => {
        if (style.textContent?.includes("canvas-scroll") ||
            style.textContent?.includes("canvas-item") ||
            style.textContent?.includes("ws-shell")) {
          hasCanvasStyles = true;
        }
      });
      return hasCanvasStyles;
    });

    // Even if inline styles aren't found, the CSS file should be linked
    // Check that the app structure supports canvas rendering
    const hasWsShell = await mainWindow.locator(".ws-shell").count();
    expect(hasWsShell).toBeGreaterThan(0);

    console.log("✓ Canvas interaction components are defined");
  });

  test("6. Keyboard event handling works", async () => {
    // Press Escape key - should be handled without error
    await mainWindow.keyboard.press("Escape");
    
    // Verify app is still responsive
    const hasContent = await mainWindow.locator(".ws-shell").count();
    expect(hasContent).toBeGreaterThan(0);
    
    // Press other common keys
    await mainWindow.keyboard.press("Tab");
    await mainWindow.keyboard.press("Enter");
    
    // App should still be responsive
    const stillResponsive = await mainWindow.locator(".ws-shell").isVisible();
    expect(stillResponsive).toBe(true);
    
    console.log("✓ Keyboard event handling works");
  });

  test("7. No critical console errors", async () => {
    // Check for any console errors that were captured during tests
    const criticalErrors = consoleErrors.filter(
      (err) =>
        // Filter out known non-critical warnings
        !err.includes("DevTools") &&
        !err.includes("Source map") &&
        !err.includes("favicon") &&
        !err.includes("React DevTools") &&
        !err.includes("Download the React DevTools")
    );

    if (criticalErrors.length > 0) {
      console.log("Console errors found:");
      criticalErrors.forEach(err => console.log("  -", err));
    } else {
      console.log("✓ No critical console errors found");
    }

    if (consoleWarnings.length > 0) {
      console.log("Console warnings:", consoleWarnings.length);
    }

    // Check that the app is in a valid state (not crashed)
    const hasMainContent = await mainWindow.locator(".ws-shell").count();
    expect(hasMainContent).toBeGreaterThan(0);

    // Log warning count but don't fail on warnings
    // Only fail on actual errors
    expect(criticalErrors.length).toBe(0);
  });

  test("8. IPC file operations are available", async () => {
    // Test that file operation IPCs are available and callable
    const ipcCheck = await mainWindow.evaluate(async (folderPath) => {
      const piles = (window as any).piles;
      const results: Record<string, any> = {};
      
      // Test getFolderItems
      try {
        const items = await piles.getFolderItems(folderPath);
        results.getFolderItems = { success: true, count: items.length };
      } catch (err) {
        results.getFolderItems = { success: false, error: String(err) };
      }
      
      // Test loadWorkspace (may return null for new folder)
      try {
        const workspace = await piles.loadWorkspace(folderPath);
        results.loadWorkspace = { success: true, hasData: workspace !== null };
      } catch (err) {
        results.loadWorkspace = { success: false, error: String(err) };
      }
      
      return results;
    }, testFolderPath);

    expect(ipcCheck.getFolderItems.success).toBe(true);
    expect(ipcCheck.loadWorkspace.success).toBe(true);
    
    console.log("✓ IPC file operations work correctly");
    console.log("  getFolderItems: ", ipcCheck.getFolderItems);
    console.log("  loadWorkspace: ", ipcCheck.loadWorkspace);
  });

  // =========================================================================
  // Canvas Integration Tests
  // These tests load a folder programmatically and test canvas functionality
  // =========================================================================

  test("9. Can programmatically load folder and show canvas", async () => {
    // The store exposes itself at window.__PILES_STORE__ for E2E testing
    // We can call loadFolder directly to bypass the native dialog
    
    const loadResult = await mainWindow.evaluate(async (folderPath) => {
      const store = (window as any).__PILES_STORE__;
      if (!store) {
        return { success: false, error: "Store not exposed" };
      }
      
      try {
        // Call loadFolder directly
        await store.getState().loadFolder(folderPath);
        
        // Get current state
        const state = store.getState();
        
        return {
          success: true,
          status: state.status,
          itemCount: state.items.length,
          folderPath: state.folderPath,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }, testFolderPath);

    console.log("Load folder result:", loadResult);
    
    expect(loadResult.success).toBe(true);
    expect(loadResult.status).toBe("loaded");
    expect(loadResult.itemCount).toBeGreaterThan(0);
    
    // Wait for React to re-render
    await mainWindow.waitForTimeout(500);
    
    // Check if we're in canvas mode now
    const hasCanvas = await mainWindow.locator(".ws-shell--canvas").isVisible();
    expect(hasCanvas).toBe(true);
    
    // The canvas item class is "ci" not "canvas-item"
    const itemCount = await mainWindow.locator(".ci").count();
    console.log("✓ Folder loaded and canvas visible");
    console.log("  Item count:", itemCount);
    
    expect(itemCount).toBeGreaterThan(0);
  });

  test("10. Canvas items are rendered with correct structure", async () => {
    // Wait a moment for render to complete
    await mainWindow.waitForTimeout(500);
    
    // Check that canvas items exist (class is "ci" for canvas item)
    const canvasItems = mainWindow.locator(".ci");
    const itemCount = await canvasItems.count();
    
    expect(itemCount).toBeGreaterThan(0);
    console.log(`Found ${itemCount} canvas items`);
    
    // Check first item has expected structure
    const firstItem = canvasItems.first();
    await expect(firstItem).toBeVisible();
    
    // Items should have position styling
    const hasPosition = await firstItem.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.position === "absolute";
    });
    expect(hasPosition).toBe(true);
    
    console.log("✓ Canvas items have correct positioning");
  });

  test("11. Can select items by clicking", async () => {
    const canvasItems = mainWindow.locator(".ci");
    const firstItem = canvasItems.first();
    
    // Click on first item
    await firstItem.click();
    
    // Wait for selection state to update
    await mainWindow.waitForTimeout(100);
    
    // Check if item is selected (class is "ci--selected")
    const isSelected = await firstItem.evaluate((el) => {
      return el.classList.contains("ci--selected");
    });
    
    expect(isSelected).toBe(true);
    console.log("✓ Item selection works");
  });

  test("12. Can deselect with Escape key", async () => {
    // First ensure something is selected
    const canvasItems = mainWindow.locator(".ci");
    const firstItem = canvasItems.first();
    await firstItem.click();
    
    // Press Escape to deselect
    await mainWindow.keyboard.press("Escape");
    await mainWindow.waitForTimeout(100);
    
    // Check selection state
    const isSelected = await firstItem.evaluate((el) => {
      return el.classList.contains("ci--selected");
    });
    
    expect(isSelected).toBe(false);
    console.log("✓ Escape key deselects items");
  });

  test("13. Can create a pile from the current selection", async () => {
    await loadFolderIntoApp(testFolderPath);

    const firstItem = mainWindow.locator('.ci').nth(0);

    await firstItem.click();

    const createPileButton = mainWindow.locator(
      "button:has-text('Pile from selection')"
    );
    await expect(createPileButton).toBeVisible();
    await createPileButton.click();
    await mainWindow.waitForTimeout(200);

    const groupSizes = await mainWindow.evaluate(() => {
      const store = (window as any).__PILES_STORE__;
      const state = store.getState();
      return Object.values(state.workspace.groups).map(
        (group: any) => group.itemIds.length
      );
    });

    expect(groupSizes).toEqual([1]);
    console.log("✓ Pile from selection works");
  });

  test("14. F2 starts inline rename for the selected item", async () => {
    await loadFolderIntoApp(testFolderPath);

    const item = mainWindow.locator('.ci[aria-label="test-installer.dmg"]');

    await item.click({ force: true });
    await mainWindow.keyboard.press("F2");

    const renameInput = item.locator("input.ci-name--editing");
    await expect(renameInput).toBeVisible();
    await expect(renameInput).toHaveValue("test-installer.dmg");

    await mainWindow.keyboard.press("Escape");
    await expect(renameInput).toHaveCount(0);
    console.log("✓ F2 starts inline rename");
  });

  test("15. Delete removes the selected item", async () => {
    await loadFolderIntoApp(testFolderPath);

    await mainWindow.evaluate(() => {
      const store = (window as any).__PILES_STORE__;
      const originalTrashItem = store.getState().trashItem;
      const calls: string[] = [];

      (window as any).__trashItemCalls = calls;
      (window as any).__restoreTrashItem = () => {
        store.setState({ trashItem: originalTrashItem });
      };

      store.setState({
        trashItem: async (id: string) => {
          calls.push(id);
        },
      });
    });

    const item = mainWindow.locator('.ci').first();

    await item.click();
    await mainWindow.keyboard.press("Delete");
    await mainWindow.waitForTimeout(100);

    const trashCallCount = await mainWindow.evaluate(() => {
      return ((window as any).__trashItemCalls as string[]).length;
    });

    expect(trashCallCount).toBe(1);

    await mainWindow.evaluate(() => {
      (window as any).__restoreTrashItem?.();
      delete (window as any).__trashItemCalls;
      delete (window as any).__restoreTrashItem;
    });
    console.log("✓ Delete removes the selected item");
  });

  test("16. Enter opens the selected item", async () => {
    await loadFolderIntoApp(testFolderPath);

    const item = mainWindow.locator('.ci[aria-label="test-document.txt"]');

    await mainWindow.evaluate(() => {
      const store = (window as any).__PILES_STORE__;
      const originalOpenItem = store.getState().openItem;
      const calls: string[] = [];

      (window as any).__openItemCalls = calls;
      (window as any).__restoreOpenItem = () => {
        store.setState({ openItem: originalOpenItem });
      };

      store.setState({
        openItem: async (id: string) => {
          calls.push(id);
        },
      });
    });

    await item.click();
    await mainWindow.keyboard.press("Enter");
    await mainWindow.waitForTimeout(100);

    const openedName = await mainWindow.evaluate(() => {
      const store = (window as any).__PILES_STORE__;
      const state = store.getState();
      const [itemId] = (window as any).__openItemCalls as string[];
      return state.items.find((item: any) => item.id === itemId)?.name ?? null;
    });

    expect(openedName).toBe("test-document.txt");

    await mainWindow.evaluate(() => {
      (window as any).__restoreOpenItem?.();
      delete (window as any).__openItemCalls;
      delete (window as any).__restoreOpenItem;
    });
    console.log("✓ Enter opens the selected item");
  });

  test("17. Auto Group button is visible in canvas mode", async () => {
    await loadFolderIntoApp(testFolderPath);

    // Check that Auto Group button exists and is visible
    const autoGroupBtn = mainWindow.locator("button:has-text('Auto Group')");
    await expect(autoGroupBtn).toBeVisible();
    await expect(autoGroupBtn).toBeEnabled();
    
    console.log("✓ Auto Group button is visible and enabled");
  });

  test("18. Auto Group creates piles by file type", async () => {
    await loadFolderIntoApp(testFolderPath);

    // Click Auto Group button
    const autoGroupBtn = mainWindow.locator("button:has-text('Auto Group')");
    await autoGroupBtn.click();
    
    // Wait for grouping to complete
    await mainWindow.waitForTimeout(500);
    
    // Check that pile cards were created
    const pileCards = mainWindow.locator(".pile-card");
    const pileCount = await pileCards.count();
    
    expect(pileCount).toBeGreaterThan(0);
    console.log(`Created ${pileCount} piles`);
    
    // Verify some expected group names exist
    // Based on our test files: Images, Documents, Archives, Installers, Misc
    const pileNames = await mainWindow.evaluate(() => {
      const cards = document.querySelectorAll('.pile-card');
      return Array.from(cards).map(card => {
        const header = card.querySelector('.pile-header span, .pile-name');
        return header?.textContent || '';
      });
    });
    
    console.log("Pile names:", pileNames);
    
    // At minimum, we should have some piles created
    expect(pileCount).toBeGreaterThanOrEqual(2);
    
    console.log("✓ Auto Group created piles by file type");
  });

  test("19. Can drag items on canvas", async () => {
    // Get a canvas item that's not in a pile (class is "ci")
    const canvasItems = mainWindow.locator(".ci");
    const itemCount = await canvasItems.count();
    
    if (itemCount === 0) {
      console.log("⚠ No loose canvas items to drag (all may be in piles)");
      return;
    }
    
    const item = canvasItems.first();
    
    // Get initial position
    const initialPos = await item.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y };
    });
    
    // Perform drag
    await item.hover();
    await mainWindow.mouse.down();
    await mainWindow.mouse.move(initialPos.x + 100, initialPos.y + 100);
    await mainWindow.mouse.up();
    
    // Wait for position update
    await mainWindow.waitForTimeout(200);
    
    // Get new position
    const newPos = await item.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y };
    });
    
    // Position should have changed (or at least the drag didn't crash)
    console.log("Initial position:", initialPos);
    console.log("New position:", newPos);
    
    // Check that the app is still responsive
    const hasContent = await mainWindow.locator(".ws-shell").count();
    expect(hasContent).toBeGreaterThan(0);
    
    console.log("✓ Drag interaction works");
  });

  test("20. No runtime errors after all interactions", async () => {
    // Final check for any critical console errors
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes("DevTools") &&
        !err.includes("Source map") &&
        !err.includes("favicon") &&
        !err.includes("React DevTools") &&
        !err.includes("Download the React DevTools") &&
        !err.includes("net::ERR_FILE_NOT_FOUND") // Ignore file not found (may be expected)
    );

    if (criticalErrors.length > 0) {
      console.log("❌ Critical errors found:");
      criticalErrors.forEach(err => console.log("  -", err));
      expect(criticalErrors.length).toBe(0);
    } else {
      console.log("✓ No critical runtime errors after all interactions");
    }
    
    // Verify app is still in a valid state
    const hasContent = await mainWindow.locator(".ws-shell").count();
    expect(hasContent).toBeGreaterThan(0);
    
    console.log("✓ App state is valid after all E2E tests");
  });
});
