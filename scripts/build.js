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
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

const SOURCE_DIR = path.join(__dirname, "..", "source");
const OUT_FILE = path.join(__dirname, "..", "app.js");

const files = fs.readdirSync(SOURCE_DIR)
  .filter((f) => f.endsWith(".js"))
  .sort(); // "01-seed.js" < "02-state.js" < ... < "23-boot.js"

const combined = files
  .map((f) => fs.readFileSync(path.join(SOURCE_DIR, f), "utf8"))
  .join("");

fs.writeFileSync(OUT_FILE, combined);
console.log(`Built app.js from ${files.length} source files (${combined.length} bytes).`);
