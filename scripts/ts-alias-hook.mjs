/**
 * Module resolve hook for running the app's TypeScript modules under plain Node.
 *
 * Next.js resolves "@/x" and extensionless imports through its own bundler, so
 * neither works when Node loads a .ts file directly. This hook fills both gaps
 * for scripts/seed-demo.mjs. It is a build-time convenience only — nothing in
 * the app imports it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

/** Mirrors tsconfig's "@/*" -> "src/*", then TypeScript's extension search. */
export function resolve(specifier, context, nextResolve) {
  let target = null;

  // mongoose is CommonJS and its named exports are not statically detectable.
  // The shim re-exports them; it requires the real package, so this is not a
  // cycle and there is still only one mongoose instance.
  if (specifier === "mongoose" && !context.parentURL?.endsWith("mongoose-esm-shim.mjs")) {
    return {
      url: pathToFileURL(path.join(path.dirname(SRC), "scripts/mongoose-esm-shim.mjs")).href,
      shortCircuit: true,
    };
  }

  if (specifier.startsWith("@/")) {
    target = path.join(SRC, specifier.slice(2));
  } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const parent = path.dirname(fileURLToPath(context.parentURL));
    const candidate = path.resolve(parent, specifier);
    // Only step in when the import has no extension — anything explicit
    // already resolves on its own.
    if (!path.extname(candidate)) target = candidate;
  }

  if (target) {
    for (const suffix of [".ts", ".tsx", "/index.ts", "/index.tsx", ".js", ".mjs"]) {
      const full = `${target}${suffix}`;
      if (fs.existsSync(full)) {
        // No `format`: Node infers it from the extension, which is what routes
        // .ts through type stripping. Pinning "module" would skip that and the
        // type annotations would reach the parser.
        return { url: pathToFileURL(full).href, shortCircuit: true };
      }
    }
  }

  return nextResolve(specifier, context);
}

register(import.meta.url);
