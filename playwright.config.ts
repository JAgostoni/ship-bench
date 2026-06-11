import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    port: 3000,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_PATH: "data/kb-e2e.sqlite",
    },
  },
});
