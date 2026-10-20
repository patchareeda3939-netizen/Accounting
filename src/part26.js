/* ---- Journals by type (สมุดรายวันแยกประเภท) ---- */
var JN_NEW = { sales:[['invoice','ใบแจ้งหนี้ (ขายเชื่อ)'],['creditNote','ใบลดหนี้']], purchase:[['bill','บิลซื้อ (ซื้อเชื่อ)'],['vendorCredit','เครดิตจากผู้ขาย']], receipt:[['@pay','รับชำระใบแจ้งหนี้'],['receipt','ใบเสร็จรับเงิน (ขายเงินสด)'],['bankDeposit','ฝากเงินธนาคาร']], payment:[['expense','ค่าใช้จ่าย (จ่ายเงินสด)'],['checkPayment','จ่ายเช็ค'],['@paybill','จ่ายชำระบิล']], general:[['journalEntry','สมุดรายวันทั่วไป'],['transfer','โอนเงินระหว่างบัญชี'],['inventoryAdjust','ปรับจำนวนสินค้า']] };
function jnNew(k) {
  if (k === '@pay') { go('sales', 'invoice'); return showToast('เลือกใบแจ้งหนี้ที่ค้างชำระ แล้วกด "รับชำระเงิน"'); }
  if (k === '@paybill') { go('billing', 'bill'); return showToast('เลือกบิลที่ค้างชำระ แล้วกด "จ่ายชำระ"'); }
  openDocForm(k);
}
var JOURNALS = [['sales','สมุดรายวันขาย','SJ'],['purchase','สมุดรายวันซื้อ','PJ'],['receipt','สมุดรายวันรับเงิน','RV'],['payment','สมุดรายวันจ่ายเงิน','PV'],['general','สมุดรายวันทั่วไป','JV']];
pageState.jnTab = 'sales'; pageState.jnPeriod = 'month'; pageState.jnQ = '';
function jnCashCodes() { var m = {}; m[SYS.cash] = 1; m[SYS.bank] = 1; STORE.accounts.forEach(function(a) { var s = accSubtype(a); if (s === 'bank' || s === 'cash') m[a.code] = 1; }); return m; }
function jnEntries() {
  var cash = jnCashCodes(), out = [];
  STORE.documents.forEach(function(d) {
    if (d.voided) return;
    var groups = {}, order = [];
    postingsOf(d).forEach(function(l) { var k = (l.date === d.date && !l.memo) ? 'main' : l.date + '|' + (l.date === d.date ? 'x' : ''); if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(l); });
    if (groups.main && order.length > 1) { // merge same-date memo lines that belong to the main entry when they don't touch cash
      order.filter(function(k) { return k !== 'main' && groups[k][0].date === d.date && !groups[k].some(function(l) { return cash[l.code]; }); }).forEach(function(k) { groups.main = groups.main.concat(groups[k]); delete groups[k]; order.splice(order.indexOf(k), 1); });
    }
    order.forEach(function(k) {
      var ls = groups[k]; if (!ls || !ls.length) return;
      var cd = ls.filter(function(l) { return cash[l.code]; }), inC = cd.some(function(l) { return l.dr > 0; }), outC = cd.some(function(l) { return l.cr > 0; });
      var nonCash = ls.some(function(l) { return !cash[l.code]; });
      var j = cd.length && nonCash ? (inC && !outC ? 'receipt' : outC && !inC ? 'payment' : 'general') : (cd.length ? 'general' : d.group === 'customer' ? 'sales' : d.group === 'supplier' ? 'purchase' : 'general');
      if (isYearClose(d) || (d.extra && d.extra.openingFor)) j = 'general';
      out.push({ j: j, d: d, date: ls[0].date, lines: ls, memo: (ls.find(function(l) { return l.memo; }) || {}).memo || '' });
    });
  });
  return out.sort(function(a, b) { return (a.date || '').localeCompare(b.date || '') || String(a.d.docNo || '').localeCompare(String(b.d.docNo || '')); });
}
function jnShell() {
  return '<div class="small muted" style="margin-bottom:4px">เอกสารทั้งหมด / สมุดรายวัน</div><div class="tx-head"><h1 class="section-title">สมุดรายวันแยกประเภท</h1></div>';
}
pageState.jnIdx = null;
function jnNumbered() { // stable journal numbers per type and month, in date order over all entries
  var seq = {};
  return jnEntries().map(function(e) { var pref = (JOURNALS.find(function(t) { return t[0] === e.j; }) || [])[2], ym = (e.date || '').slice(0, 7).replace('-', ''), k = pref + ym; seq[k] = (seq[k] || 0) + 1; e.no = pref + '-' + ym + '-' + String(seq[k]).padStart(3, '0'); return e; });
}
function jnSet(k, v) { pageState[k] = v; pageState.jnIdx = null; refreshPageData(); }
function jnData() {
  var r = periodRange(pageState.jnPeriod), q = (pageState.jnQ || '').toLowerCase();
  var all = jnNumbered().filter(function(e) { return inRange(e.date || '', r) && (!q || [e.no, e.d.docNo, e.d.party, e.d.typeLabel, e.memo].join(' ').toLowerCase().indexOf(q) >= 0); });
  var cnt = {}; all.forEach(function(e) { cnt[e.j] = (cnt[e.j] || 0) + 1; });
  var list = all.filter(function(e) { return e.j === pageState.jnTab; });
  var cur = JOURNALS.find(function(t) { return t[0] === pageState.jnTab; }), opts = JN_NEW[pageState.jnTab] || [];
  var newBtn = '<details class="iv-new jn-new"><summary class="btn btn-dark">บันทึก' + esc(cur[1]) + ' ▾</summary><div class="iv-menu">' + opts.map(function(o) { return '<button type="button" onclick="this.closest(\'details\').open=false;jnNew(\'' + o[0] + '\')">' + esc(o[1]) + '</button>'; }).join('') + '</div></details>';
  var sel = function(st, o) { return '<select class="coa-select" onchange="jnSet(\'' + st + '\',this.value)">' + o.map(function(x) { return '<option value="' + x[0] + '"' + (pageState[st] === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>'; };
  var h = '<div class="jn-top"><button class="btn btn-outline" type="button" onclick="jnExport()">ส่งออก CSV</button>' + newBtn + '</div>' +
    '<div class="jn-tabs">' + JOURNALS.map(function(t) { return '<button type="button" class="' + (pageState.jnTab === t[0] ? 'on' : '') + '" onclick="jnSet(\'jnTab\',\'' + t[0] + '\')">' + t[1] + ' <span class="jn-n">' + (cnt[t[0]] || 0) + '</span></button>'; }).join('') + '</div>' +
    '<div class="iv-filters"><div class="field"><span class="iv-lbl">ช่วงวันที่</span>' + sel('jnPeriod', [['month','เดือนนี้'],['quarter','ไตรมาสนี้'],['year','ปีนี้'],['last12','12 เดือนที่ผ่านมา'],['all','ทั้งหมด']]) + '</div>' +
    '<label class="coa-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input type="search" value="' + esc(pageState.jnQ) + '" placeholder="ค้นหาเลขสมุด เลขที่เอกสาร คู่ค้า" onchange="jnSet(\'jnQ\',this.value)"></label>' +
    (list.length ? '<div class="field"><span class="iv-lbl">ไปที่รายการ</span><select class="coa-select" onchange="pageState.jnIdx=Number(this.value);refreshPageData()">' + list.map(function(e, i) { return '<option value="' + i + '">' + esc(e.no + ' · ' + (e.d.docNo || '')) + '</option>'; }).join('') + '</select></div>' : '') + '</div>';
  if (!list.length) return h + '<div class="yc-card adj-empty"><b>ไม่มีรายการ</b><div>ไม่มีรายการใน' + esc(cur[1]) + 'ในช่วงเวลานี้</div></div>';
  var i = pageState.jnIdx == null || pageState.jnIdx >= list.length ? list.length - 1 : Math.max(0, pageState.jnIdx); pageState.jnIdx = i;
  h = h.replace('<option value="' + i + '">', '<option value="' + i + '" selected>');
  var e = list[i], dr = 0, cr = 0;
  var lines = e.lines.slice().sort(function(a, b) { return (b.dr > 0) - (a.dr > 0); }).map(function(l) { dr += l.dr; cr += l.cr;
    return '<tr><td class="num">' + esc(l.code) + '</td><td' + (l.cr > 0 && !l.dr ? ' class="jn-cr"' : '') + '>' + esc(acctName(l.code) || '') + (l.memo ? '<div class="small muted">' + esc(l.memo) + '</div>' : '') + '</td><td class="r">' + (l.dr ? fmtMoney(l.dr) : '') + '</td><td class="r">' + (l.cr ? fmtMoney(l.cr) : '') + '</td></tr>'; }).join('');
  var nav = function(pos) { return '<div class="jn-nav ' + pos + '"><button type="button" class="btn btn-outline btn-sm" ' + (i <= 0 ? 'disabled' : 'onclick="pageState.jnIdx=0;refreshPageData()"') + '>« แรก</button><button type="button" class="btn btn-outline" ' + (i <= 0 ? 'disabled' : 'onclick="pageState.jnIdx=' + (i - 1) + ';refreshPageData()"') + '>‹ ก่อนหน้า</button><span><b>' + (i + 1) + '</b> / ' + list.length + '</span><button type="button" class="btn btn-outline" ' + (i >= list.length - 1 ? 'disabled' : 'onclick="pageState.jnIdx=' + (i + 1) + ';refreshPageData()"') + '>ถัดไป ›</button><button type="button" class="btn btn-outline btn-sm" ' + (i >= list.length - 1 ? 'disabled' : 'onclick="pageState.jnIdx=' + (list.length - 1) + ';refreshPageData()"') + '>ล่าสุด »</button></div>'; };
  var lk = lockDate(), locked = lk && (e.date <= lk || (e.d.date || '') <= lk), isPay = e.lines.some(function(l) { return l.date !== e.d.date || /ชำระ/.test(l.memo || ''); }) && !e.lines.some(function(l) { return !l.memo && l.date === e.d.date; });
  var editBtns = locked ? '<span class="small muted">🔒 งวดถูกล็อกถึง ' + fmtDateNum(lk) + ' — ปลดล็อกที่หน้าปิดงบรายเดือนเพื่อแก้ไข</span>'
    : (isPay ? '<button class="btn btn-outline btn-sm" type="button" onclick="openDocDetail(\'' + e.d._id + '\')">✎ แก้ไขการรับ/จ่ายชำระ</button>' : '') +
      '<button class="btn btn-dark btn-sm" type="button" onclick="jnEdit(\'' + e.d._id + '\')">✎ แก้ไขรายการ</button>';
  h += '<div class="yc-card jn-card"><div class="jn-head"><div><div class="jn-no">' + esc(e.no) + '</div><div class="muted">' + esc(cur[1]) + '</div><div class="jn-edit">' + editBtns + '</div></div>' +
    '<div class="jn-meta"><div><span>วันที่</span><b>' + fmtDateNum(e.date) + '</b></div><div><span>อ้างอิงเอกสาร</span><b><a href="#" class="po-link" data-doc="' + esc(e.d._id) + '" onclick="event.preventDefault()">' + esc(e.d.docNo || '-') + '</a></b></div><div><span>ประเภทเอกสาร</span><b>' + esc(e.d.typeLabel || '') + '</b></div><div><span>คู่ค้า</span><b>' + esc(e.d.party || '-') + '</b></div></div></div>' +
    '<div class="table-wrap coa-table"><table class="data-table jn-table"><thead><tr><th style="width:110px">รหัสบัญชี</th><th>ชื่อบัญชี</th><th class="r" style="width:170px">เดบิต</th><th class="r" style="width:170px">เครดิต</th></tr></thead><tbody>' + lines + '</tbody>' +
    '<tfoot><tr class="tot"><td colspan="2">รวม' + (Math.abs(dr - cr) > 0.01 ? ' <span class="neg-text">(ไม่สมดุล)</span>' : '') + '</td><td class="r">' + fmtMoney(dr) + '</td><td class="r">' + fmtMoney(cr) + '</td></tr></tfoot></table></div>' +
    '<div class="jn-desc"><span class="muted">คำอธิบาย:</span> ' + esc((e.d.typeLabel || '') + ' ' + (e.d.docNo || '') + (e.d.party ? ' · ' + e.d.party : '') + (e.memo ? ' · ' + e.memo : '') + (e.d.extra && e.d.extra.note ? ' · ' + e.d.extra.note : '')) + '</div>' + nav('') + '</div>';
  return h + '<p class="small muted">เลขสมุดรายวัน: SJ = ขาย, PJ = ซื้อ, RV = รับเงิน, PV = จ่ายเงิน, JV = ทั่วไป ตามด้วยปีเดือนและลำดับ (เรียงตามวันที่) · ใช้ปุ่ม ← → บนคีย์บอร์ดเพื่อเลื่อนรายการ</p>';
}
document.addEventListener('keydown', function(ev) {
  if (typeof route === 'undefined' || route.key !== 'alldocs' || route.child !== 'journals' || /INPUT|SELECT|TEXTAREA/.test((ev.target || {}).tagName || '') || document.querySelector('#overlay.open')) return;
  if (ev.key === 'ArrowLeft' && pageState.jnIdx > 0) { pageState.jnIdx--; refreshPageData(); }
  else if (ev.key === 'ArrowRight') { pageState.jnIdx = (pageState.jnIdx || 0) + 1; refreshPageData(); }
});
function jnExport() {
  var r = periodRange(pageState.jnPeriod), t = (JOURNALS.find(function(x) { return x[0] === pageState.jnTab; }) || [])[1];
  var rows = [['สมุด','เลขสมุดรายวัน','วันที่','เลขที่เอกสาร','ประเภท','คู่ค้า','รหัสบัญชี','ชื่อบัญชี','เดบิต','เครดิต']];
  jnNumbered().filter(function(e) { return e.j === pageState.jnTab && inRange(e.date || '', r); }).forEach(function(e) { e.lines.forEach(function(l) { rows.push([t, e.no, e.date, e.d.docNo || '', e.d.typeLabel || '', e.d.party || '', l.code, acctName(l.code) || '', l.dr || '', l.cr || '']); }); });
  var csv = '﻿' + rows.map(function(rw) { return rw.map(function(v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' })); a.download = t + '.csv'; document.body.appendChild(a); a.click(); a.remove();
}
document.addEventListener('click', function(e) { document.querySelectorAll('details.iv-new[open], details.iv-dd[open]').forEach(function(d) { if (!d.contains(e.target)) d.open = false; }); });
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') document.querySelectorAll('details.iv-new[open], details.iv-dd[open]').forEach(function(d) { d.open = false; }); });

/* repair: receipts created separately for an invoice that was already paid (would double-count revenue) */
var _rcptFixing = false;
async function fixOrphanReceipts() {
  if (_rcptFixing || !dbReady) return; _rcptFixing = true;
  try {
    var n = 0;
    for (var i = 0; i < STORE.documents.length; i++) {
      var r = STORE.documents[i], ex = r.extra || {};
      if (r.type !== 'receipt' || r.voided || ex.invoiceId || !ex.refDoc) continue;
      var inv = STORE.documents.find(function(d) { return d.type === 'invoice' && d.docNo === ex.refDoc && !d.voided; }); if (!inv) continue;
      var tot = Number(r.total) || 0, pays = (inv.payments || []).slice(), j = pays.findIndex(function(p) { return !p.receiptId && Math.abs((Number(p.amount) || 0) + (Number(p.wht) || 0) + (Number(p.fee) || 0) - tot) < 0.02; });
      if (j < 0) continue;
      pays[j] = Object.assign({}, pays[j], { receiptId: r._id, ref: [pays[j].ref, r.docNo].filter(Boolean).join(' · ') });
      await setRec('documents', inv._id, Object.assign({}, strip(inv), { payments: pays, updatedAt: Date.now() }));
      await setRec('documents', r._id, Object.assign({}, strip(r), { extra: Object.assign({}, ex, { invoiceId: inv._id, linkedFix: true }), updatedAt: Date.now() }));
      n++;
    }
    if (n) showToast('ผูกใบเสร็จที่ออกซ้ำกับการรับชำระเดิม ' + n + ' รายการ (แก้รายได้ซ้ำ)');
  } catch (e) {} finally { _rcptFixing = false; }
}

function jnEdit(id) {
  var d = findDoc(id); if (!d) return;
  if (isYearClose(d)) { showToast('รายการปิดบัญชีสิ้นปี แก้ไขโดยประมวลผลใหม่ที่หน้าปิดบัญชีสิ้นปี'); return go('accounting', 'yearClose'); }
  if (d.type === 'inventoryAdjust') return openInvAdjForm(d);
  if (DOC_TYPES[d.type] && !DOC_TYPES[d.type].action) return openDocForm(d.type, d);
  openDocDetail(id);
}
