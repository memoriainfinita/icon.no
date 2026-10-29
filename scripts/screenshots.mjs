// Screenshots for docs/guide, from index.html served with `python -m http.server 4187` in the repository root.
// Firefox, English. Run by hand when the interface changes: `node scripts/screenshots.mjs`.
// Needs Playwright (not a dependency of the project): set PLAYWRIGHT to the path of its index.mjs.

const { firefox } = await import(process.env.PLAYWRIGHT ?? '@playwright/test');

const url = process.env.URL ?? 'http://127.0.0.1:4187/';
const out = 'docs/guide/img/';
const browser = await firefox.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })).newPage();

await page.goto(url);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${out}start.png` });

const text = [
  '## 🚀 Release report',
  '',
  '✅ Tests pass on every platform',
  '❌ One flaky test remains',
  '',
  '### 🎯 What changed',
  '- 🔥 Faster startup',
  '- 🧹 Cleaner logs',
  '- ⚠️ The old API is deprecated',
  '',
  '🟢 Staging is healthy 🟡 Production is warming up',
].join('\n');
await page.getByRole('textbox', { name: /Paste here/ }).fill(text);
await page.getByRole('button', { name: 'Add →' }).click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: 'Preview', exact: true }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}preview.png` });
await page.getByRole('button', { name: 'Clean', exact: true }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}clean.png` });

await page.getByText('Preserve emojis').click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}preserve.png` });

await browser.close();
