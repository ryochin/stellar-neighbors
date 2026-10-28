import { defineConfig } from "vitest/config"

export default defineConfig({
  // Relative asset paths so the build works at a bucket root or under any prefix.
  base: "./",
  server: {
    // Let other devices on the LAN reach the dev server via the Mac's mDNS name (e.g. "Mac-mini.local").
    allowedHosts: [".local"],
  },
  build: {
    target: "es2022",
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
})
