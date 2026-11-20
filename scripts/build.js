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

// ---- 1b. Per-school branding (app name, colour, icons) ----
// One code base serves every school, but each school's installed app should
// carry ITS OWN name and icon. These optional settings are read from the
// Netlify site's environment variables at build time (nothing is changed if
// none are set, so an existing school is untouched):
//   APP_NAME        full name, e.g. "Greenfield Academy Results"
//   APP_SHORT_NAME  name under the home-screen icon (12 letters or fewer)
//   THEME_COLOR     browser/app colour, e.g. #0B6B3A
//   BRAND           folder under brand/ holding icon-192.png and icon-512.png
//                   (optional icon-maskable-512.png)
function pngSize(file) {
  const b = fs.readFileSync(file);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (b.length < 24 || !b.slice(0, 8).equals(sig)) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

function applyBranding() {
  const appName = (process.env.APP_NAME || "").trim();
  let shortName = (process.env.APP_SHORT_NAME || "").trim();
  const themeColor = (process.env.THEME_COLOR || "").trim();
  const brand = (process.env.BRAND || "").trim();
  if (!appName && !shortName && !themeColor && !brand) return;   // nothing to do

  const manifestFile = path.join(ROOT, "manifest.json");
  const indexFile = path.join(ROOT, "index.html");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  let html = fs.readFileSync(indexFile, "utf8");

  if (appName) {
    manifest.name = appName;
    manifest.description = "Academic result management for " + appName + ".";
    if (!shortName) shortName = appName.slice(0, 12).trim();
    const esc = appName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = html.replace(/<title>[^<]*<\/title>/, "<title>" + esc + "</title>");
  }
  if (shortName) {
    if (shortName.length > 12) { console.warn("WARNING: APP_SHORT_NAME is longer than 12 letters; phones may cut it off."); }
    manifest.short_name = shortName;
  }
  if (themeColor) {
    if (/^#[0-9a-fA-F]{6}$/.test(themeColor)) {
      manifest.theme_color = themeColor; manifest.background_color = themeColor;
      html = html.replace(/<meta name="theme-color" content="[^"]*"\/>/, '<meta name="theme-color" content="' + themeColor + '"/>');
    } else {
      console.warn("WARNING: THEME_COLOR must look like #0B6B3A - ignored.");
    }
  }

  if (brand) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(brand)) {
      console.warn("WARNING: BRAND may only use lowercase letters, numbers and dashes - icons not changed.");
    } else {
      const dir = path.join(ROOT, "brand", brand);
      const iconsDir = path.join(ROOT, "icons");
      const wanted = [["icon-192.png", 192], ["icon-512.png", 512], ["icon-maskable-512.png", 512]];
      wanted.forEach(([file, size]) => {
        const src = path.join(dir, file);
        if (!fs.existsSync(src)) {
          if (file !== "icon-maskable-512.png") console.warn("WARNING: brand/" + brand + "/" + file + " not found - keeping the default icon.");
          return;
        }
        const dim = pngSize(src);
        if (!dim) { console.warn("WARNING: brand/" + brand + "/" + file + " is not a PNG picture - skipped."); return; }
        if (dim.w !== size || dim.h !== size) { console.warn("WARNING: brand/" + brand + "/" + file + " is " + dim.w + "x" + dim.h + " but should be exactly " + size + "x" + size + " - skipped."); return; }
        fs.copyFileSync(src, path.join(iconsDir, file));
        console.log("Branding: using brand/" + brand + "/" + file);
        if (file === "icon-maskable-512.png") {
          // a real maskable picture exists, so the normal 512 icon no longer needs to double as one
          manifest.icons = [
            { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
          ];
        }
      });
    }
  }

  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  fs.writeFileSync(indexFile, html);
  console.log("Branding applied" + (appName ? ": " + appName : "") + ".");
}
applyBranding();

// ---- 2. Compute a cache-busting version from the actual cached assets ----
// Any change to these files' bytes changes this hash, which changes
// service-worker.js's bytes, which is what makes browsers notice there's
// an update to install (browsers only re-check a service worker file when
// its own bytes change - see docs/migration.md).
const CACHE_BUSTED_ASSETS = ["app.js", "styles.css", "index.html", "manifest.json", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];

function buildVersionHash() {
  const hash = crypto.createHash("sha256");
  for (const name of CACHE_BUSTED_ASSETS) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) {
      if (name.indexOf("maskable") === -1) console.warn(`WARNING: ${name} not found while computing cache version - skipped.`);
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
