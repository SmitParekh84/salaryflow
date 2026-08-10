import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Integration tests talk to a real Mongo and are opt-in via MONGODB_TEST_URI.
    testTimeout: 30_000,
  },
});
