import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(__dirname, "../src/data/ranking.json");
const outputPath = resolve(__dirname, "../public/sitemap.xml");

const BASE = "https://llmcompare.cc";

const models = JSON.parse(readFileSync(dataPath, "utf-8"));

const urls = [
  `${BASE}/`,
  `${BASE}/models`,
  `${BASE}/about`,
  ...models.map((m) => `${BASE}/product/${m.id}`),
];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((url) => `  <url><loc>${url}</loc></url>`),
  "</urlset>",
  "",
].join("\n");

writeFileSync(outputPath, xml);
console.log(`Sitemap written: ${urls.length} URLs`);
