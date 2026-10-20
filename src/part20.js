/* ---- Recurring transactions ---- */
var RECUR_TYPES = ['invoice','bill','expense','checkPayment','estimate','salesOrder','purchaseOrder','journalEntry'];
var RECUR_INT = { daily:'รายวัน', weekly:'รายสัปดาห์', monthly:'รายเดือน', yearly:'รายปี' };
var RECUR_KIND = { scheduled:'ตามกำหนดการ', reminder:'แจ้งเตือน', unscheduled:'ไม่ได้กำหนดเวลา' };
pageState.recQ = ''; pageState.recKind = '';
function recurList() { var s = STORE.settings.find(function(x) { return x._id === 'recurring'; }); return (s && s.list) || []; }
async function saveRecurList(list) { await saveSettings('recurring', { list: list }); }
function recurAdvance(t, date) {
  var d = new Date(date + 'T00:00:00'), n = Math.max(1, Number(t.every) || 1);
  if (t.interval === 'daily') d.setDate(d.getDate() + n);
  else if (t.interval === 'weekly') d.setDate(d.getDate() + 7 * n);
  else if (t.interval === 'yearly') d.setFullYear(d.getFullYear() + n);
  else { var day = Number(t.day) || d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); }
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function recurIntText(t) { if (t.kind === 'unscheduled') return '—'; var n = Number(t.every) || 1; return (n > 1 ? 'ทุก ' + n + ' ' : '') + RECUR_INT[t.interval || 'monthly']; }
async function recurCreateDoc(t, date) {
  var def = DOC_TYPES[t.type]; if (!def) return null;
  var rec = clone(t.doc); rec.date = date; rec.docNo = nextDocNo(t.type, date);
  rec.extra = Object.assign({}, rec.extra || {}, { recurringId: t.id });
  if (rec.extra.terms && rec.extra.dueDate !== undefined) { var dd = new Date(date + 'T00:00:00'); dd.setDate(dd.getDate() + Number(rec.extra.terms)); rec.extra.dueDate = dd.toISOString().slice(0, 10); }
  rec.status = def.status ? 'unpaid' : 'done'; rec.createdAt = Date.now();
  delete rec.payments; delete rec.paidDate; delete rec.voided;
  return await addRec('documents', rec);
}
async function recurUse(id, advance) {
  var list = recurList().slice(), i = list.findIndex(function(x) { return x.id === id; }); if (i < 0) return;
  var t = Object.assign({}, list[i]), date = advance && t.next ? t.next : todayStr();
  try {
    var nid = await recurCreateDoc(t, date);
    t.prev = date; if (advance && t.kind !== 'unscheduled') t.next = recurAdvance(t, t.next || date);
    list[i] = t; await saveRecurList(list);
    showToast('สร้าง' + DOC_TYPES[t.type].label + ' จากเทมเพลต "' + t.name + '" แล้ว');
    if (nid && !advance) setTimeout(function() { openDocDetail(nid); }, 400);
  } catch (e) { showToast(writeError(e)); }
}
var _recurRunning = false;
async function runRecurring() {
  if (_recurRunning || !dbReady) return; _recurRunning = true;
  try {
    var list = recurList().slice(), today = todayStr(), changed = false, made = 0;
    for (var i = 0; i < list.length; i++) {
      var t = Object.assign({}, list[i]);
      if (t.kind !== 'scheduled' || t.paused || !t.next) continue;
      var guard = 0;
      while (t.next && t.next <= today && (!t.end || t.next <= t.end) && guard++ < 24) { await recurCreateDoc(t, t.next); t.prev = t.next; t.next = recurAdvance(t, t.next); made++; changed = true; }
      list[i] = t;
    }
    if (changed) { await saveRecurList(list); showToast('สร้างรายการเกิดซ้ำอัตโนมัติ ' + made + ' รายการ'); }
  } catch (e) {} finally { _recurRunning = false; }
}
function recurShell() {
  return '<div class="small muted" style="margin-bottom:4px">การบัญชี / รายการเกิดซ้ำ</div>' +
    '<div class="tx-head"><h1 class="section-title">รายการเกิดซ้ำ</h1><div class="coa-actions">' +
    '<button class="btn btn-outline" type="button" onclick="pageState.recKind=pageState.recKind===\'reminder\'?\'\':\'reminder\';renderPage()">' + (pageState.recKind === 'reminder' ? 'แสดงทั้งหมด' : 'รายการแจ้งเตือน') + '</button>' +
    '<details class="iv-new"><summary class="btn btn-dark">สร้างใหม่ ▾</summary><div class="iv-menu">' + RECUR_TYPES.map(function(t) { return '<button type="button" onclick="this.closest(\'details\').open=false;recurNew(\'' + t + '\')">' + DOC_TYPES[t].label + '</button>'; }).join('') + '</div></details></div></div>' +
    '<div class="iv-filters"><label class="coa-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input type="search" data-state="page.recQ" value="' + esc(pageState.recQ) + '" placeholder="กรองตามชื่อ"></label>' +
    '<select class="coa-select" data-state="page.recKind"><option value="">ทั้งหมด</option>' + Object.keys(RECUR_KIND).map(function(k) { return '<option value="' + k + '"' + (pageState.recKind === k ? ' selected' : '') + '>' + RECUR_KIND[k] + '</option>'; }).join('') + '</select></div>';
}
function recurData() {
  var q = (pageState.recQ || '').toLowerCase(), today = todayStr();
  var list = recurList().filter(function(t) { return (!q || (t.name + ' ' + (t.doc && t.doc.party || '')).toLowerCase().indexOf(q) >= 0) && (!pageState.recKind || t.kind === pageState.recKind); })
    .sort(function(a, b) { return a.name.localeCompare(b.name, 'th'); });
  var due = recurList().filter(function(t) { return t.kind === 'reminder' && t.next && recurAdvance({ interval:'daily', every: Number(t.remindDays) || 0 }, today) >= t.next; });
  var banner = due.length ? '<div class="banner info">ถึงกำหนดแจ้งเตือน ' + due.length + ' รายการ: ' + due.map(function(t) { return '<b>' + esc(t.name) + '</b> (' + fmtDateNum(t.next) + ') <button class="btn btn-sm btn-outline" type="button" onclick="recurUse(\'' + t.id + '\',true)">สร้างตอนนี้</button>'; }).join(' · ') + '</div>' : '';
  var rows = list.map(function(t) {
    var d = t.doc || {};
    return '<tr><td><a href="#" class="po-link" onclick="event.preventDefault();recurEdit(\'' + t.id + '\')">' + esc(t.name) + '</a>' + (t.paused ? ' <span class="status st-overdue">หยุดชั่วคราว</span>' : '') + '</td><td>' + RECUR_KIND[t.kind] + '</td><td>' + esc(DOC_TYPES[t.type] ? DOC_TYPES[t.type].label : t.type) + '</td><td>' + recurIntText(t) + '</td>' +
      '<td class="num">' + (t.prev ? fmtDateNum(t.prev) : '') + '</td><td class="num">' + (t.kind !== 'unscheduled' && t.next ? fmtDateNum(t.next) : '') + '</td><td>' + esc(d.party || '') + '</td><td class="r">' + fmtMoney(d.total || 0) + '</td>' +
      '<td class="r iv-act"><a href="#" onclick="event.preventDefault();recurUse(\'' + t.id + '\',false)">ใช้</a><details class="iv-dd"><summary>▾</summary><div class="iv-menu">' +
      '<button type="button" onclick="this.closest(\'details\').open=false;recurEdit(\'' + t.id + '\')">แก้ไขกำหนดเวลา</button>' +
      (t.kind !== 'unscheduled' ? '<button type="button" onclick="this.closest(\'details\').open=false;recurSkip(\'' + t.id + '\')">ข้ามครั้งถัดไป</button>' : '') +
      '<button type="button" onclick="this.closest(\'details\').open=false;recurPause(\'' + t.id + '\')">' + (t.paused ? 'เริ่มใช้งานต่อ' : 'หยุดชั่วคราว') + '</button>' +
      '<button type="button" onclick="this.closest(\'details\').open=false;recurDel(\'' + t.id + '\')">ลบ</button></div></details></td></tr>';
  }).join('');
  var n = list.length;
  return banner + tableOrEmpty('<th>ชื่อเทมเพลต ▲</th><th>ประเภท</th><th>ประเภทธุรกรรม</th><th>ช่วงเวลา</th><th>วันก่อนหน้า</th><th>วันถัดไป</th><th>ลูกค้า/ซัพพลายเออร์</th><th class="r">จำนวนเงิน</th><th class="r">การดำเนินการ</th>', rows,
    'ไม่มีธุรกรรมที่เกิดซ้ำที่ตรงตามเกณฑ์ — กด "สร้างใหม่" หรือกด "ทำให้เกิดเป็นประจำ" ในหน้าสร้างเอกสาร') + '<div class="iv-pager">' + (n ? '1-' + n : '0') + ' ของ ' + n + ' รายการ</div>';
}
function recurNew(type) {
  openDocForm(type);
  if (!form) return;
  form.after = 'recur';
  byId('modalTitle').textContent = 'เทมเพลตเกิดซ้ำ · ' + DOC_TYPES[type].label;
  Array.from(modalFoot.children).forEach(function(b) { if (b.textContent !== 'ยกเลิก') b.remove(); });
  var nb = document.createElement('button'); nb.type = 'button'; nb.className = 'btn btn-primary'; nb.textContent = 'ถัดไป: ตั้งกำหนดเวลา';
  nb.addEventListener('click', function() { form.after = 'recur'; saveDoc(nb); }); modalFoot.appendChild(nb);
}
function recurEdit(id) { var t = recurList().find(function(x) { return x.id === id; }); if (t) openRecurForm(t, null); }
function openRecurForm(t, docRec) {
  var isNew = !t;
  t = t || { id: 'r' + Date.now().toString(36), name: (docRec.party || '') + ' · ' + (DOC_TYPES[docRec.type] || {}).label, type: docRec.type, kind:'scheduled', interval:'monthly', every:1, day: Number((docRec.date || todayStr()).slice(8, 10)), next: recurAdvance({ interval:'monthly', every:1, day: Number((docRec.date || todayStr()).slice(8,10)) }, docRec.date || todayStr()), remindDays: 3, doc: docRec };
  var o = function(map, cur) { return Object.keys(map).map(function(k) { return '<option value="' + k + '"' + (cur === k ? ' selected' : '') + '>' + map[k] + '</option>'; }).join(''); };
  var h = '<div class="field"><label for="r_name">ชื่อเทมเพลต</label><input id="r_name" value="' + esc(t.name) + '"></div>' +
    '<div class="field-row"><div class="field"><label for="r_kind">ประเภท</label><select id="r_kind">' + o(RECUR_KIND, t.kind) + '</select></div><div class="field" id="r_rdw"><label for="r_rd">แจ้งเตือนล่วงหน้า (วัน)</label><input id="r_rd" type="number" min="0" value="' + esc(t.remindDays || 0) + '"></div></div>' +
    '<div id="r_sched"><div class="field-row"><div class="field"><label for="r_int">ช่วงเวลา</label><select id="r_int">' + o(RECUR_INT, t.interval) + '</select></div><div class="field"><label for="r_every">ทุกๆ</label><input id="r_every" type="number" min="1" value="' + esc(t.every || 1) + '"></div></div>' +
    '<div class="field-row"><div class="field"><label for="r_next">วันที่ครั้งถัดไป</label><input id="r_next" type="date" value="' + esc(t.next || todayStr()) + '"></div><div class="field"><label for="r_end">วันที่สิ้นสุด (ถ้ามี)</label><input id="r_end" type="date" value="' + esc(t.end || '') + '"></div></div></div>' +
    '<div class="banner info small">' + esc((DOC_TYPES[t.type] || {}).label || '') + ' · ' + esc(t.doc.party || '') + ' · ' + fmtMoney(t.doc.total || 0) + ' — "ตามกำหนดการ" ระบบจะสร้างเอกสารให้อัตโนมัติเมื่อถึงวัน, "แจ้งเตือน" จะเตือนให้กดสร้างเอง</div>' +
    '<div class="form-error" id="formError" hidden></div>';
  openModal({ title: isNew ? 'ตั้งกำหนดเวลารายการเกิดซ้ำ' : 'แก้ไขรายการเกิดซ้ำ', body: h, buttons: [CANCEL_BTN, { label:'บันทึกเทมเพลต', cls:'btn-primary', onClick: async function(btn) {
    var nt = Object.assign({}, t, { name: byId('r_name').value.trim() || t.name, kind: byId('r_kind').value, interval: byId('r_int').value, every: Math.max(1, Number(byId('r_every').value) || 1), next: byId('r_next').value, end: byId('r_end').value, remindDays: Number(byId('r_rd').value) || 0 });
    nt.day = Number((nt.next || todayStr()).slice(8, 10));
    if (nt.kind !== 'unscheduled' && !nt.next) { var e = byId('formError'); e.textContent = 'ระบุวันที่ครั้งถัดไป'; e.hidden = false; return; }
    btn.disabled = true;
    try {
      var list = recurList().filter(function(x) { return x.id !== nt.id; }).concat([nt]);
      await saveRecurList(list); closeModal(); showToast('บันทึกเทมเพลต "' + nt.name + '" แล้ว');
      if (route.child !== 'recurring') go('accounting', 'recurring'); else renderPage();
      setTimeout(runRecurring, 300);
    } catch (e) { showToast(writeError(e)); btn.disabled = false; }
  } }], onMount: function() {
    var sync = function() { var k = byId('r_kind').value; byId('r_sched').hidden = k === 'unscheduled'; byId('r_rdw').hidden = k !== 'reminder'; };
    byId('r_kind').addEventListener('change', sync); sync();
  } });
}
async function recurSkip(id) { var list = recurList().map(function(t) { return t.id === id ? Object.assign({}, t, { next: recurAdvance(t, t.next || todayStr()) }) : t; }); await saveRecurList(list); showToast('ข้ามครั้งถัดไปแล้ว'); }
async function recurPause(id) { var list = recurList().map(function(t) { return t.id === id ? Object.assign({}, t, { paused: !t.paused }) : t; }); await saveRecurList(list); }
async function recurDel(id) { if (!confirmInline(id)) return; await saveRecurList(recurList().filter(function(t) { return t.id !== id; })); showToast('ลบเทมเพลตแล้ว'); }
var _recDelArm = null;
function confirmInline(id) { if (_recDelArm === id) { _recDelArm = null; return true; } _recDelArm = id; showToast('กด "ลบ" อีกครั้งเพื่อยืนยัน'); setTimeout(function() { if (_recDelArm === id) _recDelArm = null; }, 4000); return false; }
