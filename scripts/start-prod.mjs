/**
 * Server (Railway) ishga tushishi — bitta buyruq: npm start
 *   1) bazaga yangi migratsiyalarni qo'llaydi (prisma migrate deploy);
 *   2) birinchi platforma adminini yaratadi (ADMIN_PHONE va ADMIN_PASSWORD berilgan bo'lsa);
 *   3) saytni (next start) va Telegram botni (TELEGRAM_BOT_TOKEN bo'lsa) yoqadi.
 * Sayt to'xtasa — jarayon tugaydi (Railway qayta ishga tushiradi). Bot yiqilsa — 30 soniyadan keyin qayta yoqiladi.
 */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function log(message) {
  console.log(`[start] ${message}`);
}

function runOnce(command) {
  const result = spawnSync(command, { cwd: root, stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`[start] Xato: ${command}`);
    process.exit(result.status ?? 1);
  }
}

log("Migratsiyalar qo'llanmoqda...");
runOnce("npx prisma migrate deploy");

if (process.env.ADMIN_PHONE && process.env.ADMIN_PASSWORD) {
  runOnce("npx tsx scripts/bootstrap-admin.ts");
}

const children = new Set();
let stopping = false;

function start(name, command, { restart }) {
  const child = spawn(command, { cwd: root, stdio: "inherit", shell: true, env: process.env });
  children.add(child);
  child.on("exit", (code) => {
    children.delete(child);
    if (stopping) return;
    if (!restart) {
      log(`${name} to'xtadi (kod ${code}). Jarayon tugaydi.`);
      shutdown(code ?? 1);
      return;
    }
    log(`${name} to'xtadi (kod ${code}). 30 soniyadan keyin qayta yoqiladi.`);
    setTimeout(() => !stopping && start(name, command, { restart }), 30_000);
  });
}

function shutdown(code = 0) {
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 5_000).unref();
  if (children.size === 0) process.exit(code);
}

process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));

const port = process.env.PORT || "3000";
log(`Sayt ishga tushmoqda (port ${port})`);
start("Sayt", `npx next start -p ${port}`, { restart: false });

if (process.env.TELEGRAM_BOT_TOKEN) {
  log("Telegram bot ishga tushmoqda");
  start("Bot", "npx tsx bot/index.ts", { restart: true });
} else {
  log("TELEGRAM_BOT_TOKEN yo'q — bot yoqilmadi");
}
