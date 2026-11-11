import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contra una instancia real (necesita Upstash configurado en .env.local).
 *   npm run dev   (en otra terminal)   →   E2E_ADMIN_USER=… E2E_ADMIN_PASSWORD=… npm run test:e2e
 * Usa un Redis de PRUEBAS: el test crea servicios, horarios y reservas.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "movil-android", use: { ...devices["Pixel 7"] } },
    { name: "movil-iphone", use: { ...devices["iPhone 14"] } },
    { name: "tablet-android", use: { ...devices["Galaxy Tab S4"] } },
    { name: "tablet-ipad", use: { ...devices["iPad (gen 7)"] } },
    { name: "portatil", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } } },
    { name: "pantalla-grande", use: { ...devices["Desktop Chrome"], viewport: { width: 2560, height: 1440 } } },
  ],
});
