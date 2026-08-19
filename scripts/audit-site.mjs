import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignored = new Set([".git", "node_modules"]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const allFiles = walk(root);
const pages = allFiles.filter((file) => file.endsWith("index.html"));
const contentPages = pages.filter((file) => !/(about|editorial-standards|provider-disclosure|privacy)\/index\.html$/.test(file));

const cleanText = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&[a-z0-9#]+;/gi, " ")
  .replace(/\s+/g, " ")
  .trim();

const attr = (html, name, key = "name") => {
  const first = new RegExp(`<meta[^>]+${key}=["']${name}["'][^>]+content=["']([^"']*)`, "i").exec(html);
  const second = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${key}=["']${name}["']`, "i").exec(html);
  return (first || second || [])[1] || "";
};

function jsonLd(html) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const parsed = [];
  const errors = [];
  for (const block of blocks) {
    try { parsed.push(JSON.parse(block[1])); }
    catch (error) { errors.push(error.message); }
  }
  return { blocks, parsed, errors };
}

function schemaTypes(items) {
  const types = new Set();
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    if (value["@type"]) {
      const valueTypes = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
      valueTypes.forEach((type) => types.add(type));
    }
    Object.values(value).forEach(visit);
  };
  items.forEach(visit);
  return types;
}

function scoreChecks(checks) {
  const passed = checks.filter((check) => check.ok).length;
  return { score: Math.round((passed / checks.length) * 100), failures: checks.filter((check) => !check.ok).map((check) => check.name) };
}

const results = [];
const brokenLinks = [];

for (const file of pages) {
  const html = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  const title = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1]?.replace(/&amp;/g, "&").trim() || "";
  const description = attr(html, "description");
  const canon = (/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i.exec(html) || [])[1] || "";
  const h1s = [...html.matchAll(/<h1\b[^>]*>/gi)];
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const localImages = images.filter((image) => !/src=["']https?:/i.test(image));
  const schema = jsonLd(html);
  const types = schemaTypes(schema.parsed);
  const wordCount = cleanText(html).split(/\s+/).filter(Boolean).length;
  const internalLinks = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)/gi)].map((match) => match[1]).filter((href) => !/^(https?:|mailto:|tel:|#|javascript:)/i.test(href));

  for (const hrefRaw of internalLinks) {
    const href = hrefRaw.split("#")[0].split("?")[0];
    if (!href) continue;
    let target = href.startsWith("/") ? path.join(root, href) : path.resolve(path.dirname(file), href);
    if (href.endsWith("/") || (fs.existsSync(target) && fs.statSync(target).isDirectory())) target = path.join(target, "index.html");
    if (!fs.existsSync(target)) brokenLinks.push(`${rel} -> ${hrefRaw}`);
  }

  const seo = scoreChecks([
    { name: "title present", ok: Boolean(title) },
    { name: "title length 30-65", ok: title.length >= 30 && title.length <= 65 },
    { name: "description present", ok: Boolean(description) },
    { name: "description length 110-170", ok: description.length >= 110 && description.length <= 170 },
    { name: "canonical", ok: canon.startsWith("https://manhattanservices.com/") },
    { name: "indexable robots", ok: /index, follow/i.test(attr(html, "robots")) },
    { name: "language", ok: /<html[^>]+lang=["']en["']/i.test(html) },
    { name: "viewport", ok: /name=["']viewport["']/i.test(html) },
    { name: "single H1", ok: h1s.length === 1 },
    { name: "Open Graph title", ok: Boolean(attr(html, "og:title", "property")) },
    { name: "Open Graph description", ok: Boolean(attr(html, "og:description", "property")) },
    { name: "Open Graph URL", ok: Boolean(attr(html, "og:url", "property")) },
    { name: "Open Graph image", ok: Boolean(attr(html, "og:image", "property")) },
    { name: "Twitter card", ok: Boolean(attr(html, "twitter:card")) },
    { name: "Twitter image", ok: Boolean(attr(html, "twitter:image")) },
    { name: "valid JSON-LD", ok: schema.blocks.length > 0 && schema.errors.length === 0 },
    { name: "breadcrumb schema", ok: types.has("BreadcrumbList") },
    { name: "author", ok: Boolean(attr(html, "author")) },
    { name: "favicon", ok: /rel=["']icon["']/i.test(html) },
    { name: "image optimization", ok: localImages.every((image) => /\.webp/i.test(image) && /\balt=["'][^"']+["']/i.test(image) && /\bwidth=["']\d+/i.test(image) && /\bheight=["']\d+/i.test(image)) }
  ]);

  const aio = scoreChecks([
    { name: "valid machine-readable schema", ok: schema.blocks.length > 0 && schema.errors.length === 0 },
    { name: "publisher or organization entity", ok: /publisher|#organization|Elettro Incorporated/i.test(html) },
    { name: "direct answer section", ok: /class=["'][^"']*answer-box/i.test(html) },
    { name: "question-led heading", ok: /<h2[^>]*>[^<]*(what|how|where|who|when|does|should)/i.test(html) },
    { name: "FAQ structured data", ok: types.has("FAQPage") },
    { name: "visible FAQ content", ok: /faq-(list|item|title)/i.test(html) },
    { name: "reviewed or updated date", ok: /(Reviewed|Updated|dateModified)[^<\n]*2026/i.test(html) },
    { name: "descriptive internal links", ok: internalLinks.length >= 3 },
    { name: "substantive content", ok: wordCount >= 450 },
    { name: "trust policy path", ok: /(editorial-standards|provider-disclosure|about\/)/i.test(html) }
  ]);

  results.push({ rel, titleLength: title.length, descriptionLength: description.length, words: wordCount, seo, aio, types: [...types].sort() });
}

const siteChecks = scoreChecks([
  { name: "robots.txt", ok: fs.existsSync(path.join(root, "robots.txt")) && /sitemap:/i.test(fs.readFileSync(path.join(root, "robots.txt"), "utf8")) },
  { name: "XML sitemap", ok: fs.existsSync(path.join(root, "sitemap.xml")) },
  { name: "17 sitemap URLs", ok: (fs.readFileSync(path.join(root, "sitemap.xml"), "utf8").match(/<loc>/g) || []).length === 17 },
  { name: "sitemap lastmod", ok: (fs.readFileSync(path.join(root, "sitemap.xml"), "utf8").match(/<lastmod>/g) || []).length === 17 },
  { name: "custom 404", ok: fs.existsSync(path.join(root, "404.html")) },
  { name: "social image", ok: fs.existsSync(path.join(root, "images", "manhattan-services-social.jpg")) },
  { name: "responsive WebP library", ok: allFiles.filter((file) => file.endsWith(".webp")).length >= 51 },
  { name: "trust pages", ok: ["about", "editorial-standards", "provider-disclosure", "privacy", "submit-business"].every((dir) => fs.existsSync(path.join(root, dir, "index.html"))) },
  { name: "focused intent pages", ok: ["apartment-services/cleaning", "apartment-services/moving-help", "apartment-services/handyman", "pet-services/dog-walking", "pet-services/pet-sitting", "city-help/no-heat-hot-water"].every((dir) => fs.existsSync(path.join(root, dir, "index.html"))) },
  { name: "no broken internal links", ok: brokenLinks.length === 0 }
]);

const seoAverage = Math.round(results.reduce((sum, result) => sum + result.seo.score, 0) / results.length);
const aioResults = results.filter((result) => contentPages.some((file) => path.relative(root, file) === result.rel));
const aioAverage = Math.round(aioResults.reduce((sum, result) => sum + result.aio.score, 0) / aioResults.length);
const finalSeo = Math.round(seoAverage * 0.8 + siteChecks.score * 0.2);

console.log(`Pages audited: ${results.length}`);
console.log(`SEO score: ${finalSeo}/100`);
console.log(`AIO score: ${aioAverage}/100`);
console.log(`Site infrastructure: ${siteChecks.score}/100`);

for (const result of results) {
  if (result.seo.failures.length || (aioResults.includes(result) && result.aio.failures.length)) {
    console.log(`\n${result.rel}`);
    if (result.seo.failures.length) console.log(`  SEO: ${result.seo.score} - ${result.seo.failures.join(", ")}`);
    if (aioResults.includes(result) && result.aio.failures.length) console.log(`  AIO: ${result.aio.score} - ${result.aio.failures.join(", ")}`);
  }
}

if (siteChecks.failures.length) console.log(`\nSite failures: ${siteChecks.failures.join(", ")}`);
if (brokenLinks.length) console.log(`Broken links:\n${brokenLinks.map((link) => `  ${link}`).join("\n")}`);

if (finalSeo < 100 || aioAverage < 100 || siteChecks.score < 100) process.exitCode = 1;
