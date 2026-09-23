/* ==========================================================================
   23 - BOOT
   ========================================================================== */

var deferredInstallPrompt = null;
var installPromptAvailable = false;
window.addEventListener("beforeinstallprompt", function(e){
  e.preventDefault();
  deferredInstallPrompt = e;
  installPromptAvailable = true;
  qsa(".install-app-btn").forEach(function(btn){ btn.style.display = ""; });
});
function triggerInstall(){
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(function(){
    deferredInstallPrompt = null;
    installPromptAvailable = false;
    qsa(".install-app-btn").forEach(function(btn){ btn.style.display = "none"; });
  });
}

window.addEventListener("DOMContentLoaded", function(){
  var root = el("app-root");
  if (root) root.innerHTML = '<div class="boot-loading"><div class="boot-spinner"></div><p>Connecting to the live school database…</p></div>';
  loadState(function(){ restoreLocalSession(); renderApp(); });
  if ("serviceWorker" in navigator){
    navigator.serviceWorker.register("service-worker.js").catch(function(){ /* offline install optional */ });
  }
  window.addEventListener("online", function(){ toast("Back online — syncing with the live database."); });
  window.addEventListener("offline", function(){ toast("You're offline — changes will sync once you're back online.", "warn"); });
});
