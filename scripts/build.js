#!/usr/bin/env node
/* ==========================================================================
   scripts/build.js
   app.js is a generated bundle: it is exactly the concatenation of every
   file in source/, in filename order (this was true of the original
   Firebase version too - see master prompt section 64, "duplicate logic
   warning"). Edit files under source/, then run:
     npm run build
   Never hand-edit app.js directly - your changes will be overwritten the
   next time this runs.

   service-worker.js is ALSO generated now (from service-worker.template.js).
   Edit the template, never service-worker.js directly - this run computes
   a cache-busting version from the actual contents of app.js/styles.css/
   index.html/manifest.json and writes it into the generated file, so every
   installed client automatically picks up a change to any of those files
   without anyone having to remember to bump a version number by hand.
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "source");
const APP_OUT_FILE = path.join(ROOT, "app.js");
const SW_TEMPLATE_FILE = path.join(ROOT, "service-worker.template.js");
const SW_OUT_FILE = path.join(ROOT, "service-worker.js");

// ---- 1. Build app.js from source/*.js (unchanged behavior) ----
const files = fs.readdirSync(SOURCE_DIR)
  .filter((f) => f.endsWith(".js"))
  .sort(); // "01-seed.js" < "02-state.js" < ... < "23-boot.js"

const combined = files
  .map((f) => fs.readFileSync(path.join(SOURCE_DIR, f), "utf8"))
  .join("");

fs.writeFileSync(APP_OUT_FILE, combined);
console.log(`Built app.js from ${files.length} source files (${combined.length} bytes).`);

// ---- 2. Compute a cache-busting version from the actual cached assets ----
// Any change to these files' bytes changes this hash, which changes
// service-worker.js's bytes, which is what makes browsers notice there's
// an update to install (browsers only re-check a service worker file when
// its own bytes change - see docs/migration.md).
const CACHE_BUSTED_ASSETS = ["app.js", "styles.css", "index.html", "manifest.json"];

function buildVersionHash() {
  const hash = crypto.createHash("sha256");
  for (const name of CACHE_BUSTED_ASSETS) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) {
      console.warn(`WARNING: ${name} not found while computing cache version - skipped.`);
      continue;
    }
    hash.update(fs.readFileSync(p));
  }
  return hash.digest("hex").slice(0, 10);
}

const versionHash = buildVersionHash();

// ---- 3. Generate service-worker.js from the template ----
if (!fs.existsSync(SW_TEMPLATE_FILE)) {
  console.error("ERROR: service-worker.template.js not found - cannot generate service-worker.js.");
  process.exit(1);
}

const swTemplate = fs.readFileSync(SW_TEMPLATE_FILE, "utf8");
if (swTemplate.indexOf("__CACHE_VERSION__") === -1) {
  console.error("ERROR: service-worker.template.js has no __CACHE_VERSION__ placeholder - refusing to generate a service worker with no cache-busting.");
  process.exit(1);
}

const swOut = swTemplate.split("__CACHE_VERSION__").join(versionHash);
fs.writeFileSync(SW_OUT_FILE, swOut);
console.log(`Built service-worker.js - cache version: ${versionHash}`);
