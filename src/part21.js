/* ---- Sidebar customise (bookmarks) ---- */
function pinGet() { try { return JSON.parse(localStorage.getItem('psm_pins') || '[]'); } catch (e) { return window._pins || []; } }
function pinSet(l) { window._pins = l; try { localStorage.setItem('psm_pins', JSON.stringify(l)); } catch (e) {} }
function pinPages() {
  var out = [{ id:'home', label:'หน้าแรก', sec:'' }];
  SUBNAV_ITEMS.forEach(function(s) { (s.children || []).forEach(function(c) { out.push({ id: s.key + ':' + c.key, label: c.label, sec: s.label }); }); if (!(s.children || []).length) out.push({ id: s.key, label: s.label, sec:'' }); });
  return out;
}
// ไอคอนของแต่ละหน้าที่คั่นไว้ (ไม่มีไอคอนเฉพาะ ใช้ไอคอนของหมวด)
var PIN_ICONS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9"/>',
  accounting: '<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h11"/>',
  'accounting:bankTx': '<path d="M3 9l9-5 9 5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  'accounting:batchTx': '<rect x="7" y="3" width="13" height="13" rx="1.5"/><path d="M4 7v12a1 1 0 001 1h12"/>',
  'accounting:reconcile': '<path d="M4 12l4 4 12-12"/><path d="M4 20h16"/>',
  'accounting:monthClose': '<rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M9 15l2 2 4-4"/>',
  'accounting:yearClose': '<rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  'accounting:rules': '<path d="M4 6h16M4 12h10M4 18h6"/><path d="M17 15l2 2 3-4"/>',
  'accounting:coa': '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  'accounting:opening': '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  'accounting:recurring': '<path d="M20 11a8 8 0 00-14-5L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0014 5l2-2"/><path d="M20 21v-5h-5"/>',
  'accounting:receiptCapture': '<path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3"/><path d="M8 9h8M8 12h8M8 15h5"/>',
  alldocs: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  'alldocs:journals': '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21a2 2 0 012-2h13M8 7h7M8 11h7"/>',
  'alldocs:batch': '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M3 14h18M9 4v16"/>',
  billing: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
  'billing:suppliers': '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  'billing:bill': '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  'billing:pettyCash': '<rect x="3" y="6" width="18" height="12" rx="1.5"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
  'billing:advances': '<circle cx="9" cy="7" r="3"/><path d="M3 19a6 6 0 0112 0"/><path d="M16 11h5M19 9l2 2-2 2"/>',
  'team:payroll': '<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M7 10h4M7 14h6"/><circle cx="16.5" cy="12" r="2"/>',
  'billing:prepaid': '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  sales: '<path d="M4 19l5-6 4 3 7-9"/><path d="M15 7h5v5"/>',
  'sales:invoice': '<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  'sales:salesOrder': '<path d="M9 4h6v3H9z"/><path d="M7 5H5v16h14V5h-2"/><path d="M8 13l2 2 4-4"/>',
  'sales:products': '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  customers: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0112 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2A5 5 0 0121 19"/>',
  inventory: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  'inventory:overview': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  'inventory:purchaseOrder': '<path d="M3 4h2l2.5 11h11L21 7H6.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
  'inventory:fixedAssets': '<path d="M4 21V9l8-5 8 5v12"/><path d="M9 21v-6h6v6"/>',
  'inventory:receipt': '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 9h6M9 13h4"/>',
  'inventory:salesOrder': '<path d="M9 4h6v3H9z"/><path d="M7 5H5v16h14V5h-2"/><path d="M8 13l2 2 4-4"/>',
  tax: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 14l6-6"/><circle cx="9.5" cy="8.5" r="1"/><circle cx="14.5" cy="13.5" r="1"/>',
  'tax:monthly': '<rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3M8 17h6"/>',
  'tax:inputVat': '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 16l6-6"/><circle cx="9.5" cy="10.5" r="1"/><circle cx="14.5" cy="15.5" r="1"/>',
  'tax:wht': '<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6"/><circle cx="12" cy="16" r="2"/>',
  reports: '<rect x="4" y="10" width="3.5" height="10"/><rect x="10.2" y="5" width="3.5" height="15"/><rect x="16.5" y="13" width="3.5" height="7"/>',
  'reports:custom': '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  'reports:management': '<rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M8 21h8M12 17v4M7 13l3-3 3 2 4-4"/>',
  'reports:performance': '<path d="M4 18a8 8 0 1116 0"/><path d="M12 18l4-6"/>',
  'reports:cashflow': '<path d="M3 12c3-6 6-6 9 0s6 6 9 0"/><path d="M3 20h18"/>',
  'reports:budget': '<circle cx="12" cy="12" r="8"/><path d="M12 4v8h8"/>',
  'reports:forecast': '<path d="M4 19l5-6 4 3 7-9"/><path d="M4 4v16h16"/>',
  team: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0112 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2A5 5 0 0121 19"/>',
  project: '<path d="M3 6a1 1 0 011-1h5l2 2h9a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1z"/>',
  'project:dept': '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>'
};
var PIN_BOOKMARK = '<path d="M6 3h12v18l-6-4-6 4z"/>';
function pinIcon(id) { return '<svg class="side-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (PIN_ICONS[id] || PIN_ICONS[String(id).split(':')[0]] || PIN_BOOKMARK) + '</svg>'; }
function renderPins() {
  var host = byId('sidePins'); if (!host) return;
  var all = pinPages();
  host.innerHTML = pinGet().map(function(id) { var p = all.find(function(x) { return x.id === id; }); if (!p) return ''; return '<button class="side-item side-pin" type="button" data-pin="' + esc(id) + '" title="' + esc((p.sec ? p.sec + ' › ' : '') + p.label) + '">' + pinIcon(id) + '<span>' + esc(p.label) + '</span></button>'; }).join('');
}
function pinGo(id) { if (id === 'home') { var h = byId('sidebarHomeBtn'); if (h) h.click(); return; } var a = id.split(':'); go(a[0], a[1]); }
function openPinCustomize() {
  var all = pinPages(), sel = pinGet().filter(function(id) { return all.some(function(p) { return p.id === id; }); });
  var order = sel.concat(all.map(function(p) { return p.id; }).filter(function(id) { return sel.indexOf(id) < 0; }));
  var item = function(id) { var p = all.find(function(x) { return x.id === id; }); return '<li class="pin-row" draggable="true" data-id="' + esc(id) + '"><span class="pin-grip">⠿</span><label><input type="checkbox"' + (sel.indexOf(id) >= 0 ? ' checked' : '') + '> <span class="pin-ico">' + pinIcon(id) + '</span>' + esc(p.label) + (p.sec ? ' <span class="muted small">· ' + esc(p.sec) + '</span>' : '') + '</label></li>'; };
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
