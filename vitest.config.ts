import { mergeConfig } from "vitest/config";
import { defineConfig } from "vitest/config";

import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      include: [
        "src/**/*.test.{ts,tsx}",
        "api/**/*.test.{ts,tsx}",
        "tests/**/*.test.{ts,tsx}",
      ],
      exclude: ["tests/e2e/**"],
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
      },
    },
  }),
);
