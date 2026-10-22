#!/usr/bin/env node
/* One-time patch: makes live-sync and saving safe against erasing unsaved
   work. Replaces everything from `function pollOnce(){` through the
   `online` listener in source/02-state.js. Aborts without changing
   anything if the file doesn't look exactly as expected. */
"use strict";
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "source", "02-state.js");
const src = fs.readFileSync(FILE, "utf8");

if (src.indexOf("hasUnsavedLocalWork") !== -1) {
  console.log("Already patched - nothing to do.");
  process.exit(0);
}

const START = "function pollOnce(){";
const END_MARK = 'window.addEventListener("online", function(){\n  if (_pendingSave) persistNow();\n});';
const a = src.indexOf(START);
const bStart = src.indexOf(END_MARK);
if (a === -1 || bStart === -1 || bStart < a) {
  console.error("ABORTED: could not find the expected start/end of the sync code in source/02-state.js. Nothing was changed.");
  process.exit(1);
}
const b = bStart + END_MARK.length;

const NEW_BLOCK = `/* ---------- unsaved-work guard ----------
   Live-sync must NEVER replace what is on this screen while the person is
   typing, has a modal form open, or has a save that hasn't finished.
   Otherwise another device's save wipes out what they were filling in. */
var _lastInputAt = 0;
var _editedDuringFlight = false;
var _pollInFlight = false;
var _pollStartedAt = 0;
var _lastPollAt = 0;
var _retryTimer = null;
var _lastSaveFailToastAt = 0;
var TEXTLIKE = { text:1, number:1, tel:1, email:1, date:1, url:1, password:1, "":1 };

function fieldIsTextLike(f){
  if (!f || !f.tagName) return false;
  if (f.tagName === "TEXTAREA") return true;
  if (f.tagName !== "INPUT") return false;
  return !!TEXTLIKE[(f.type || "").toLowerCase()];
}

function userIsBusy(){
  // A form/dialog is open (add student, edit teacher, etc.)
  var mr = document.getElementById("modal-root");
  if (mr && mr.children && mr.children.length > 0) return true;
  var active = document.activeElement;
  var fields = document.querySelectorAll("input, textarea");
  for (var i = 0; i < fields.length; i++){
    var f = fields[i];
    if (!fieldIsTextLike(f)) continue;
    if (f.value === f.defaultValue) continue;          // nothing typed here
    if (f === active) return true;                      // typing right now
    if (Date.now() - _lastInputAt < 90000) return true; // typed in the last 90s
  }
  return false;
}

function hasUnsavedLocalWork(){
  return !!(saveTimer || _saveInFlight || _pendingSave || userIsBusy());
}

document.addEventListener("input", function(){ _lastInputAt = Date.now(); }, true);
document.addEventListener("change", function(){ _lastInputAt = Date.now(); }, true);

function pollOnce(){
  if (_pollInFlight && Date.now() - _pollStartedAt < 20000) return;
  // Don't even ask the server while there is unsaved work: it saves a full
  // download of the school data on slow connections, and we could not apply
  // the answer safely anyway. We catch up as soon as the work is saved.
  if (hasUnsavedLocalWork()) return;
  if (Date.now() - _lastPollAt < 2500) return;
  _lastPollAt = Date.now();
  _pollInFlight = true; _pollStartedAt = Date.now();
  apiGetState(_lastKnownRev).then(function(res){
    if (!res.ok){
      if (res._httpStatus === 401){ sessionExpired(); }
      return;
    }
    if (res.authenticated === false){ sessionExpired(); return; }
    if (!res.changed) return;
    return prefetchMedia(res.state).then(function(){
      // The person may have started typing while this was downloading.
      // If so, throw this copy away - we will fetch a fresh one later.
      if (hasUnsavedLocalWork()) return;
      rehydrateMediaFields(res.state);
      var keepUser = state.currentUser, keepView = state.view, keepParams = state.viewParams;
      state = res.state;
      state.currentUser = keepUser; state.view = keepView; state.viewParams = keepParams;
      _lastKnownRev = res.revision;
      cacheStateLocally();
      toast("Updated from another device.");
      renderApp();
    });
  }).catch(function(){ /* transient network hiccup - next poll will retry */ })
    .then(function(){ _pollInFlight = false; });
}

function sessionExpired(){
  stopLiveSync();
  if (state) { state.currentUser = null; state.view = "login"; state.viewParams = {}; }
  clearLocalSession();
  toast("Your session has expired - please sign in again.", "warn");
  renderApp();
}

function scheduleSave(){
  if (_saveInFlight) _editedDuringFlight = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(function(){ saveTimer = null; persistNow(); }, 500);
}

function scheduleRetry(){
  if (_retryTimer) return;
  _retryTimer = setTimeout(function(){
    _retryTimer = null;
    if (_pendingSave && !_saveInFlight && navigator.onLine !== false){ _pendingSave = false; persistNow(); }
  }, 8000);
}

function persistNow(){
  if (!state) return Promise.resolve();
  if (saveTimer){ clearTimeout(saveTimer); saveTimer = null; }
  if (_saveInFlight){ _pendingSave = true; _editedDuringFlight = true; return Promise.resolve(); }
  syncMediaFromState(state);
  var payload;
  try{ payload = JSON.parse(JSON.stringify(state)); }
  catch(e){ console.error("Could not serialize state for saving", e); return Promise.resolve(); }
  delete payload.currentUser; delete payload.view; delete payload.viewParams;
  applyMediaMarkers(payload);

  _saveInFlight = true;
  _editedDuringFlight = false; // anything changed from now on is newer than this payload

  return apiSaveState(payload, _lastKnownRev).then(function(result){
    _saveInFlight = false;
    if (!result.ok){
      if (result._httpStatus === 401){ sessionExpired(); return; }
      if (result._httpStatus === 403){
        toast(result.error || "You don't have permission to save that change.", "error");
        return;
      }
      if (Date.now() - _lastSaveFailToastAt > 30000){
        _lastSaveFailToastAt = Date.now();
        toast("Could not save to the school server - will keep retrying. Please keep this page open.", "error");
      }
      _pendingSave = true;
      scheduleRetry();
      return;
    }

    var newerLocalEdits = _editedDuringFlight || !!saveTimer;

    if (!result.merged){
      _lastKnownRev = result.revision;
    } else if (newerLocalEdits){
      // Others changed things AND the person kept editing while this save was
      // on its way. Replacing the screen now would erase those newer edits.
      // Keep the old base revision (so the next save is merged again by the
      // server) and save again right away; the merged result is applied once
      // the person has stopped editing.
      _pendingSave = true;
    } else if (userIsBusy()){
      // Person is typing/has a form open: don't touch the screen. The next
      // poll applies the server's copy as soon as they finish.
    } else {
      _lastKnownRev = result.revision;
      rehydrateMediaFields(result.state);
      var keepUser = state.currentUser, keepView = state.view, keepParams = state.viewParams;
      state = result.state;
      state.currentUser = keepUser; state.view = keepView; state.viewParams = keepParams;
      toast("Some changes made elsewhere while you were away have been merged in alongside yours.", "warn");
      renderApp();
    }
    cacheStateLocally();
    if (_pendingSave){ _pendingSave = false; persistNow(); }
    else { setTimeout(pollOnce, 400); }
  }).catch(function(err){
    _saveInFlight = false;
    console.error("Save failed", err);
    if (Date.now() - _lastSaveFailToastAt > 30000){
      _lastSaveFailToastAt = Date.now();
      toast("Could not save to the school server - will keep retrying. Please keep this page open.", "error");
    }
    _pendingSave = true;
    scheduleRetry();
  });
}

window.addEventListener("online", function(){
  if (_pendingSave) persistNow();
});

document.addEventListener("visibilitychange", function(){
  if (document.visibilityState === "hidden"){
    if (saveTimer) persistNow();                       // flush before the phone suspends the page
  } else if (state && state.currentUser){
    pollOnce();                                        // catch up the moment the app is reopened
  }
});

document.addEventListener("focusout", function(){
  setTimeout(function(){
    if (state && state.currentUser && !hasUnsavedLocalWork()) pollOnce();
  }, 1500);
}, true);`;

fs.writeFileSync(FILE, src.slice(0, a) + NEW_BLOCK + src.slice(b));
console.log("Patched source/02-state.js - unsaved-work guard installed.");
