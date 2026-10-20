/* ---- Fiscal year closing ---- */
pageState.ycYear = null;
function fyStartMonth() { return Math.min(12, Math.max(1, Number(companySettings().fiscalStart) || 1)); }
function fyRange(endYear) { // fiscal year identified by the calendar year it ends in
  var m = fyStartMonth(), sy = m === 1 ? endYear : endYear - 1;
  var start = sy + '-' + String(m).padStart(2, '0') + '-01';
  var e = new Date(sy, m - 1 + 12, 0);
  return [start, e.getFullYear() + '-' + String(e.getMonth() + 1).padStart(2, '0') + '-' + String(e.getDate()).padStart(2, '0')];
}
function fyOf(date) { var m = fyStartMonth(), y = Number(date.slice(0, 4)), mo = Number(date.slice(5, 7)); return m === 1 ? y : (mo >= m ? y + 1 : y); }
function fyLabel(y) { var r = fyRange(y); return 'ปีบัญชี ' + (y + 543) + ' (' + fmtDateNum(r[0]) + ' – ' + fmtDateNum(r[1]) + ')'; }
function ycCloseDoc(y) { var r = fyRange(y); return STORE.documents.find(function(d) { return d.extra && d.extra.yearClose === r[1] && !d.voided; }); }
function ycPL(y, inclClose) {
  var r = fyRange(y), acc = {};
  STORE.documents.forEach(function(d) { if (d.voided || !inRange(d.date || '', r) || (!inclClose && isYearClose(d))) return; postingsOf(d).forEach(function(l) { var b = accBaseOf(l.code); if (b !== 'income' && b !== 'expense') return; var a = acc[l.code] = acc[l.code] || { code: l.code, base: b, dr: 0, cr: 0 }; a.dr += l.dr; a.cr += l.cr; }); });
  return Object.keys(acc).sort().map(function(k) { var a = acc[k]; a.net = round2(a.cr - a.dr); return a; }).filter(function(a) { return Math.abs(a.net) > 0.004; });
}
function ycShell() {
  return '<div class="small muted" style="margin-bottom:4px">การบัญชี / ปิดบัญชีสิ้นปี</div><div class="tx-head"><h1 class="section-title">ปิดบัญชีสิ้นปี (Fiscal year closing)</h1></div>' +
    '<p class="section-sub" style="margin-top:-6px">โอนยอดรายได้และค่าใช้จ่ายทั้งปีเข้าบัญชีกำไรสะสม เพื่อเริ่มปีบัญชีใหม่ด้วยยอดรายได้/ค่าใช้จ่ายเป็นศูนย์ ยอดสินทรัพย์ หนี้สิน และส่วนของเจ้าของยกไปปีถัดไปอัตโนมัติ</p>';
}
function ycData() {
  var cur = fyOf(todayStr()), first = cur;
  STORE.documents.forEach(function(d) { if (d.date) first = Math.min(first, fyOf(d.date)); });
  if (pageState.ycYear == null) { pageState.ycYear = cur - 1 >= first ? cur - 1 : cur; for (var yy = first; yy <= cur; yy++) { if (!ycCloseDoc(yy) && fyRange(yy)[1] < todayStr()) { pageState.ycYear = yy; break; } } }
  var y = pageState.ycYear, r = fyRange(y), done = ycCloseDoc(y), pl = ycPL(y, false), after = done ? ycPL(y, true) : [];
  var rev = round2(pl.filter(function(a) { return a.base === 'income'; }).reduce(function(s, a) { return s + a.net; }, 0));
  var exp = round2(-pl.filter(function(a) { return a.base === 'expense'; }).reduce(function(s, a) { return s + a.net; }, 0));
  var years = []; for (var i = cur; i >= first; i--) years.push(i);
  var h = '<div class="iv-filters"><div class="field"><span class="iv-lbl">เลือกปีบัญชี</span><select class="coa-select" onchange="pageState.ycYear=Number(this.value);refreshPageData()">' + years.map(function(v) { return '<option value="' + v + '"' + (v === y ? ' selected' : '') + '>' + fyLabel(v) + (ycCloseDoc(v) ? ' ✓ ปิดแล้ว' : '') + '</option>'; }).join('') + '</select></div></div>';
  // checklist
  var lk = lockDate(), months = [], d0 = new Date(r[0] + 'T00:00:00');
  for (var k = 0; k < 12; k++) { var dm = new Date(d0.getFullYear(), d0.getMonth() + k, 1); months.push(dm.getFullYear() + '-' + String(dm.getMonth() + 1).padStart(2, '0')); }
  var closedM = months.filter(function(ym) { return lk && monthEnd(ym) <= lk; }).length;
  var unbal = STORE.documents.filter(function(d) { if (d.voided || !inRange(d.date || '', r)) return false; var p = postingsOf(d), t = p.reduce(function(s, l) { return s + l.dr - l.cr; }, 0); return Math.abs(t) > 0.01; }).length;
  var openInv = STORE.documents.filter(function(d) { return !d.voided && (d.type === 'invoice' || d.type === 'bill') && (d.date || '') <= r[1] && docBal(d) > 0.009; }).length;
  var chk = function(ok, txt, sub) { return '<li class="' + (ok ? 'ok' : 'warn') + '"><span>' + (ok ? '✓' : '!') + '</span><div><b>' + txt + '</b>' + (sub ? '<div class="small muted">' + sub + '</div>' : '') + '</div></li>'; };
  h += '<div class="yc-grid"><div class="yc-card"><h3 class="de-h">1. ตรวจสอบก่อนปิดบัญชี</h3><ul class="yc-check">' +
    chk(fyRange(y)[1] < todayStr(), 'ปีบัญชีสิ้นสุดแล้ว', fyRange(y)[1] < todayStr() ? 'สิ้นสุด ' + fmtDateNum(r[1]) : 'ปีบัญชียังไม่สิ้นสุด (' + fmtDateNum(r[1]) + ') ปิดได้แต่ควรรอให้ครบปี') +
    chk(closedM === 12, 'ปิดงบรายเดือนครบ 12 เดือน', 'ปิด/ล็อกแล้ว ' + closedM + ' / 12 เดือน · <a href="#" onclick="event.preventDefault();go(\'accounting\',\'monthClose\')">ไปหน้าปิดงบรายเดือน</a>') +
    chk(!unbal, 'รายการบัญชีสมดุลทุกเอกสาร', unbal ? unbal + ' เอกสารเดบิตไม่เท่าเครดิต' : '') +
    chk(!openInv, 'ตรวจลูกหนี้/เจ้าหนี้คงค้าง ณ สิ้นปี', openInv ? 'มีใบแจ้งหนี้/บิลคงค้าง ' + openInv + ' รายการ (ไม่บังคับ แต่ควรตรวจยืนยันยอด)' : '') +
    chk(lk >= r[1], 'ล็อกงวดบัญชีถึงสิ้นปี', lk ? 'ล็อกถึง ' + fmtDateNum(lk) : 'ยังไม่ล็อก — เลือกล็อกอัตโนมัติได้ตอนปิดบัญชี') + '</ul></div>';
  // summary
  var rows = pl.map(function(a) { return '<tr><td>' + esc(a.code + ' ' + (acctName(a.code) || '')) + '</td><td class="r">' + (a.net < 0 ? fmtMoney(-a.net) : '') + '</td><td class="r">' + (a.net > 0 ? fmtMoney(a.net) : '') + '</td></tr>'; }).join('');
  var net = round2(rev - exp);
  h += '<div class="yc-card"><h3 class="de-h">2. สรุปผลการดำเนินงานทั้งปี</h3><div class="yc-kpi"><div><span>รายได้รวม</span><b>' + fmtMoney(rev) + '</b></div><div><span>ค่าใช้จ่ายรวม</span><b>' + fmtMoney(exp) + '</b></div><div><span>' + (net >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ') + '</span><b class="' + (net < 0 ? 'neg-text' : '') + '">' + fmtMoney(Math.abs(net)) + '</b></div></div></div></div>';
  h += '<div class="yc-card"><h3 class="de-h">3. รายการปิดบัญชี (สมุดรายวันปิดบัญชี ณ ' + fmtDateNum(r[1]) + ')</h3>';
  if (!pl.length) h += '<p class="muted">ไม่มียอดรายได้หรือค่าใช้จ่ายในปีบัญชีนี้</p>';
  else h += '<div class="table-wrap coa-table"><table class="data-table"><thead><tr><th>บัญชี</th><th class="r">เดบิต (ปิดรายได้)</th><th class="r">เครดิต (ปิดค่าใช้จ่าย)</th></tr></thead><tbody>' +
    pl.map(function(a) { return '<tr><td>' + esc(a.code + ' ' + (acctName(a.code) || '')) + '</td><td class="r">' + (a.net > 0 ? fmtMoney(a.net) : '') + '</td><td class="r">' + (a.net < 0 ? fmtMoney(-a.net) : '') + '</td></tr>'; }).join('') +
    '<tr class="tot"><td>3120 กำไรสะสม (' + (net >= 0 ? 'เครดิต กำไร' : 'เดบิต ขาดทุน') + ')</td><td class="r">' + (net < 0 ? fmtMoney(-net) : '') + '</td><td class="r">' + (net >= 0 ? fmtMoney(net) : '') + '</td></tr></tbody></table></div>';
  if (done) {
    h += '<div class="banner ok" style="margin-top:12px">✓ ปิดบัญชีปีนี้แล้ว — <a href="#" data-doc="' + esc(done._id) + '" onclick="event.preventDefault()">' + esc(done.docNo) + '</a> ลงวันที่ ' + fmtDateNum(done.date) + (done.extra.closedAt ? ' · ประมวลผลเมื่อ ' + new Date(done.extra.closedAt).toLocaleString('th-TH') : '') + '</div>';
    if (after.length) h += '<div class="banner bad">มีรายการเพิ่ม/แก้ไขในปีนี้หลังปิดบัญชี ยอดรายได้/ค่าใช้จ่ายคงเหลือ ' + after.length + ' บัญชี — กด "ประมวลผลใหม่" เพื่อปรับรายการปิดบัญชี</div>';
    h += '<div class="toolbar" style="margin-top:12px"><button class="btn btn-outline" type="button" onclick="ycUndo(' + y + ', this)">ยกเลิกการปิดบัญชี</button>' + (after.length ? '<button class="btn btn-dark" type="button" onclick="ycRun(' + y + ', this)">ประมวลผลใหม่</button>' : '') + '</div>';
  } else if (pl.length) {
    h += '<div class="yc-run"><label class="pf-chk"><input type="checkbox" id="ycLock" checked> ล็อกงวดบัญชีถึง ' + fmtDateNum(r[1]) + ' หลังปิดบัญชี (ป้องกันการแก้ไขย้อนหลัง)</label>' +
      '<button class="btn btn-dark" type="button" onclick="ycRun(' + y + ', this)">ประมวลผลปิดบัญชีสิ้นปี</button></div>';
  }
  h += '</div>';
  var hist = STORE.documents.filter(function(d) { return isYearClose(d) && !d.voided; }).sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });
  if (hist.length) h += '<div class="yc-card"><h3 class="de-h">ประวัติการปิดบัญชี</h3><div class="table-wrap coa-table"><table class="data-table"><thead><tr><th>ปีบัญชี</th><th>เลขที่</th><th>วันที่</th><th class="r">กำไร (ขาดทุน) โอนเข้ากำไรสะสม</th></tr></thead><tbody>' +
    hist.map(function(d) { return '<tr class="row-link" data-doc="' + esc(d._id) + '"><td>' + (fyOf(d.date) + 543) + '</td><td class="docno">' + esc(d.docNo) + '</td><td>' + fmtDateNum(d.date) + '</td><td class="r">' + fmtMoney(Number(d.extra.netProfit) || 0) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  return h;
}
async function ycEnsureRE() { if (!STORE.accounts.some(function(a) { return a.code === '3120'; })) await addRec('accounts', { code:'3120', name:'กำไรสะสม', accType:'equity', type:'equity', createdAt: Date.now() }); return '3120'; }
async function ycRun(y, btn) {
  var r = fyRange(y), old = ycCloseDoc(y), pl = ycPL(y, !!old);
  if (!pl.length) return showToast('ไม่มียอดที่ต้องปิด');
  var wantLock = !!(byId('ycLock') && byId('ycLock').checked);
  btn.disabled = true;
  try {
    var lk = lockDate(); if (lk && lk >= r[1] && !old) { btn.disabled = false; return showToast('งวดถูกล็อกถึง ' + fmtDateNum(lk) + ' — ปลดล็อกก่อนประมวลผล'); }
    var re = await ycEnsureRE();
    var items = [], net = 0;
    // when re-running, include the existing closing entry so remaining balances are zeroed in one new entry
    var all = old ? ycPL(y, false) : pl;
    all.forEach(function(a) { net += a.net; items.push({ account: a.code + ' ' + (acctName(a.code) || ''), debit: a.net > 0 ? round2(a.net) : 0, credit: a.net < 0 ? round2(-a.net) : 0 }); });
    net = round2(net);
    items.push({ account: re + ' ' + (acctName(re) || 'กำไรสะสม'), debit: net < 0 ? -net : 0, credit: net > 0 ? net : 0 });
    var rec2 = { type:'journalEntry', typeLabel: DOC_TYPES.journalEntry.label, group:'other', party:'ปิดบัญชีสิ้นปี ' + (y + 543), date: r[1], items: items, total: round2(items.reduce(function(s, i) { return s + i.debit; }, 0)), status:'done',
      extra: { yearClose: r[1], netProfit: net, closedAt: Date.now(), note: 'โอนปิดบัญชีรายได้และค่าใช้จ่ายเข้ากำไรสะสม ' + fyLabel(y) } };
    if (old) await setRec('documents', old._id, Object.assign({}, strip(old), rec2, { docNo: old.docNo, updatedAt: Date.now() }));
    else { rec2.docNo = nextDocNo('journalEntry', r[1]); rec2.createdAt = Date.now(); await addRec('documents', rec2); }
    if (wantLock && (lockDate() || '') < r[1]) await setLockDate(r[1], 'period_lock'); // audited in Firebase mode
    showToast('ปิดบัญชี ' + fyLabel(y) + ' แล้ว · ' + (net >= 0 ? 'กำไร ' : 'ขาดทุน ') + fmtMoney(Math.abs(net)) + ' โอนเข้ากำไรสะสม');
  } catch (e) { btn.disabled = false; showToast(writeError(e)); }
  refreshPageData();
}
var _ycUndoArm = null;
async function ycUndo(y, btn) {
  if (_ycUndoArm !== y) { _ycUndoArm = y; btn.textContent = 'กดอีกครั้งเพื่อยืนยันยกเลิก'; return; }
  _ycUndoArm = null; var d = ycCloseDoc(y), r = fyRange(y); if (!d) return;
  btn.disabled = true;
  // the closing entry is dated at year end: a lock covering it has to be lifted first (owners only, audited)
  var lk = lockDate() || '';
  if (lk && lk >= r[1]) {
    if (lk !== r[1] || !canEditLegal()) { btn.disabled = false; showToast(lk !== r[1] ? 'งวดถูกล็อกถึง ' + fmtDateNum(lk) + ' ต้องปลดล็อกก่อนยกเลิกการปิดบัญชี' : 'ปลดล็อกงวดได้เฉพาะเจ้าของบริษัท ให้เจ้าของยกเลิกการปิดบัญชี'); return; }
  }
  try { if (lk === r[1]) await setLockDate('', 'period_unlock'); await delRec('documents', d._id); showToast('ยกเลิกการปิดบัญชีแล้ว' + (lockDate() ? '' : ' และปลดล็อกงวด')); } catch (e) { showToast(writeError(e)); }
  refreshPageData();
}
