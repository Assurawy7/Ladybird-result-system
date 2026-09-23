/* ==========================================================================
   05b - GENERIC MODAL SYSTEM
   ========================================================================== */

function openModal(innerHtml, opts){
  var root = el("modal-root");
  root.innerHTML = '<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal-card'+(opts&&opts.wide?' modal-wide':'')+'">'+innerHtml+'</div></div>';
  root.style.display = "block";
  document.body.style.overflow = "hidden";
}
function closeModal(){
  var root = el("modal-root");
  root.innerHTML = "";
  root.style.display = "none";
  document.body.style.overflow = "";
}
