// Records a short promo clip of the app for social posts: rotate, zoom, then move the observer to Sirius.
// The page runs on Playwright's fake clock, stepped one frame at a time, so the result is smooth on any machine.
// Usage: npm run record:promo  (needs Google Chrome and ffmpeg; set FFMPEG to use another binary)
import { spawnSync } from "node:child_process"
import { mkdir, mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { chromium, type Page } from "playwright-core"
import { createServer, type ViteDevServer } from "vite"

// 720p at 30 fps keeps the clip around 3 MB, light enough for social posts.
const FPS = 30
const FRAME_MS: number = 1000 / FPS
const VIEWPORT = { width: 1280, height: 720 }
// Screenshots are taken at 1.5× and scaled down to the viewport size, which smooths text and star edges.
const DEVICE_SCALE = 1.5
const CRF = 24
const OUTPUT_DIR = "video"
const OUTPUT_FILE: string = join(OUTPUT_DIR, "promo.mp4")
// Wheel deltaY → zoom factor exp(-deltaY * 0.0011), as in the renderer's onWheel.
const WHEEL_ZOOM_RATE = 0.0011

interface Point {
  x: number
  y: number
}

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const seconds = (s: number): number => Math.round(s * FPS)

function createRecorder(page: Page, framesDir: string) {
  let frame = 0

  // Advances the fake clock by one frame and saves a screenshot.
  async function shoot(): Promise<void> {
    // Whole-millisecond steps that still add up to exact 60 fps over time.
    const step: number = Math.round((frame + 1) * FRAME_MS) - Math.round(frame * FRAME_MS)
    await page.clock.runFor(step)
    const name: string = `frame-${String(frame).padStart(5, "0")}.png`
    await page.screenshot({ path: join(framesDir, name) })
    frame += 1
  }

  async function hold(durationS: number): Promise<void> {
    for (let i = 0; i < seconds(durationS); i++) await shoot()
  }

  // Drags from `from` by `delta` px with an eased speed; the renderer turns px into yaw / pitch.
  async function drag(from: Point, delta: Point, durationS: number): Promise<void> {
    const frames: number = seconds(durationS)
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    for (let i = 1; i <= frames; i++) {
      const t: number = easeInOut(i / frames)
      await page.mouse.move(from.x + delta.x * t, from.y + delta.y * t)
      await shoot()
    }
    await page.mouse.up()
  }

  // Zooms by `factor` overall with wheel events spread over the duration.
  async function zoom(at: Point, factor: number, durationS: number): Promise<void> {
    const frames: number = seconds(durationS)
    const totalDelta: number = -Math.log(factor) / WHEEL_ZOOM_RATE
    await page.mouse.move(at.x, at.y)
    let done = 0
    for (let i = 1; i <= frames; i++) {
      const target: number = totalDelta * easeInOut(i / frames)
      await page.mouse.wheel(0, target - done)
      done = target
      await shoot()
    }
  }

  // Eases the sidebar down until the star list's bottom is in view. Selecting a star scrolls the
  // sidebar there in one jump (star-list.ts revealSelected); arriving beforehand avoids the jump.
  async function revealStarList(durationS: number): Promise<void> {
    const { from, to } = await page.evaluate(() => {
      const list = document.getElementById("starlist")
      const side = list?.closest<HTMLElement>(".side")
      if (!list || !side) throw new Error("star list or sidebar not found")
      // Same margin as revealSelected, so it finds nothing left to scroll.
      const overflow: number =
        list.getBoundingClientRect().bottom - side.getBoundingClientRect().bottom + 18
      return { from: side.scrollTop, to: side.scrollTop + Math.max(0, overflow) }
    })
    const frames: number = seconds(durationS)
    for (let i = 1; i <= frames; i++) {
      const top: number = from + (to - from) * easeInOut(i / frames)
      await page.evaluate((y: number) => {
        document.querySelector(".side")?.scrollTo({ top: y, behavior: "instant" })
      }, top)
      await shoot()
    }
  }

  return { shoot, hold, drag, zoom, revealStarList, frameCount: (): number => frame }
}

async function waitForCatalog(page: Page): Promise<void> {
  // The catalog fetch is real I/O; keep nudging the fake clock until the star count shows up.
  for (let i = 0; i < 200; i++) {
    const count: string = (await page.locator("#starCount").textContent()) ?? ""
    if (/\d/.test(count)) return
    await page.clock.runFor(50)
    await page.waitForTimeout(50)
  }
  throw new Error("catalog did not load")
}

async function record(url: string, framesDir: string): Promise<void> {
  const browser = await chromium.launch({ channel: "chrome" })
  try {
    const page: Page = await browser.newPage({
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE,
      locale: "ja-JP",
    })
    await page.clock.install()
    await page.goto(`${url}?lang=ja`)
    // Stop the clock so time only moves with runFor; otherwise it flows in real time between screenshots.
    const now: number = await page.evaluate(() => Date.now())
    await page.clock.pauseAt(now + 100)
    // The mouse rests over the map while zooming; keep hover tooltips out of the clip.
    await page.addStyleTag({ content: "#tooltip { display: none !important; }" })
    await waitForCatalog(page)
    // Let label fades settle so the clip starts on a still frame.
    await page.clock.runFor(1000)

    const stage = await page.locator("#stage").boundingBox()
    if (!stage) throw new Error("stage not found")
    const center: Point = { x: stage.x + stage.width * 0.5, y: stage.y + stage.height * 0.55 }
    const rec = createRecorder(page, framesDir)

    await rec.hold(0.4)
    await rec.drag(center, { x: 110, y: 18 }, 2.4)
    await rec.zoom(center, 1.8, 1.4)
    await rec.revealStarList(0.5)
    // The button stays in view after the scroll, so the click does not scroll the sidebar again.
    await page.locator("#observeSirius").click()
    await rec.hold(0.6)
    await rec.drag(center, { x: -70, y: 0 }, 2.5)
    // Leave the stage before the last frames so no hover tooltip shows.
    await page.mouse.move(5, 5)
    await rec.hold(0.2)
    console.log(`captured ${rec.frameCount()} frames`)
  } finally {
    await browser.close()
  }
}

function encode(framesDir: string): void {
  const result = spawnSync(
    process.env.FFMPEG ?? "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-framerate",
      String(FPS),
      "-i",
      join(framesDir, "frame-%05d.png"),
      "-vf",
      `scale=${VIEWPORT.width}:${VIEWPORT.height}:flags=lanczos`,
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      String(CRF),
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      OUTPUT_FILE,
    ],
    { stdio: "inherit" },
  )
  if (result.status !== 0) throw new Error("ffmpeg failed")
}

async function main(): Promise<void> {
  const server: ViteDevServer = await createServer({ server: { port: 0 }, logLevel: "warn" })
  await server.listen()
  const url: string | undefined = server.resolvedUrls?.local[0]
  if (!url) throw new Error("dev server has no URL")
  try {
    const framesDir: string = await mkdtemp(join(tmpdir(), "promo-frames-"))
    console.log(`frames: ${framesDir}`)
    await record(url, framesDir)
    await mkdir(OUTPUT_DIR, { recursive: true })
    encode(framesDir)
    console.log(`wrote ${OUTPUT_FILE}`)
  } finally {
    await server.close()
  }
}

await main()
