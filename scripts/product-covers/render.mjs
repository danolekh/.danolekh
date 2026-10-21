// Prints the product covers: serves this folder on 127.0.0.1, renders cover.html?id=<slug>&theme=…
// headless at 2× and writes public/images/covers/<slug>-product-{light,dark}.webp (1600×900) and the
// -800 cut next to each. Run from the repo root: node scripts/product-covers/render.mjs [slug …]
// The shots/ are captures of the live sites (oasikadir.it, consolline.com, sportmagaz.com.ua).
import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { extname, join } from "node:path"
import { chromium } from "playwright"
import sharp from "sharp"
import { COVERS } from "./covers.js"

const here = new URL(".", import.meta.url).pathname
const OUT = join(here, "../../public/images/covers")
const types = { ".html": "text/html", ".js": "text/javascript", ".jpg": "image/jpeg", ".png": "image/png" }
const server = createServer(async (req, res) => {
  const file = join(here, decodeURIComponent(new URL(req.url, "http://x").pathname))
  try {
    const body = await readFile(file)
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" })
    res.end(body)
  } catch {
    res.writeHead(404).end()
  }
}).listen(0, "127.0.0.1")
await new Promise((ok) => server.once("listening", ok))
const base = `http://127.0.0.1:${server.address().port}`

const only = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 })
for (const id of Object.keys(COVERS)) {
  if (only.length && !only.includes(id)) continue
  for (const theme of ["light", "dark"]) {
    await page.goto(`${base}/cover.html?id=${id}&theme=${theme}`, { waitUntil: "networkidle" })
    await page.waitForSelector("body[data-ready]", { timeout: 60000 })
    const png = await page.locator("#page").screenshot()
    const name = `${id}-product-${theme}`
    await sharp(png).resize(1600, 900, { kernel: "lanczos3" }).webp({ quality: 86 }).toFile(join(OUT, `${name}.webp`))
    await sharp(png).resize(800, 450, { kernel: "lanczos3" }).webp({ quality: 84 }).toFile(join(OUT, `${name}-800.webp`))
    console.log("printed", name)
  }
}
await browser.close()
server.close()
