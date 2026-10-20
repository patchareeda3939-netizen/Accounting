/* ---- Sidebar customise (bookmarks) ---- */
function pinGet() { try { return JSON.parse(localStorage.getItem('psm_pins') || '[]'); } catch (e) { return window._pins || []; } }
function pinSet(l) { window._pins = l; try { localStorage.setItem('psm_pins', JSON.stringify(l)); } catch (e) {} }
function pinPages() {
  var out = [{ id:'home', label:'หน้าแรก', sec:'' }];
  SUBNAV_ITEMS.forEach(function(s) { (s.children || []).forEach(function(c) { out.push({ id: s.key + ':' + c.key, label: c.label, sec: s.label }); }); if (!(s.children || []).length) out.push({ id: s.key, label: s.label, sec:'' }); });
  return out;
}
var PIN_SVG = '<svg class="side-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3h12v18l-6-4-6 4z"/></svg>';
function renderPins() {
  var host = byId('sidePins'); if (!host) return;
  var all = pinPages();
  host.innerHTML = pinGet().map(function(id) { var p = all.find(function(x) { return x.id === id; }); if (!p) return ''; return '<button class="side-item side-pin" type="button" data-pin="' + esc(id) + '" title="' + esc((p.sec ? p.sec + ' › ' : '') + p.label) + '">' + PIN_SVG + '<span>' + esc(p.label) + '</span></button>'; }).join('');
}
function pinGo(id) { if (id === 'home') { var h = byId('sidebarHomeBtn'); if (h) h.click(); return; } var a = id.split(':'); go(a[0], a[1]); }
function openPinCustomize() {
  var all = pinPages(), sel = pinGet().filter(function(id) { return all.some(function(p) { return p.id === id; }); });
  var order = sel.concat(all.map(function(p) { return p.id; }).filter(function(id) { return sel.indexOf(id) < 0; }));
  var item = function(id) { var p = all.find(function(x) { return x.id === id; }); return '<li class="pin-row" draggable="true" data-id="' + esc(id) + '"><span class="pin-grip">⠿</span><label><input type="checkbox"' + (sel.indexOf(id) >= 0 ? ' checked' : '') + '> ' + esc(p.label) + (p.sec ? ' <span class="muted small">· ' + esc(p.sec) + '</span>' : '') + '</label></li>'; };
  var h = '<div class="pin-wrap"><div class="pin-side"><div class="muted small" style="padding:6px 10px">การใช้งาน</div><div class="pin-tab on">ที่คั่นหน้า</div></div><div class="pin-main">' +
    '<label class="coa-search" style="width:100%"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input type="search" id="pinQ" placeholder="ค้นหาหน้าที่ต้องการคั่นหน้า"></label>' +
    '<p class="small">เลือกหน้าที่ต้องการคั่นหน้า จากนั้นลากและเรียงลำดับใหม่ให้พอดีกับวิธีการของคุณ:</p><ul class="pin-list" id="pinList">' + order.map(item).join('') + '</ul></div></div>';
  openModal({ wide: true, title:'ปรับแต่งการตั้งค่า', body: h, buttons: [CANCEL_BTN, { label:'บันทึกและปิด', cls:'btn-primary', onClick: function() {
    var l = Array.from(document.querySelectorAll('#pinList .pin-row')).filter(function(r) { return r.querySelector('input').checked; }).map(function(r) { return r.dataset.id; });
    pinSet(l); renderPins(); closeModal(); showToast('บันทึกที่คั่นหน้า ' + l.length + ' หน้าแล้ว');
  } }], onMount: function() {
    var list = byId('pinList'), drag = null;
    byId('pinQ').addEventListener('input', function() { var q = this.value.toLowerCase(); list.querySelectorAll('.pin-row').forEach(function(r) { r.hidden = q && r.textContent.toLowerCase().indexOf(q) < 0; }); });
    list.addEventListener('dragstart', function(e) { drag = e.target.closest('.pin-row'); if (drag) { drag.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; } });
    list.addEventListener('dragend', function() { if (drag) drag.classList.remove('dragging'); drag = null; });
    list.addEventListener('dragover', function(e) { e.preventDefault(); var t = e.target.closest('.pin-row'); if (!drag || !t || t === drag) return; var r = t.getBoundingClientRect(); list.insertBefore(drag, e.clientY > r.top + r.height / 2 ? t.nextSibling : t); });
  } });
}
(function() {
  var nav = document.querySelector('nav.sidebar'); if (!nav) return;
  var pins = document.createElement('div'); pins.id = 'sidePins'; pins.className = 'side-pins'; nav.appendChild(pins);
  var b = document.createElement('button'); b.type = 'button'; b.className = 'side-item side-custom'; b.id = 'sidebarCustomBtn';
  b.innerHTML = '<svg class="side-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg><span>กำหนดเอง</span>';
  b.addEventListener('click', openPinCustomize); nav.appendChild(b);
  pins.addEventListener('click', function(e) { var t = e.target.closest('[data-pin]'); if (t) pinGo(t.dataset.pin); });
  renderPins();
})();
