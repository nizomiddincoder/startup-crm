const fs = require("fs");
console.log("=== pricing.test.ts");
console.log(fs.readFileSync("lib/pricing.test.ts", "utf8").slice(0, 500));
for (const f of ["lib/services/staff-invites.ts", "lib/services/branches.ts"]) {
  console.log("=== " + f);
  fs.readFileSync(f, "utf8").split(/\r?\n/).forEach((l, i) => {
    if (/export (async )?function|Schema = z\.object|input:/.test(l)) console.log(i + 1 + ": " + l.trim().slice(0, 120));
  });
}
console.log("=== Tenant model");
const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const i = schema.indexOf("model Tenant {");
console.log(schema.slice(i, i + 1600));
