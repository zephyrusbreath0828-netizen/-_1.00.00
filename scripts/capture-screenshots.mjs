import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const pages = [
  ["01-login", "/login", 900],
  ["02-home", "/?autologin=1&sample=1", 900],
  ["03-shrines", "/shrines?autologin=1&sample=1", 1100],
  ["04-shrine-detail", "/shrines/shr-047?autologin=1&sample=1", 1200],
  ["05-goshuin", "/goshuin?autologin=1&sample=1", 900],
  ["06-goshuin-new", "/goshuin/new?autologin=1&sample=1", 1100],
  ["07-mypage", "/mypage?autologin=1&sample=1", 1400],
  ["08-profile", "/profile?autologin=1&sample=1", 1000],
];

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--no-proxy-server", "--proxy-bypass-list=*"],
  proxy: { server: "direct://" },
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "ja-JP",
  timezoneId: "Asia/Tokyo",
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("  [pageerror]", String(e).slice(0, 160)));
page.on("console", (m) => {
  if (m.type() === "error") console.log("  [console.error]", m.text().slice(0, 160));
});

for (const [name, path, height] of pages) {
  await page.setViewportSize({ width: 390, height });
  try {
    await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 30000 });
    await page
      .waitForFunction(() => !document.body.innerText.includes("読み込んでいます"), { timeout: 15000 })
      .catch(() => console.log(`  [warn] ${name}: スプラッシュが残っています`));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: true });
    const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 90));
    console.log(`OK  ${name}  → ${text}`);
  } catch (e) {
    console.log(`NG  ${name}  ${String(e).slice(0, 160)}`);
  }
}
await browser.close();
