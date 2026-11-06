const fs = require("fs");
const path = require("path");

const used = {};
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) {
      if (["node_modules", ".next", ".git", "test-results"].includes(f)) continue;
      walk(p);
    } else if (/\.(ts|tsx)$/.test(f)) {
      const src = fs.readFileSync(p, "utf8");
      const re = /\buz\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/g;
      let m;
      while ((m = re.exec(src))) {
        (used[m[1]] = used[m[1]] || new Set()).add(m[2]);
      }
    }
  }
}
walk("lib");
walk("app");
walk("components");
walk("bot");

const src = fs.readFileSync("lib/i18n/uz.ts", "utf8");
const sectionRe = /^    ([a-zA-Z0-9_]+): \{/gm;
const sections = [...src.matchAll(sectionRe)].map((m) => m[1]);
const have = new Set(sections);
const missing = {};

// split source by top-level sections to inspect each
function sectionSource(sec) {
  const start = src.search(new RegExp(`^    ${sec}: \\{`, "m"));
  if (start < 0) return "";
  const rest = src.slice(start);
  const next = rest.slice(10).search(/^    [a-zA-Z0-9_]+: \{/m);
  return next < 0 ? rest : rest.slice(0, next + 10);
}

for (const [sec, ks] of Object.entries(used)) {
  if (!have.has(sec)) {
    missing[sec] = [...ks].sort();
  } else {
    const secSrc = sectionSource(sec);
    const secKeys = new Set([...secSrc.matchAll(/^      ([a-zA-Z0-9_]+):/gm)].map((m) => m[1]));
    const miss = [...ks].filter((k) => !secKeys.has(k));
    if (miss.length) missing[sec] = miss.sort();
  }
}
fs.writeFileSync(".i18n-missing.json", JSON.stringify(missing, null, 1));
console.log(
  JSON.stringify(
    Object.fromEntries(Object.entries(missing).map(([k, v]) => [k, v.length]))
  )
);
