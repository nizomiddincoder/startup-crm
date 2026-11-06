const fs = require("fs");
const show = (f, a, b) => {
  const lines = fs.readFileSync(f, "utf8").split(/\r?\n/);
  console.log("=== " + f);
  console.log(lines.slice(a - 1, b).map((l, i) => a + i + ": " + l).join("\n"));
};
show("lib/modules.ts", 70, 95);
show("lib/plans.ts", 45, 60);
show("lib/services/branches.ts", 45, 60);
show("lib/services/branches.ts", 112, 124);
show("lib/services/permissions.ts", 60, 80);
show("lib/services/sales.ts", 225, 260);
show("components/features/pos/customer-picker.tsx", 1, 30);
