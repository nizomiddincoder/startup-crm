const fs = require("fs");
const path = require("path");
function walk(d, cb) {
  for (const f of fs.readdirSync(d)) {
    const x = path.join(d, f);
    const st = fs.statSync(x);
    if (st.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(f)) continue;
      walk(x, cb);
    } else if (/\.(ts|tsx)$/.test(f)) cb(x);
  }
}
["lib", "app", "components", "bot"].forEach((d) =>
  walk(d, (f) => {
    const s = fs.readFileSync(f, "utf8");
    const lines = s.split(/\r?\n/);
    lines.forEach((l, i) => {
      if (/enabledModules/.test(l) && !f.endsWith("modules.ts")) {
        console.log(f + ":" + (i + 1) + ": " + l.trim());
      }
    });
  })
);
const perm = fs.readFileSync("lib/services/permissions.ts", "utf8");
const i = perm.indexOf("SECTION_ACCESS");
console.log("---SECTION_ACCESS---");
console.log(perm.slice(i - 60, i + 800));
