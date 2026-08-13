/**
 * Named-export shim for mongoose.
 *
 * mongoose is CommonJS. Next.js's bundler synthesises named exports for it, but
 * plain Node relies on static detection and misses `models`/`model`/`Schema`,
 * so `import { models } from "mongoose"` throws. The resolve hook redirects the
 * bare specifier here, and `createRequire` loads the real package unchanged —
 * same singleton, so the connection cache in src/server/db.ts still works.
 *
 * Used only by scripts/seed-demo.mjs. Nothing in the app imports it.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mongoose = require("mongoose");

export default mongoose;
export const { Schema, model, models, Types, connect, connection, disconnect } = mongoose;
