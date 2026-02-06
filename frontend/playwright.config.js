// @ts-check
const { defineConfig, devices } = require("@playwright/test");

const isRealCI = Boolean(process.env.GITHUB_ACTIONS);
const writeJunit = Boolean(process.env.PW_JUNIT);
const externalBaseURL = (process.env.E2E_BASE_URL || "").trim();
const useExternalServer = Boolean(externalBaseURL);
const baseURL = externalBaseURL || "http://localhost:3000";

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  expect: {
    timeout: 10_000,
  },
  retries: isRealCI ? 1 : 0,
  reporter: isRealCI
    ? [
        ["github"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
        ["junit", { outputFile: "test-results/junit.xml" }],
      ]
    : writeJunit
      ? [["junit", { outputFile: "test-results/junit.xml" }], ["list"]]
      : "list",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Default behavior: start a local web server that serves the built frontend.
  // Integration behavior: if E2E_BASE_URL is provided, assume an external server
  // (e.g. docker-compose nginx at http://localhost) and do not start webServer.
  webServer: useExternalServer
    ? undefined
    : {
        command: "npm run build && node scripts/serve-build.js",
        url: "http://localhost:3000",
        reuseExistingServer: !isRealCI,
        env: {
          PORT: "3000",
          CI: "true",
        },
      },
});

