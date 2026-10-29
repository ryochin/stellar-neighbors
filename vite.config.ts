import { defineConfig, type Plugin } from "vitest/config"

const SITE_URL: string = "https://stellar-neighbors.aquahill.net/"

/** Crawlers (X, Slack, ...) need an absolute og:image URL; `base: "./"` makes Vite emit a relative one. */
function absoluteOgImage(siteUrl: string): Plugin {
  return {
    name: "absolute-og-image",
    apply: "build",
    enforce: "post",
    // Vite resolves hashed asset URLs in index.html only when it emits the file, so patch the emitted asset.
    generateBundle(_options, bundle): void {
      const page = bundle["index.html"]
      if (page?.type !== "asset" || typeof page.source !== "string") {
        return
      }
      const pattern: RegExp = /(<meta property="og:image" content=")\.\/([^"]+)"/
      if (!pattern.test(page.source)) {
        this.error("index.html has no relative og:image meta tag to make absolute")
      }
      page.source = page.source.replace(
        pattern,
        (_match: string, prefix: string, path: string): string =>
          `${prefix}${new URL(path, siteUrl).href}"`,
      )
    },
  }
}

export default defineConfig({
  // Relative asset paths so the build works at a bucket root or under any prefix.
  base: "./",
  plugins: [absoluteOgImage(SITE_URL)],
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
