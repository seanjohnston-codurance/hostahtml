import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    conditions: process.env.VITEST ? ["browser"] : undefined,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.ts"],
    setupFiles: ["./src/test/setup.ts"],
    env: {
      PUBLIC_API_URL: "http://localhost:9999",
      PUBLIC_GOOGLE_CLIENT_ID: "test.apps.googleusercontent.com",
    },
  },
});
