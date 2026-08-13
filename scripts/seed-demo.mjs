/**
 * Fills the shared demo account (demo@gmail.com) with its full dataset.
 *
 *   node scripts/seed-demo.mjs            # uses .env.local
 *   node scripts/seed-demo.mjs .env.production.local
 *
 * The demo login re-seeds by itself once the data goes stale, so this script is
 * only needed to fill the account ahead of the first visitor — or to reset it
 * on demand after someone has scribbled on it.
 *
 * It reuses src/server/demo-seed.ts rather than restating the dataset, so the
 * script and the login route can never drift apart. Reaching a TypeScript
 * module from plain Node needs two things the project has no runner for: type
 * stripping (Node's own --experimental-strip-types, re-exec'd below) and the
 * "@/" path alias (the resolve hook).
 *
 * Scope: every write is filtered on the demo account. No other user is read or
 * modified.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = process.argv[2] ?? ".env.local";

// Node only strips TypeScript when asked, and the flag has to be set before the
// process starts — so re-exec once with the loader and flag in place.
if (!process.env.__SEED_DEMO_CHILD) {
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--no-warnings",
      "--import",
      pathToFileURL(path.join(ROOT, "scripts/ts-alias-hook.mjs")).href,
      fileURLToPath(import.meta.url),
      ENV_FILE,
    ],
    { stdio: "inherit", cwd: ROOT, env: { ...process.env, __SEED_DEMO_CHILD: "1" } },
  );
  process.exit(result.status ?? 1);
}

/** Minimal .env reader — the project has no dotenv dependency. */
function loadEnv(file) {
  const full = path.resolve(ROOT, file);
  if (!fs.existsSync(full)) {
    console.error(`Env file not found: ${full}`);
    process.exit(1);
  }
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line);
    if (!match) continue;
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (!(match[1] in process.env)) process.env[match[1]] = value;
  }
}

loadEnv(ENV_FILE);

if (!process.env.MONGODB_URI) {
  console.error(`MONGODB_URI is not set in ${ENV_FILE}.`);
  process.exit(1);
}

const { connectDB } = await import("../src/server/db.ts");
const { DEMO_EMAIL, ensureDemoUser, reseedDemoAccount } = await import("../src/server/demo-seed.ts");
const { UserModel } = await import("../src/server/models.ts");
const mongoose = (await import("mongoose")).default;

const started = Date.now();
await connectDB();
console.log(`Connected. Seeding ${DEMO_EMAIL} …`);

await ensureDemoUser();
const data = await reseedDemoAccount();
// Stamp it so the login route treats the account as fresh and takes the fast
// path; without this the first visitor would re-seed all over again.
await UserModel.updateOne({ email: DEMO_EMAIL }, { $set: { demoSeededAt: new Date() } });

for (const [name, value] of Object.entries(data)) {
  console.log(`  ${name.padEnd(16)} ${Array.isArray(value) ? value.length : 1}`);
}
console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s.`);

await mongoose.disconnect();
