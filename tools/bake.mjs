#!/usr/bin/env node
/* Boule de Pain — copy what was last published in the admin panel into the website's own files:
     assets/js/site-config.js   hours, closed days, holiday hours, announcement, ordering rules, markets, wholesale
     assets/js/menu-data.js     the whole menu (hidden items stay in the file, marked "hidden")

   node tools/bake.mjs                   use the admin panel address in site-config.js ("admin" → "url")
   node tools/bake.mjs --remote URL      use another admin panel address
   node tools/bake.mjs --force           rewrite the files even if they already have the latest version

   The website already shows new changes right away (assets/js/live-data.js asks the panel). This makes them
   permanent in the files, so the pages, the chatbot and anyone reading the files see the same menu.
   A GitHub Action (.github/workflows/bake.yml) runs this every 15 minutes. */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = path.join(ROOT, "assets/js/site-config.js");
const MENU = path.join(ROOT, "assets/js/menu-data.js");
const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i > -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : ""; };

/* A data file is a comment, then "window.X = {JSON};". Returns the comment and the data. */
function readDataFile(file, key) {
  const text = fs.readFileSync(file, "utf8");
  const at = text.indexOf(`window.${key} =`);
  if (at < 0) throw new Error(`${path.basename(file)} doesn't set window.${key}`);
  const window = {};
  vm.runInNewContext(text, { window }, { filename: file, timeout: 2000 });
  if (!window[key] || typeof window[key] !== "object") throw new Error(`${path.basename(file)} didn't set window.${key}`);
  return { head: text.slice(0, at), data: window[key] };
}
function writeDataFile(file, head, key, data) {
  const text = `${head}window.${key} = ${JSON.stringify(data, null, 2)};\n`;
  // the chatbot reads these files as plain JSON: make sure that still works
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, " ");
  JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1));
  fs.writeFileSync(file + ".tmp", text);
  fs.renameSync(file + ".tmp", file);
}

function todayLA(tz) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
/* Every date from "from" to "to" (both included, at most about two months). */
function eachDate(from, to, fn) {
  const p = String(from).split("-").map(Number);
  let d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  if (isNaN(d)) return;
  const end = to && to > from ? to : from;
  for (let i = 0; i < 70; i++) {
    const iso = d.toISOString().slice(0, 10);
    if (iso > end) break;
    fn(iso);
    d = new Date(d.getTime() + 864e5);
  }
}

function looksValid(pub) {
  return pub && pub.version > 0 && pub.site && Array.isArray(pub.site.hours) && pub.site.hours.length === 7 &&
    pub.menu && Array.isArray(pub.menu.categories) && pub.menu.categories.length > 0;
}

/* The published settings on top of site-config.js (everything else in the file stays as it is). */
export function mergeSite(site, pub) {
  const s = pub.site, out = { ...site };
  out.hours = s.hours.map((h) => ({ day: h.day, name: DAY[h.day], short: DAY[h.day].slice(0, 3), open: h.open || "", close: h.close || "" }));
  const closures = Array.isArray(s.closures) ? s.closures : [];
  // closedDates / closureNotes: every closed day as a date, for pages and tools that only know these
  const dates = [], notes = {};
  closures.forEach((c) => { if (c && c.date) eachDate(c.date, c.to, (iso) => { dates.push(iso); if (c.note) notes[iso] = c.note; }); });
  out.closedDates = dates;
  out.closureNotes = notes;
  out.closures = closures;
  out.special = Array.isArray(s.special) ? s.special : [];
  if (s.ordering) {
    out.ordering = { ...(site.ordering || {}) };
    for (const k of ["cutoff", "leadDays", "deliveryDays", "maxDaysAhead", "windowMinutes"]) if (s.ordering[k] != null) out.ordering[k] = s.ordering[k];
  }
  out.announcement = typeof s.announcement === "string" ? s.announcement : (site.announcement || "");
  if (s.announceLink && s.announceLink.url) out.announceLink = s.announceLink; else delete out.announceLink;
  if (s.announceFrom) out.announceFrom = s.announceFrom; else delete out.announceFrom;
  if (s.announceTo) out.announceTo = s.announceTo; else delete out.announceTo;
  if (Array.isArray(s.markets)) {
    out.markets = s.markets.map((m) => {
      const prev = (site.markets || []).find((x) => x.day === m.day) || {};
      return { day: m.day, name: DAY[m.day], photo: prev.photo || "", locations: (m.locations || []).slice() };
    });
  }
  if (s.wholesale && typeof s.wholesale === "object") out.wholesale = s.wholesale;
  out.dataVersion = pub.version;
  out.dataSavedAt = pub.savedAt || null;
  return out;
}

/* The published menu ("sold out today" from an earlier day is dropped; it has already turned itself off). */
export function cleanMenu(menu, today) {
  const item = (it) => {
    if (!it || typeof it !== "object") return it;
    if (it.soldToday && it.soldToday !== today) { const c = { ...it }; delete c.soldToday; return c; }
    return it;
  };
  return {
    addonGroups: menu.addonGroups || {},
    categories: menu.categories.map((c) => (c.groups
      ? { ...c, groups: c.groups.map((g) => ({ ...g, items: (g.items || []).map(item) })) }
      : { ...c, items: (c.items || []).map(item) })),
  };
}

async function main() {
  const cfg = readDataFile(CONFIG, "SITE");
  const menu = readDataFile(MENU, "MENU");
  let base = opt("--remote") || (cfg.data.admin && cfg.data.admin.url) || "";
  base = String(base).trim().replace(/\/+$/, "");
  if (!/^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(base + "/")) { console.log("No admin panel address set; nothing to do."); return; }
  const res = await fetch(`${base}/api/public`, { headers: { "Cache-Control": "no-cache" } });
  if (!res.ok) throw new Error(`The admin panel answered ${res.status}`);
  const pub = await res.json();
  if (!pub || !pub.version) { console.log("Nothing has been published yet."); return; }
  const have = Number(cfg.data.dataVersion) || 0;
  if (pub.version <= have && !flag("--force")) { console.log(`Already up to date (version ${have}).`); return; }
  if (!looksValid(pub)) throw new Error("The published data looks wrong; not copying it.");
  const today = todayLA(cfg.data.timezone);
  writeDataFile(CONFIG, cfg.head, "SITE", mergeSite(cfg.data, pub));
  writeDataFile(MENU, menu.head, "MENU", cleanMenu(pub.menu, today));
  console.log(`Copied version ${pub.version} into site-config.js and menu-data.js.`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${pub.version}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
