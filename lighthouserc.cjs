/* global module */

module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run preview -- --host 127.0.0.1 --port 5199 --strictPort",
      startServerReadyPattern: "Local:",
      startServerReadyTimeout: 120000,
      url: [
        "http://127.0.0.1:5199/",
        "http://127.0.0.1:5199/services/civil-registry/application-for-marriage-license",
      ],
      numberOfRuns: 1,
      settings: {
        formFactor: "mobile",
        screenEmulation: {
          mobile: true,
          width: 393,
          height: 852,
          deviceScaleFactor: 2,
        },
        throttlingMethod: "simulate",
        chromeFlags: "--headless --no-sandbox --disable-gpu --disable-dev-shm-usage",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
        "resource-summary:script:size": ["error", { maxNumericValue: 750000 }],
        interactive: ["warn", { maxNumericValue: 5000 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./artifacts/lighthouse",
      reportFilenamePattern: "lighthouse-%%PATHNAME%%.report.html",
    },
  },
};
