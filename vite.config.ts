import { defineConfig } from "vitest/config"

export default defineConfig({
  // Relative asset paths so the build works at a bucket root or under any prefix.
  base: "./",
  build: {
    target: "es2022",
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
})
