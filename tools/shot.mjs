import { chromium } from 'playwright';
const [, , file, out, w] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Number(w || 390), height: 900 } });
await p.route(/^https?:/, r => r.abort());
await p.goto('file://' + file);
await p.screenshot({ path: out, fullPage: true });
await b.close();
