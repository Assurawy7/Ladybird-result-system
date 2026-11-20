#!/usr/bin/env node
/* ==========================================================================
   scripts/package-school.js        (npm run package:school -- ...)

   For a school whose Netlify site is updated by UPLOADING A ZIP (Netlify does
   not run the build in that case, so the BRAND / APP_NAME settings cannot
   work). This makes a complete, ready-to-upload zip with that school's own
   app name, colour and icons already built in - without touching your own
   files, so the other schools are never affected.

   Usage:
     node scripts/package-school.js --brand noblepath \
          --name "Noble Path Science College" --short "Noble Path" --color "#001832"

   --brand  folder name under brand/ holding icon-192.png and icon-512.png
   --name   full app name
   --short  name under the home-screen icon (12 letters or fewer, optional)
   --color  browser/app colour like #001832 (optional)

   Result: dist/<brand>/<brand>-upload.zip   -> upload this to that school's
   Netlify site (Deploys, drag and drop / Deploy manually).
   Secrets are never packed: .env files, node_modules, .git, backups and other
   zips are left out.
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = path.join(__dirname, "..");

function arg(name) {
  const i = process.argv.indexOf("--" + name);
  return i > -1 && process.argv[i + 1] && process.argv[i + 1].indexOf("--") !== 0 ? process.argv[i + 1] : "";
}
function fail(msg) { console.error("\nERROR: " + msg + "\n"); process.exit(1); }

const brand = arg("brand");
const appName = arg("name");
const shortName = arg("short");
const color = arg("color");

if (!brand || !appName) {
  fail('Usage: node scripts/package-school.js --brand noblepath --name "Noble Path Science College" --short "Noble Path" --color "#001832"');
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(brand)) fail("--brand may only use lowercase letters, numbers and dashes.");
if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) fail("--color must look like #001832.");
const brandDir = path.join(ROOT, "brand", brand);
["icon-192.png", "icon-512.png"].forEach((f) => {
  if (!fs.existsSync(path.join(brandDir, f))) fail("brand/" + brand + "/" + f + " is missing. Put the school's icons there first (see brand/README.md).");
});

// ---- 1. copy the project (leaving secrets and clutter behind) ----
const outRoot = path.join(ROOT, "dist", brand);
const siteName = brand + "-site";
const siteDir = path.join(outRoot, siteName);
fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(siteDir, { recursive: true });

function skip(src) {
  const rel = path.relative(ROOT, src);
  if (!rel) return false;
  const top = rel.split(path.sep)[0];
  const base = path.basename(src);
  if (["dist", "node_modules", ".git", ".netlify"].indexOf(top) > -1) return true;
  if (base.indexOf(".env") === 0 && base !== ".env.example") return true;
  if (/^state-backup-.*\.json$/.test(base)) return true;
  if (/^service-account.*\.json$/.test(base)) return true;
  if (/\.local\.json$/.test(base)) return true;
  if (/\.zip$/i.test(base)) return true;
  return false;
}
function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach((name) => {
    const s = path.join(src, name);
    if (skip(s)) return;
    const st = fs.lstatSync(s);
    if (st.isSymbolicLink()) return;
    const d = path.join(dest, name);
    if (st.isDirectory()) copyTree(s, d); else fs.copyFileSync(s, d);
  });
}
copyTree(ROOT, siteDir);

// ---- 2. build with this school's branding, inside the COPY only ----
const env = Object.assign({}, process.env, { BRAND: brand, APP_NAME: appName });
if (shortName) env.APP_SHORT_NAME = shortName; else delete env.APP_SHORT_NAME;
if (color) env.THEME_COLOR = color; else delete env.THEME_COLOR;
const b = cp.spawnSync(process.execPath, [path.join(siteDir, "scripts", "build.js")], { env, encoding: "utf8" });
process.stdout.write(b.stdout || ""); process.stderr.write(b.stderr || "");
if (b.status !== 0) fail("the build failed - nothing was packed.");

// ---- 3. check the copy really carries the school's branding ----
const m = JSON.parse(fs.readFileSync(path.join(siteDir, "manifest.json"), "utf8"));
if (m.name !== appName) fail("the app name was not applied - nothing was packed.");
const html = fs.readFileSync(path.join(siteDir, "index.html"), "utf8");
if (html.indexOf("<title>") === -1) fail("index.html looks wrong - nothing was packed.");
const sameIcon = (f) => fs.readFileSync(path.join(siteDir, "icons", f)).equals(fs.readFileSync(path.join(brandDir, f)));
if (!sameIcon("icon-192.png") || !sameIcon("icon-512.png")) {
  console.warn("WARNING: the school's icons were not used (see the warnings above) - the default icons are in the zip.");
}

// ---- 4. zip it ----
const zipFile = path.join(outRoot, brand + "-upload.zip");
const z = cp.spawnSync("zip", ["-q", "-r", zipFile, siteName], { cwd: outRoot, encoding: "utf8" });
console.log("");
if (z.error || z.status !== 0) {
  console.log("Packed folder: dist/" + brand + "/" + siteName);
  console.log("The 'zip' tool is not available here. In the Explorer, right-click that folder and choose Download,");
  console.log("then upload the downloaded zip to the school's Netlify site.");
} else {
  const mb = (fs.statSync(zipFile).size / 1048576).toFixed(1);
  console.log("READY: dist/" + brand + "/" + brand + "-upload.zip  (" + mb + " MB)");
  console.log('App name: "' + m.name + '"' + (m.short_name ? ', short name: "' + m.short_name + '"' : "") + (m.theme_color ? ", colour: " + m.theme_color : ""));
  console.log("Download it (Explorer, right-click the file, Download) and upload it to this school's Netlify site.");
}
