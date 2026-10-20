/* ---- Inventory adjustment form ---- */
var ADJ_REASONS = ['สินค้าที่เสียหาย','ตัดจำหน่ายแล้ว','จำนวนสินค้าคงคลัง','การหดตัว','การตีมูลค่าสินค้าคงคลังอีกครั้ง','สินค้าที่ถูกขโมย','หมดอายุแล้ว','สินค้าที่ส่งคืน','ใช้ภายในกิจการ','อื่น ๆ'];
function adjLines(d) {
  if (d.items && d.items.length && d.items[0].qtyChange != null) return d.items.map(function(l) { return { name: l.name, qtyChange: Number(l.qtyChange) || 0, newQty: l.newQty, desc: l.desc || '' }; });
  return d.party ? [{ name: d.party, qtyChange: Number(d.extra && d.extra.qtyChange) || 0 }] : [];
}
function adjQty(d, name) { return adjLines(d).reduce(function(t, l) { return t + (l.name === name ? l.qtyChange : 0); }, 0); }
var adjForm = null;
function openInvAdjForm(doc, prodName) {
  var ex = (doc && doc.extra) || {};
  var stocked = STORE.products.filter(isStocked);
  var lines = doc ? adjLines(doc) : [];
  adjForm = { doc: doc, lines: lines.length ? lines.map(function(l) { var p = stocked.find(function(x) { return x.name === l.name; }); var on = p ? productStock(p) - l.qtyChange : 0; return { name: l.name, onHand: on, newQty: on + l.qtyChange, desc: l.desc || '' }; }) : [] };
  if (prodName) { var pp = stocked.find(function(x) { return x.name === prodName; }); if (pp) adjForm.lines.push({ name: pp.name, onHand: productStock(pp), newQty: productStock(pp), desc: pp.desc || '' }); }
  while (adjForm.lines.length < 2) adjForm.lines.push({ name:'', onHand:0, newQty:'', desc:'' });
  var date = (doc && doc.date) || todayStr();
  var accs = STORE.accounts.filter(function(a) { var b = subtypeBase(accSubtype(a)); return b === 'expense' || b === 'cogs'; });
  var curAcc = ex.adjAccount || 'การหดตัวของสินค้าคงคลัง';
  var accOpts = [curAcc].concat(accs.map(function(a) { return a.name; }).filter(function(n) { return n !== curAcc; }));
  var h = '<div class="ia-top"><div class="field"><label for="ia_date">วันที่ปรับปรุง</label><input type="date" id="ia_date" value="' + esc(date) + '"></div>' +
    '<div class="field"><label for="ia_no">หมายเลขอ้างอิง</label><input id="ia_no" value="' + esc((doc && doc.docNo) || nextDocNo('inventoryAdjust', date)) + '"></div>' +
    '<div class="field"><label for="ia_reason">เหตุผลที่ปรับปรุง</label><select id="ia_reason">' + ADJ_REASONS.map(function(r) { return '<option' + ((ex.reason || 'การหดตัว') === r ? ' selected' : '') + '>' + r + '</option>'; }).join('') + (ex.reason && ADJ_REASONS.indexOf(ex.reason) < 0 ? '<option selected>' + esc(ex.reason) + '</option>' : '') + '</select></div>' +
    '<div class="field"><label for="ia_acc">บัญชีการปรับสินค้าคงคลัง</label><select id="ia_acc">' + accOpts.map(function(n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</select></div></div>' +
    '<h3 class="de-h">รายละเอียดรายการ</h3><div class="items-wrap"><table class="items-table ia-table"><thead><tr><th style="width:30px">#</th><th>ผลิตภัณฑ์/ตัวเลือก</th><th style="width:160px">รายละเอียด</th><th>คำอธิบาย</th><th style="width:110px" class="r">ปริมาณในมือ</th><th style="width:120px">ปริมาณใหม่</th><th style="width:120px">เปลี่ยนในจำนวน</th><th style="width:36px"></th></tr></thead><tbody id="iaBody"></tbody></table></div>' +
    '<div class="de-btns"><button type="button" class="btn btn-outline btn-sm" id="iaAdd">เพิ่มบรรทัด</button> <button type="button" class="btn btn-outline btn-sm" id="iaClear">ล้างทุกบรรทัด</button></div>' +
    '<div class="field" style="max-width:520px"><label for="ia_note">บันทึกข้อความ</label><textarea id="ia_note" rows="4">' + esc(ex.note || '') + '</textarea></div>' +
    '<div class="form-error" id="formError" hidden></div>';
  var save = function(close) { return function(btn) { saveInvAdj(btn, close); }; };
  openModal({ full: true, title: 'การปรับจำนวนสินค้าในคลัง' + (doc ? ' ' + (doc.docNo || '') : ''), body: h, buttons: [{ label:'ยกเลิก', left:true, onClick: function() { closeModal(); } }, { label:'บันทึก', cls:'btn-outline', onClick: save(false) }, { label:'บันทึกและปิด', cls:'btn-primary', onClick: save(true) }], onMount: function() {
    renderAdjRows();
    byId('iaAdd').onclick = function() { adjForm.lines.push({ name:'', onHand:0, newQty:'', desc:'' }); renderAdjRows(); };
    byId('iaClear').onclick = function() { adjForm.lines = [{ name:'', onHand:0, newQty:'', desc:'' }, { name:'', onHand:0, newQty:'', desc:'' }]; renderAdjRows(); };
    byId('ia_date').addEventListener('change', function() { if (!adjForm.doc) byId('ia_no').value = nextDocNo('inventoryAdjust', this.value); });
  } });
}
function renderAdjRows() {
  var stocked = STORE.products.filter(isStocked), body = byId('iaBody');
  body.innerHTML = adjForm.lines.map(function(l, i) {
    var p = stocked.find(function(x) { return x.name === l.name; });
    var ch = l.name && l.newQty !== '' ? (Number(l.newQty) || 0) - (Number(l.onHand) || 0) : '';
    var opts = '<option value="">— เลือกสินค้า —</option>' + stocked.map(function(x) { return '<option value="' + esc(x.name) + '"' + (x.name === l.name ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + (l.name && !p ? '<option selected>' + esc(l.name) + '</option>' : '');
    return '<tr><td class="muted">' + (i + 1) + '</td><td><select data-i="' + i + '" data-f="name">' + opts + '</select></td><td class="muted">' + esc(p ? p.sku || '' : '') + '</td>' +
      '<td><input data-i="' + i + '" data-f="desc" value="' + esc(l.desc || '') + '"></td><td class="r">' + (l.name ? fmtNum(l.onHand) : '') + '</td>' +
      '<td><input type="number" step="any" data-i="' + i + '" data-f="newQty" value="' + esc(l.newQty) + '"' + (l.name ? '' : ' disabled') + '></td>' +
      '<td><input type="number" step="any" data-i="' + i + '" data-f="chg" value="' + esc(ch) + '"' + (l.name ? '' : ' disabled') + '></td>' +
      '<td><button type="button" class="item-remove" data-del="' + i + '" aria-label="ลบ">🗑</button></td></tr>';
  }).join('');
  if (!stocked.length) body.innerHTML += '<tr><td colspan="8" class="muted small">ยังไม่มีสินค้าประเภท "รายการสินค้าคงคลัง" — เพิ่มได้ที่หน้าสินค้าคงคลัง</td></tr>';
  body.querySelectorAll('select[data-f="name"]').forEach(function(s) { s.onchange = function() { var l = adjForm.lines[s.dataset.i], p = stocked.find(function(x) { return x.name === s.value; }); l.name = s.value; l.onHand = p ? productStock(p) : 0; l.newQty = p ? l.onHand : ''; if (p && p.desc && !l.desc) l.desc = p.desc; renderAdjRows(); }; });
  body.querySelectorAll('input').forEach(function(inp) { inp.oninput = function() {
    var l = adjForm.lines[inp.dataset.i], f = inp.dataset.f, tr = inp.closest('tr');
    if (f === 'desc') { l.desc = inp.value; return; }
    if (f === 'newQty') { l.newQty = inp.value; tr.querySelector('[data-f="chg"]').value = inp.value === '' ? '' : (Number(inp.value) || 0) - l.onHand; }
    if (f === 'chg') { l.newQty = inp.value === '' ? '' : l.onHand + (Number(inp.value) || 0); tr.querySelector('[data-f="newQty"]').value = l.newQty; }
  }; });
  body.querySelectorAll('[data-del]').forEach(function(b) { b.onclick = function() { adjForm.lines.splice(Number(b.dataset.del), 1); if (!adjForm.lines.length) adjForm.lines.push({ name:'', onHand:0, newQty:'', desc:'' }); renderAdjRows(); }; });
}
async function saveInvAdj(btn, close) {
  var err = byId('formError'), fail = function(m) { err.textContent = m; err.hidden = false; };
  var date = byId('ia_date').value || todayStr();
  var _lk = (typeof lockDate === 'function') ? lockDate() : '';
  if (_lk && date <= _lk) return fail('งวดบัญชีถึงวันที่ ' + fmtDateNum(_lk) + ' ถูกล็อกแล้ว');
  var lines = adjForm.lines.filter(function(l) { return l.name && l.newQty !== ''; }).map(function(l) { return { name: l.name, qtyChange: round2((Number(l.newQty) || 0) - (Number(l.onHand) || 0)), newQty: Number(l.newQty) || 0, desc: l.desc || '' }; }).filter(function(l) { return l.qtyChange; });
  if (!lines.length) return fail('เลือกสินค้าและระบุปริมาณใหม่อย่างน้อย 1 รายการ');
  var docNo = byId('ia_no').value.trim() || nextDocNo('inventoryAdjust', date);
  if (STORE.documents.some(function(d) { return d.docNo === docNo && (!adjForm.doc || d._id !== adjForm.doc._id); })) return fail('หมายเลขอ้างอิง ' + docNo + ' ถูกใช้แล้ว');
  var rec = { type:'inventoryAdjust', typeLabel: DOC_TYPES.inventoryAdjust.label, group:'other', party: lines.map(function(l) { return l.name; }).join(', '), date: date, docNo: docNo, items: lines, total: 0, status:'done',
    extra: Object.assign({}, (adjForm.doc && adjForm.doc.extra) || {}, { reason: byId('ia_reason').value, adjAccount: byId('ia_acc').value, note: byId('ia_note').value.trim(), qtyChange: lines.length === 1 ? lines[0].qtyChange : null }) };
  btn.disabled = true;
  try {
    if (adjForm.doc) await setRec('documents', adjForm.doc._id, Object.assign({}, strip(adjForm.doc), rec, { updatedAt: Date.now() }));
    else { rec.createdAt = Date.now(); var id = await addRec('documents', rec); }
    showToast('บันทึกการปรับสินค้า ' + docNo + ' แล้ว');
    if (close) closeModal(); else { btn.disabled = false; var nd = adjForm.doc || (id && findDoc(id)); if (nd) adjForm.doc = nd; byId('modalTitle').textContent = 'การปรับจำนวนสินค้าในคลัง ' + docNo; adjForm.lines.forEach(function(l) { var p = STORE.products.find(function(x) { return x.name === l.name; }); if (p) { l.onHand = productStock(p); l.newQty = l.onHand; } }); renderAdjRows(); }
  } catch (e) { btn.disabled = false; fail(writeError(e)); }
}

pageState.adjPeriod = 'all'; pageState.adjReason = ''; pageState.adjQ = '';
function adjTabData() {
  var r = periodRange(pageState.adjPeriod), q = (pageState.adjQ || '').toLowerCase();
  var reasons = ADJ_REASONS.slice(); STORE.documents.forEach(function(d) { var x = d.type === 'inventoryAdjust' && d.extra && d.extra.reason; if (x && reasons.indexOf(x) < 0) reasons.push(x); });
  var all = STORE.documents.filter(function(d) { return d.type === 'inventoryAdjust' && !d.voided; });
  var list = all.filter(function(d) { var ex = d.extra || {}; return inRange(d.date || '', r) && (!pageState.adjReason || ex.reason === pageState.adjReason) && (!q || [d.docNo, d.party, ex.reason, ex.note].join(' ').toLowerCase().indexOf(q) >= 0); })
    .sort(function(a, b) { return (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0); });
  var sel = function(st, opts) { return '<select class="coa-select" onchange="pageState.' + st + '=this.value;refreshPageData()">' + opts.map(function(o) { return '<option value="' + esc(o[0]) + '"' + (pageState[st] === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; };
  var h = '<div class="adj-head"><div class="iv-filters" style="margin:0">' +
    '<div class="field"><span class="iv-lbl">ช่วงวันที่</span>' + sel('adjPeriod', [['all','ทั้งหมด'],['month','เดือนนี้'],['quarter','ไตรมาสนี้'],['year','ปีนี้'],['last12','12 เดือนที่ผ่านมา']]) + '</div>' +
    '<div class="field"><span class="iv-lbl">เหตุผลที่ปรับปรุง</span>' + sel('adjReason', [['','เหตุผลทั้งหมด']].concat(reasons.map(function(x) { return [x, x]; }))) + '</div>' +
    '<label class="coa-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input type="search" value="' + esc(pageState.adjQ) + '" placeholder="ค้นหา" onchange="pageState.adjQ=this.value;refreshPageData()"></label></div>' +
    '<button class="btn btn-dark" type="button" onclick="openInvAdjForm(null)">การปรับปรุงใหม่</button></div>';
  var rows = list.map(function(d) { var ex = d.extra || {}, ln = adjLines(d);
    return '<tr><td class="num">' + fmtDateNum(d.date) + '</td><td><a href="#" class="po-link" data-doc="' + esc(d._id) + '" onclick="event.preventDefault()">' + esc(d.docNo || '') + '</a><div class="small muted">' + esc(ln.map(function(l) { return l.name + ' ' + (l.qtyChange > 0 ? '+' : '') + fmtNum(l.qtyChange); }).join(', ')) + '</div></td><td>' + esc(ex.reason || '') + '</td><td>' + esc(ex.adjAccount || 'การหดตัวของสินค้าคงคลัง') + '</td>' +
      '<td class="r iv-act"><a href="#" onclick="event.preventDefault();openInvAdjForm(findDoc(\'' + d._id + '\'))">แก้ไข</a><details class="iv-dd"><summary>▾</summary><div class="iv-menu"><button type="button" onclick="this.closest(\'details\').open=false;openDocDetail(\'' + d._id + '\')">ดูรายละเอียด</button><button type="button" onclick="this.closest(\'details\').open=false;adjDelete(\'' + d._id + '\')">ลบ</button></div></details></td></tr>'; }).join('');
  var n = list.length;
  var table = '<div class="table-wrap coa-table"><table class="data-table"><thead><tr><th>วันที่ ↓</th><th>ข้อมูลอ้างอิง</th><th>เหตุผลที่ปรับปรุง</th><th>บัญชีที่ปรับปรุง</th><th class="r">การดำเนินการ</th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="5" class="adj-empty"><b>บริหารสินค้าคงคลังให้แม่นยำ</b><div>' + (all.length ? 'ไม่พบการปรับปรุงตามตัวกรองนี้' : 'คุณยังไม่ได้สร้างการปรับปรุงสินค้าคงคลัง คุณจะเห็นการปรับปรุงที่นี่เมื่อสร้าง') + '</div></td></tr>') + '</tbody></table></div>';
  return h + table + '<div class="iv-pager">' + (n ? '1' : '0') + ' - ' + n + ' ของ ' + n + ' รายการ <span class="muted">‹ หน้า 1 ของ 1 ›</span></div>';
}
var _adjDelArm = null;
async function adjDelete(id) {
  if (_adjDelArm !== id) { _adjDelArm = id; showToast('กด "ลบ" อีกครั้งเพื่อยืนยัน'); setTimeout(function() { if (_adjDelArm === id) _adjDelArm = null; }, 4000); return; }
  _adjDelArm = null;
  try { await delRec('documents', id); showToast('ลบการปรับปรุงแล้ว'); } catch (e) { showToast(writeError(e)); }
}
