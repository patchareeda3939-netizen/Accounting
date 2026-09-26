/* ================= Bank statement import & matching for reconcile ================= */
rec.stmt = null; rec.match = {}; rec.selS = null;
var STMT_FIELDS = IMP_FIELDS.bank.filter(function(f) { return f.key !== 'ref'; }).concat([{ key:'balance', label:'ยอดคงเหลือ', syn:['balance','คงเหลือ','ยอดคงเหลือ','running balance'] }, { key:'ref', label:'เลขอ้างอิง', syn:['ref','reference','เลขที่อ้างอิง','cheque no','เช็ค'] }]);
function bookSigned(l) { return round2(reconSign(rec.acc) * (l.dr - l.cr)); }
function daysBetween(a, b) { return Math.abs((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 864e5); }
function openStmtImport() {
  var st = { headers:[], rows:[], map:{} };
  var body = '<p class="small muted" style="margin:0">นำเข้าไฟล์รายการเดินบัญชี (Statement) จากธนาคารเป็น CSV, Excel หรือ PDF ระบบจะจับคู่กับรายการในบัญชีให้อัตโนมัติ (ยอดเงินเท่ากัน วันที่ห่างไม่เกิน 7 วัน)</p>' +
    '<div class="field"><label for="stFile">ไฟล์ Statement (CSV, Excel หรือ PDF)</label><input id="stFile" type="file" accept=".csv,.txt,.xlsx,.xls,.pdf,application/pdf"></div><div class="field" id="stPwBox" hidden><label for="stPw">รหัสผ่าน PDF</label><input id="stPw" type="password" autocomplete="off" placeholder="ธนาคารมักใช้วันเกิดหรือเลขบัตรประชาชน"><div class="small muted">ใส่แล้วกดเลือกไฟล์อีกครั้ง หรือกด Enter</div></div><div id="stMap"></div><div id="stPrev"></div><div class="form-error" id="formError" hidden></div>';
  function build() {
    var out = [];
    st.rows.forEach(function(r) {
      var g = function(k) { var i = st.map[k]; return i == null ? '' : String(r[i] == null ? '' : r[i]).trim(); };
      var date = impDate(g('date')), amt = impNum(g('amount'));
      if (st.map.amount == null || g('amount') === '' || isNaN(amt)) amt = (impNum(g('deposit')) || 0) - (impNum(g('withdraw')) || 0);
      amt = round2(amt); if (!date || !amt) return;
      var bal = impNum(g('balance'));
      out.push({ date: date, desc: g('desc') || '-', ref: g('ref'), amt: amt, bal: isNaN(bal) || g('balance') === '' ? null : round2(bal) });
    });
    return out.sort(function(a, b) { return a.date.localeCompare(b.date); });
  }
  function prev() {
    var list = build(), el = byId('stPrev'); st.list = list;
    if (!list.length) { el.innerHTML = '<div class="banner bad">ยังไม่พบรายการ ตรวจการจับคู่คอลัมน์วันที่และจำนวนเงิน</div>'; return; }
    var inn = list.filter(function(x) { return x.amt > 0; }).reduce(function(s, x) { return s + x.amt; }, 0), out = list.filter(function(x) { return x.amt < 0; }).reduce(function(s, x) { return s - x.amt; }, 0);
    el.innerHTML = '<div class="banner ok">' + list.length + ' รายการ · ' + fmtDateNum(list[0].date) + ' – ' + fmtDateNum(list[list.length - 1].date) + ' · เข้า ' + fmtMoney(round2(inn)) + ' · ออก ' + fmtMoney(round2(out)) + (list[list.length - 1].bal != null ? ' · ยอดคงเหลือปลายงวด ' + fmtMoney(list[list.length - 1].bal) : '') + '</div>';
  }
  openModal({ title:'นำเข้า Statement ธนาคาร', body: body, focus:false, buttons:[CANCEL_BTN, { label:'นำเข้าและจับคู่', cls:'btn-dark', onClick: function() {
    var err = byId('formError'); if (!st.list || !st.list.length) { err.textContent = 'เลือกไฟล์ก่อน'; err.hidden = false; return; }
    rec.stmt = st.list.map(function(x, i) { return Object.assign({ i: i }, x); }); rec.match = {}; rec.selS = null;
    var last = rec.stmt[rec.stmt.length - 1];
    if (rec.stage === 'start') {
      rec.end = last.date; if (last.bal != null) rec.endBal = String(last.bal);
      var f0 = rec.stmt[0]; if (f0.bal != null && !(reconDoc(rec.acc).history || []).length) { rec.begBal = String(round2(f0.bal - f0.amt)); var eb0 = byId('recBeg'); if (eb0) eb0.value = rec.begBal; }
      var e1 = byId('recEnd'), e2 = byId('recEndBal'); if (e1) e1.value = rec.end; if (e2 && last.bal != null) e2.value = rec.endBal;
    } else { if (last.date > rec.end) rec.end = last.date; if (last.bal != null) rec.endBal = String(last.bal); }
    closeModal();
    if (rec.stage === 'work') { stmtAutoMatch(); showToast('จับคู่อัตโนมัติ ' + Object.keys(rec.match).length + '/' + rec.stmt.length + ' รายการ'); }
    else showToast('นำเข้า ' + rec.stmt.length + ' รายการแล้ว กดเริ่มกระทบยอดเพื่อจับคู่');
    refreshPageData();
  } }], onMount: function() {
    byId('stFile').addEventListener('change', async function(e) {
      var f = e.target.files[0], err = byId('formError'); if (!f) return; err.hidden = true;
      try {
        var rows;
        if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') {
          byId('stPrev').innerHTML = '<div class="banner info">กำลังอ่าน PDF…</div>';
          var lines;
          try { lines = await pdfLines(f, (byId('stPw') || {}).value); }
          catch (pe) { if (pe && (pe.name === 'PasswordException' || /password/i.test(pe.message || ''))) { byId('stPwBox').hidden = false; byId('stPrev').innerHTML = ''; var pw = byId('stPw'); pw.focus(); pw.onkeydown = function(ev) { if (ev.key === 'Enter') { ev.preventDefault(); byId('stFile').dispatchEvent(new Event('change')); } }; throw new Error(pe.code === 2 ? 'รหัสผ่านไม่ถูกต้อง' : 'ไฟล์ PDF นี้มีรหัสผ่าน กรุณาใส่รหัสผ่าน'); } throw pe; }
          if (!lines.some(function(l) { return l.length; })) throw new Error('PDF นี้ไม่มีข้อความ (อาจเป็นไฟล์สแกนเป็นรูปภาพ) กรุณาใช้ไฟล์ Excel/CSV จากธนาคารแทน');
          rows = pdfStatementTable(lines);
          if (!rows) throw new Error('ไม่พบรายการที่ขึ้นต้นด้วยวันที่ใน PDF นี้ กรุณาใช้ไฟล์ Excel/CSV จากธนาคารแทน');
        }
        else if (/\.xlsx?$/i.test(f.name)) { await loadXlsxLib(); var wb = XLSX.read(await f.arrayBuffer(), { type:'array', cellDates:true }); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header:1, defval:'', raw:false, dateNF:'yyyy-mm-dd' }); }
        else rows = parseCsv((await f.text()).replace(/^﻿/, ''));
        rows = rows.filter(function(r) { return r.some(function(c) { return String(c).trim() !== ''; }); });
        // header row = first row that auto-maps a date column (bank files often have title lines)
        var hi = 0; for (var k = 0; k < Math.min(rows.length, 15); k++) { var m = autoMap(rows[k].map(String), STMT_FIELDS); if (m.date != null && (m.amount != null || m.deposit != null || m.withdraw != null)) { hi = k; break; } }
        st.headers = rows[hi].map(function(h) { return String(h).trim(); }); st.rows = rows.slice(hi + 1); st.map = autoMap(st.headers, STMT_FIELDS);
        byId('stMap').innerHTML = '<h3 class="imp-h">จับคู่คอลัมน์</h3><div class="imp-map">' + STMT_FIELDS.map(function(fl) { return '<label>' + esc(fl.label) + '</label><select data-stm="' + fl.key + '"><option value="">— ไม่ใช้ —</option>' + st.headers.map(function(h, i) { return '<option value="' + i + '"' + (st.map[fl.key] === i ? ' selected' : '') + '>' + esc(h || 'คอลัมน์ ' + (i + 1)) + '</option>'; }).join('') + '</select>'; }).join('') + '</div>';
        byId('stMap').querySelectorAll('[data-stm]').forEach(function(s) { s.onchange = function() { if (s.value === '') delete st.map[s.dataset.stm]; else st.map[s.dataset.stm] = Number(s.value); prev(); }; });
        prev();
      } catch (ex) { err.textContent = ex.message || 'อ่านไฟล์ไม่ได้'; err.hidden = false; }
    });
  } });
}
function stmtBookPool() { var done = reconClearedSet(rec.acc); return reconLines(rec.acc).filter(function(l) { return !done[l.key]; }); }
function stmtAutoMatch() {
  if (!rec.stmt) return;
  var used = {}; Object.keys(rec.match).forEach(function(s) { used[rec.match[s]] = 1; });
  var pool = stmtBookPool();
  rec.stmt.forEach(function(s) {
    if (rec.match[s.i]) return;
    var best = null, bd = 99;
    pool.forEach(function(l) { if (used[l.key] || bookSigned(l) !== s.amt) return; var dd = daysBetween(l.date, s.date); if (dd <= 7 && dd < bd) { bd = dd; best = l; } });
    if (best) { rec.match[s.i] = best.key; used[best.key] = 1; rec.cleared[best.key] = 1; }
  });
}
function reconStmtBar() {
  if (!reconIsBank(rec.acc)) return '';
  if (!rec.stmt) return '<div class="stmt-bar"><span>มีไฟล์ Statement จากธนาคาร? นำเข้าเพื่อจับคู่รายการอัตโนมัติ</span><button type="button" class="btn btn-outline" data-stmtimp>นำเข้า Statement ธนาคาร</button></div>';
  var n = Object.keys(rec.match).length, last = rec.stmt[rec.stmt.length - 1];
  return '<div class="stmt-bar"><span>Statement ' + rec.stmt.length + ' รายการ · จับคู่แล้ว <b>' + n + '</b> · ยังไม่จับคู่ <b' + (n < rec.stmt.length ? ' class="neg-text"' : '') + '>' + (rec.stmt.length - n) + '</b>' + (last.bal != null ? ' · ยอดคงเหลือตาม Statement ' + fmtMoney(last.bal) : '') + '</span>' +
    '<span class="toolbar" style="margin:0"><button type="button" class="btn btn-outline btn-sm" data-stmtauto>จับคู่อัตโนมัติอีกครั้ง</button><button type="button" class="btn btn-outline btn-sm" data-stmtimp>นำเข้าไฟล์ใหม่</button><button type="button" class="btn btn-outline btn-sm" data-stmtclear>ปิด Statement</button></span></div>';
}
function reconMatchHTML(lines) {
  var byKey = {}; stmtBookPool().forEach(function(l) { byKey[l.key] = l; });
  var matchedBook = {}; Object.keys(rec.match).forEach(function(s) { matchedBook[rec.match[s]] = Number(s); });
  var incs = STORE.accounts.filter(function(a) { return a.code !== rec.acc; }).sort(function(a, b) { return String(a.code).localeCompare(String(b.code)); });
  var left = rec.stmt.map(function(s) {
    var mk = rec.match[s.i], l = mk && byKey[mk], sel = rec.selS === s.i;
    var right = l ? '<div class="stm-book"><span class="stm-ok">✓ จับคู่</span> ' + esc((l.d.docNo || '') + ' · ' + (l.d.party || '')) + ' · ' + fmtDateNum(l.date) + ' <button type="button" class="linkish" data-unmatch="' + s.i + '">ยกเลิกคู่</button></div>'
      : '<div class="stm-book"><span class="stm-no">ยังไม่มีคู่</span> ' + (sel ? '<b>เลือกรายการในบัญชีด้านขวาเพื่อจับคู่</b> · ' : '<button type="button" class="linkish" data-sels="' + s.i + '">จับคู่เอง</button> · ') +
        '<select data-stacc="' + s.i + '" aria-label="บัญชีคู่"><option value="">บันทึกเป็นรายการใหม่ในบัญชี…</option>' + incs.map(function(a) { return '<option value="' + esc(a.code) + '">' + esc(a.code + ' ' + a.name) + '</option>'; }).join('') + '</select></div>';
    return '<div class="stm-row' + (l ? ' ok' : '') + (sel ? ' sel' : '') + '"><div class="stm-main"><span class="num">' + fmtDateNum(s.date) + '</span><span class="stm-desc">' + esc(s.desc) + (s.ref ? ' <span class="muted small">' + esc(s.ref) + '</span>' : '') + '</span><b class="' + (s.amt < 0 ? 'neg-text' : 'pos-text') + '">' + (s.amt > 0 ? '+' : '') + fmtMoney(s.amt) + '</b></div>' + right + '</div>';
  }).join('');
  var rightRows = lines.map(function(l) {
    var on = !!rec.cleared[l.key], m = matchedBook[l.key] != null, amt = bookSigned(l);
    return '<tr class="rec-row' + (on ? ' on' : '') + (rec.selS != null && !m ? ' pick' : '') + '" data-reck="' + esc(l.key) + '"><td class="num">' + fmtDateNum(l.date) + '</td><td>' + esc(l.d.docNo || '') + '<div class="small muted">' + esc(l.d.party || '') + '</div></td><td class="r ' + (amt < 0 ? 'neg-text' : '') + '">' + fmtMoney(amt) + '</td><td class="c">' + (m ? '<span class="stm-ok" title="จับคู่กับ Statement">🔗</span>' : '') + '<input type="checkbox" data-recc="' + esc(l.key) + '"' + (on ? ' checked' : '') + ' aria-label="กระทบแล้ว"></td></tr>';
  }).join('');
  return '<div class="stm-grid"><div><h3 class="imp-h">Statement ธนาคาร</h3><div class="stm-list">' + left + '</div></div>' +
    '<div><h3 class="imp-h">รายการในบัญชี (ยังไม่กระทบ)</h3><div class="items-wrap"><table class="data-table rec-table"><thead><tr><th>วันที่</th><th>เอกสาร</th><th class="r">จำนวน</th><th class="c"></th></tr></thead><tbody>' + (rightRows || '<tr><td colspan="4" class="empty-hint">ไม่มีรายการ</td></tr>') + '</tbody></table></div></div></div>';
}
function bindStmt(c) {
  c.querySelectorAll('[data-stmtimp]').forEach(function(b) { b.onclick = openStmtImport; });
  c.querySelectorAll('[data-stmtauto]').forEach(function(b) { b.onclick = function() { stmtAutoMatch(); refreshPageData(); }; });
  c.querySelectorAll('[data-stmtclear]').forEach(function(b) { b.onclick = function() { rec.stmt = null; rec.match = {}; rec.selS = null; refreshPageData(); }; });
  c.querySelectorAll('[data-unmatch]').forEach(function(b) { b.onclick = function() { var k = rec.match[b.dataset.unmatch]; delete rec.match[b.dataset.unmatch]; if (k) delete rec.cleared[k]; refreshPageData(); }; });
  c.querySelectorAll('[data-sels]').forEach(function(b) { b.onclick = function() { rec.selS = Number(b.dataset.sels); refreshPageData(); }; });
  c.querySelectorAll('[data-stacc]').forEach(function(s) { s.onchange = async function() {
    if (!s.value) return;
    var st = rec.stmt[Number(s.dataset.stacc)], a = Math.abs(st.amt), bank = rec.acc, other = s.value, dr = st.amt > 0 ? bank : other, cr = st.amt > 0 ? other : bank;
    s.disabled = true;
    var before = {}; reconLines(bank).forEach(function(l) { before[l.key] = 1; });
    await addRec('documents', { type:'journalEntry', typeLabel: DOC_TYPES.journalEntry.label, group:'other', party: st.desc, date: st.date, docNo: nextDocNo('journalEntry', st.date),
      items: [{ account: dr + ' ' + acctName(dr), debit: a, credit: 0 }, { account: cr + ' ' + acctName(cr), debit: 0, credit: a }], total: a, extra: { bankTx: st.amt > 0 ? 'in' : 'out', ref: st.ref, fromStatement: true }, status:'done', createdAt: Date.now() });
    var nl = reconLines(bank).find(function(l) { return !before[l.key]; });
    if (nl) { rec.match[st.i] = nl.key; rec.cleared[nl.key] = 1; }
    showToast('บันทึกรายการและจับคู่แล้ว'); refreshPageData();
  }; });
  if (rec.stmt && rec.selS != null) {
    c.querySelectorAll('.rec-row.pick').forEach(function(tr) { tr.addEventListener('click', function(e) {
      e.stopImmediatePropagation(); if (e.target.tagName === 'INPUT') return;
      var st = rec.stmt[rec.selS], l = stmtBookPool().find(function(x) { return x.key === tr.dataset.reck; });
      if (l && bookSigned(l) !== st.amt && !confirmMismatch(st, l)) return;
      rec.match[st.i] = tr.dataset.reck; rec.cleared[tr.dataset.reck] = 1; rec.selS = null; refreshPageData();
    }, true); });
  }
}
function confirmMismatch(st, l) { showToast('ยอดไม่ตรงกัน (' + fmtMoney(st.amt) + ' กับ ' + fmtMoney(bookSigned(l)) + ') เลือกรายการที่ยอดเท่ากัน'); return false; }

/* ---- PDF statements (text-based PDFs, incl. password-protected) ---- */
var TH_MON = { 'ม.ค.':1,'ก.พ.':2,'มี.ค.':3,'เม.ย.':4,'พ.ค.':5,'มิ.ย.':6,'ก.ค.':7,'ส.ค.':8,'ก.ย.':9,'ต.ค.':10,'พ.ย.':11,'ธ.ค.':12, jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
function normYear(y) { y = Number(y); if (y < 100) { var cur = new Date().getFullYear() % 100; y = y > cur + 5 ? 2500 + y - 543 : 2000 + y; } if (y > 2400) y -= 543; return y; }
var PDF_DATE_RE = /^\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})|^\s*(\d{1,2})\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(\d{2,4})|^\s*(\d{4})-(\d{2})-(\d{2})/i;
function pdfDate(s) {
  var m = String(s).match(PDF_DATE_RE); if (!m) return null;
  var d, mo, y;
  if (m[1]) { d = m[1]; mo = m[2]; y = m[3]; } else if (m[4]) { d = m[4]; mo = TH_MON[m[5].toLowerCase()] || TH_MON[m[5]]; y = m[6]; } else { y = m[7]; mo = m[8]; d = m[9]; }
  y = normYear(y); mo = Number(mo); d = Number(d);
  if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return null;
  return { iso: y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0'), len: m[0].length };
}
async function pdfLines(file, password) {
  var lib = await loadPdfJs();
  var pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), password: password || undefined }).promise;
  var out = [];
  for (var p = 1; p <= pdf.numPages; p++) {
    var tc = await (await pdf.getPage(p)).getTextContent(), rows = [];
    tc.items.forEach(function(it) {
      if (!it.str || !it.str.trim()) return;
      var x = it.transform[4], y = it.transform[5], r = rows.find(function(rr) { return Math.abs(rr.y - y) < 3; });
      if (!r) rows.push(r = { y: y, items: [] });
      r.items.push({ x: x, w: it.width || 0, s: it.str });
    });
    rows.sort(function(a, b) { return b.y - a.y; }).forEach(function(r) {
      r.items.sort(function(a, b) { return a.x - b.x; });
      var cells = [], cur = null;
      r.items.forEach(function(it) { if (cur && it.x - (cur.x + cur.w) < 6) { cur.s += (it.x - (cur.x + cur.w) > 1.5 ? ' ' : '') + it.s; cur.w = it.x + it.w - cur.x; } else { cur = { x: it.x, w: it.w, s: it.s }; cells.push(cur); } });
      out.push(cells.map(function(c) { return c.s.trim(); }));
    });
  }
  return out;
}
var NUM_RE = /^-?\(?[\d,]+\.\d{2}\)?-?$/;
function pdfNum(s) { var t = String(s).replace(/[,\s฿]/g, ''); var neg = /^\(.*\)$/.test(t) || /-$/.test(t) || /^-/.test(t); t = t.replace(/[()\-]/g, ''); var n = Number(t); return isFinite(n) ? (neg ? -n : n) : NaN; }
// turn PDF text lines into a clean table: [date, desc, amount(signed), balance]
function pdfStatementTable(lines) {
  var tx = [], opening = null;
  lines.forEach(function(cells) {
    var text = cells.join(' ');
    var dt = pdfDate(text);
    var nums = []; cells.forEach(function(c) { c.split(/\s+/).forEach(function(t) { if (NUM_RE.test(t)) nums.push(pdfNum(t)); }); });
    if (!dt) {
      if (opening == null && /ยอดยกมา|ยกมา|brought forward|beginning balance|opening balance|ยอดคงเหลือต้นงวด/i.test(text) && nums.length) opening = nums[nums.length - 1];
      else if (tx.length && !nums.length && text.length < 80) tx[tx.length - 1].desc += ' ' + text.trim();
      return;
    }
    if (/ยอดยกมา|brought forward|beginning balance|opening balance/i.test(text) && nums.length) { opening = nums[nums.length - 1]; return; }
    if (!nums.length) return;
    var desc = text.slice(dt.len).replace(/\d{1,2}:\d{2}(:\d{2})?/g, '').split(/\s+/).filter(function(t) { return !NUM_RE.test(t); }).join(' ').trim();
    tx.push({ date: dt.iso, desc: desc, nums: nums });
  });
  if (!tx.length) return null;
  // amount = balance delta when a running balance column exists (last number)
  var hasBal = tx.filter(function(t) { return t.nums.length >= 2; }).length >= tx.length * 0.7;
  var prev = opening, rows = [['วันที่','รายการ','จำนวนเงิน','ยอดคงเหลือ']];
  tx.forEach(function(t, i) {
    var bal = hasBal ? t.nums[t.nums.length - 1] : null, amt = hasBal ? t.nums[t.nums.length - 2] : t.nums[0];
    if (hasBal) {
      if (prev != null) { var delta = round2(bal - prev); if (Math.abs(Math.abs(delta) - Math.abs(amt)) < 0.01) amt = delta; else amt = /ถอน|โอนออก|ชำระ|จ่าย|ค่าธรรมเนียม|withdraw|debit|payment|fee|transfer to/i.test(t.desc) ? -Math.abs(amt) : Math.abs(amt); }
      else amt = /ถอน|โอนออก|ชำระ|จ่าย|ค่าธรรมเนียม|withdraw|debit|payment|fee|transfer to/i.test(t.desc) ? -Math.abs(amt) : Math.abs(amt);
      prev = bal;
    }
    rows.push([t.date, t.desc || 'รายการธนาคาร', String(round2(amt)), bal == null ? '' : String(bal)]);
  });
  return rows;
}
