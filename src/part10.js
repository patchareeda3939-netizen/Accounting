
/* ================= Reconcile (accounting:reconcile) ================= */
var rec = { stage:'start', acc:'', end:'', endBal:'', fee:'', feeDate:'', feeAcc:'5290', intr:'', intDate:'', intAcc:'', cleared:{}, tab:'all', view:null };
function reconAccList() {
  var w = function(a) { var s = accSubtype(a); return s === 'bank' ? 0 : subtypeBase(s) === 'asset' ? 1 : subtypeBase(s) === 'liability' ? 2 : 9; };
  return STORE.accounts.filter(function(a) { return w(a) < 9; }).sort(function(a, b) { return w(a) - w(b) || String(a.code).localeCompare(String(b.code)); });
}
function reconSign(code) { var a = STORE.accounts.find(function(x) { return x.code === code; }); return a && subtypeBase(accSubtype(a)) === 'liability' ? -1 : 1; }
function reconIsBank(code) { var a = STORE.accounts.find(function(x) { return x.code === code; }); return !!a && accSubtype(a) === 'bank'; }
function reconDoc(code) { return STORE.settings.find(function(s) { return s._id === 'recon_' + code; }) || { history:[], draft:null }; }
function reconLines(code) {
  var out = [];
  STORE.documents.forEach(function(d) {
    var n = 0;
    postingsOf(d).forEach(function(l) { if (l.code === code) { out.push({ key: d._id + ':' + (n++), date: l.date, d: d, dr: l.dr, cr: l.cr, memo: l.memo }); } });
  });
  return out.sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });
}
function reconClearedSet(code) {
  var s = {}; (reconDoc(code).history || []).forEach(function(h) { (h.keys || []).forEach(function(k) { s[k] = 1; }); });
  // the account's opening-balance entry is the starting point, never a line to tick
  reconLines(code).forEach(function(l) { if (isOpeningLine(l, code)) s[l.key] = 1; });
  return s;
}
function isOpeningLine(l, code) { var x = l.d.extra || {}; return x.openingFor === code || !!x.openingAll; }
function openingSum(code) { return round2(reconSign(code) * reconLines(code).filter(function(l) { return isOpeningLine(l, code); }).reduce(function(s, l) { return s + l.dr - l.cr; }, 0)); }
function reconBegin(code) { var h = reconDoc(code).history || []; if (h.length) return Number(h[h.length - 1].endBal) || 0; var d = reconDoc(code).draft; if (code === rec.acc && rec.begBal !== '' && rec.begBal != null) return Number(rec.begBal) || 0; return d && d.begBal != null && d.begBal !== '' ? Number(d.begBal) || 0 : openingSum(code); }
rec.begBal = '';
function reconShell() {
  return '<div class="rec-crumb"><a href="#" onclick="go(\'accounting\',\'coa\');return false">ผังบัญชี</a> / <a href="#" onclick="go(\'accounting\',\'fixedAssets\');return false">ทะเบียนทรัพย์สิน</a> / <span>กระทบยอด</span></div>' +
    '<div class="coa-bar"><h1 class="section-title" style="margin:0">กระทบยอด</h1>' +
    '<div class="coa-actions"><button type="button" class="btn btn-outline" id="recSum">สรุป</button><button type="button" class="btn btn-outline" id="recHist">ประวัติตามบัญชี</button></div></div>';
}
function reconSummaryHTML() {
  return '<div class="coa-bar"><h2 style="margin:0">สรุปการกระทบยอด</h2><button type="button" class="btn btn-outline" id="recBackS">กระทบยอดใหม่</button></div>' +
    '<div class="items-wrap"><table class="data-table"><thead><tr><th>บัญชี</th><th>ประเภท</th><th class="r">ยอดตามบัญชี</th><th>กระทบยอดล่าสุด</th><th class="r">ยอดที่กระทบ</th><th>รายการรอกระทบ</th><th></th></tr></thead><tbody>' +
    reconAccList().map(function(a) {
      var h = (reconDoc(a.code).history || []).slice(-1)[0], done = reconClearedSet(a.code), pend = reconLines(a.code).filter(function(l) { return !done[l.key]; }).length;
      var b = accountBalances()[a.code] || { dr:0, cr:0 }, bal = round2(reconSign(a.code) * (b.dr - b.cr));
      return '<tr><td>' + esc(a.code + ' ' + a.name) + '</td><td>' + esc(subtypeLabel(accSubtype(a))) + '</td><td class="r">' + fmtMoney(bal) + '</td><td class="num">' + (h ? fmtDateNum(h.end) : '<span class="muted">ยังไม่เคย</span>') + '</td><td class="r">' + (h ? fmtMoney(h.endBal) : '-') + '</td><td>' + pend + '</td><td><button type="button" class="linkish" data-recgo="' + esc(a.code) + '">กระทบยอด</button></td></tr>';
    }).join('') + '</tbody></table></div>';
}
function reconData() {
  var banks = reconAccList();
  if (!banks.length) return '<div class="empty-state"><div class="empty-state-text"><h3>ยังไม่มีบัญชีธนาคาร</h3><p>เพิ่มบัญชีธนาคารก่อน แล้วจึงกระทบยอดกับใบแจ้งยอดของธนาคารได้</p><div class="toolbar"><button class="btn btn-dark" type="button" onclick="openBankAccForm()">เพิ่มบัญชีธนาคาร</button></div></div></div>';
  if (!rec.acc || !banks.some(function(a) { return a.code === rec.acc; })) rec.acc = banks[0].code;
  if (rec.stage === 'history') return reconHistoryHTML();
  if (rec.stage === 'work') return reconWorkHTML();
  if (rec.stage === 'summary') return reconSummaryHTML();
  var rd = reconDoc(rec.acc), last = (rd.history || []).slice(-1)[0], draft = rd.draft;
  var accSel = function(id, v, base) { return '<select id="' + id + '"><option value="">บัญชี</option>' + STORE.accounts.filter(function(a) { return subtypeBase(accSubtype(a)) === base; }).map(function(a) { return '<option value="' + esc(a.code) + '"' + (a.code === v ? ' selected' : '') + '>' + esc(a.code + ' ' + a.name) + '</option>'; }).join('') + '</select>'; };
  var groups = {}; banks.forEach(function(a) { var k = subtypeLabel(accSubtype(a)); (groups[k] = groups[k] || []).push(a); });
  return '<div class="rec-start">' +
    '<h2 class="rec-h">คุณต้องการกระทบยอดบัญชีใด</h2>' +
    '<div class="field rec-acc"><label for="recAcc">บัญชี</label><select id="recAcc">' + Object.keys(groups).map(function(g) { return '<optgroup label="' + esc(g) + '">' + groups[g].map(function(a) { return '<option value="' + esc(a.code) + '"' + (a.code === rec.acc ? ' selected' : '') + '>' + esc(a.name) + ' (' + esc(a.code) + ')</option>'; }).join('') + '</optgroup>'; }).join('') + '</select>' +
    '<div class="small muted" style="margin-top:6px">' + (last ? 'กระทบยอดล่าสุด ณ ' + fmtDateNum(last.end) + ' · ยอดยกไป ' + fmtMoney(last.endBal) : 'ยังไม่เคยกระทบยอดบัญชีนี้') + '</div></div>' +
    (draft ? '<div class="banner info">มีการกระทบยอดที่บันทึกค้างไว้ (วันที่สิ้นสุด ' + fmtDateNum(draft.end) + ') <button type="button" class="linkish" id="recResume">ทำต่อ</button></div>' : '') +
    (reconIsBank(rec.acc) ? '<div class="stmt-bar"><span>' + (rec.stmt ? 'นำเข้า Statement แล้ว ' + rec.stmt.length + ' รายการ (' + fmtDateNum(rec.stmt[0].date) + ' – ' + fmtDateNum(rec.stmt[rec.stmt.length - 1].date) + ') ระบบใส่ยอดยกไปและวันที่สิ้นสุดให้แล้ว' : 'มีไฟล์ Statement จากธนาคาร? นำเข้าเพื่อใส่ยอดยกไปและจับคู่รายการอัตโนมัติ') + '</span><button type="button" class="btn btn-outline" data-stmtimp>' + (rec.stmt ? 'เปลี่ยนไฟล์' : 'นำเข้า Statement ธนาคาร') + '</button></div>' : '') +
    '<h2 class="rec-h">เพิ่มข้อมูลต่อไปนี้*</h2>' +
    '<div class="rec-row3"><div class="field"><label for="recBeg">ยอดคงเหลือตั้งต้น</label>' + ((reconDoc(rec.acc).history || []).length ? '<div class="rec-static" title="ยกมาจากการกระทบยอดครั้งก่อน">' + fmtNum2(reconBegin(rec.acc)) + '</div>' : '<input id="recBeg" type="number" step="0.01" class="r" value="' + esc(rec.begBal !== '' ? rec.begBal : (reconBegin(rec.acc) || '')) + '" placeholder="0.00"><div class="small muted">ครั้งแรก: ใส่ยอดต้นงวดตาม Statement</div>') + '</div>' +
    '<div class="field"><label for="recEndBal">ยอดยกไป</label><input id="recEndBal" type="number" step="0.01" class="r" value="' + esc(rec.endBal) + '" placeholder="0.00"></div>' +
    '<div class="field"><label for="recEnd">วันที่สิ้นสุด</label><input id="recEnd" type="date" value="' + esc(rec.end) + '"></div></div>' +
    '<h2 class="rec-h">ระบุค่าบริการหรือดอกเบี้ยที่ได้รับ หากจำเป็น</h2>' +
    '<div class="rec-fee"><div class="field"><label for="recFeeDate">วันที่</label><input id="recFeeDate" type="date" value="' + esc(rec.feeDate) + '"></div><div class="field"><label for="recFee">ค่าบริการ</label><input id="recFee" type="number" step="0.01" min="0" class="r" value="' + esc(rec.fee) + '" placeholder="0.00"></div><div class="field"><label for="recFeeAcc">บัญชีค่าใช้จ่าย</label>' + accSel('recFeeAcc', rec.feeAcc, 'expense') + '</div>' +
    '<div class="field"><label for="recIntDate">วันที่</label><input id="recIntDate" type="date" value="' + esc(rec.intDate) + '"></div><div class="field"><label for="recInt">ดอกเบี้ยที่ได้รับ</label><input id="recInt" type="number" step="0.01" min="0" class="r" value="' + esc(rec.intr) + '" placeholder="0.00"></div><div class="field"><label for="recIntAcc">บัญชีรายได้</label>' + accSel('recIntAcc', rec.intAcc, 'income') + '</div></div>' +
    '<div class="form-error" id="recErr" hidden></div><div class="toolbar"><button type="button" class="btn btn-dark" id="recStart">เริ่มกระทบยอด</button></div></div>';
}
function fmtNum2(n) { return (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function reconCalc() {
  var lines = reconLines(rec.acc), beg = reconBegin(rec.acc), dep = 0, pay = 0, nd = 0, np = 0;
  lines.forEach(function(l) { if (rec.cleared[l.key]) { if (l.dr) { dep += l.dr; nd++; } if (l.cr) { pay += l.cr; np++; } } });
  var clearedBal = round2(beg + reconSign(rec.acc) * (dep - pay)), endBal = round2(Number(rec.endBal) || 0);
  return { beg: beg, dep: round2(dep), pay: round2(pay), nd: nd, np: np, cleared: clearedBal, endBal: endBal, diff: round2(endBal - clearedBal) };
}
function reconWorkHTML() {
  var a = STORE.accounts.find(function(x) { return x.code === rec.acc; }) || {}, done = reconClearedSet(rec.acc);
  var lines = reconLines(rec.acc).filter(function(l) { return !done[l.key] && (l.date || '') <= rec.end; });
  var c = reconCalc(), bk = reconIsBank(rec.acc);
  var shown = lines.filter(function(l) { return rec.tab === 'all' || (rec.tab === 'pay' ? l.cr : l.dr); });
  var allOn = shown.length && shown.every(function(l) { return rec.cleared[l.key]; });
  var ok = c.diff === 0;
  return '<div class="rec-head"><div><div class="small muted">' + esc(a.code + ' ' + (a.name || '')) + '</div><div class="rec-title">ใบแจ้งยอด ณ วันที่ ' + fmtDateNum(rec.end) + '</div></div>' +
    '<div class="toolbar" style="margin:0"><button type="button" class="btn btn-outline" id="recEdit">แก้ไขข้อมูลใบแจ้งยอด</button><button type="button" class="btn btn-outline" id="recLater">บันทึกไว้ทำต่อ</button><button type="button" class="btn btn-dark" id="recFinish"' + (ok ? '' : ' disabled title="ส่วนต่างต้องเป็น 0"') + '>เสร็จสิ้น</button></div></div>' +
    '<div class="rec-sum"><div class="rec-box"><span>ยอดคงเหลือปลายงวด (ใบแจ้งยอด)</span><b>' + fmtMoney(c.endBal) + '</b></div><div class="rec-op">−</div>' +
    '<div class="rec-box"><span>ยอดที่กระทบแล้ว</span><b>' + fmtMoney(c.cleared) + '</b><small>ยกมา ' + fmtMoney(c.beg) + ' · ฝาก ' + c.nd + ' รายการ ' + fmtMoney(c.dep) + ' · ' + (bk ? 'ถอน' : 'เครดิต') + ' ' + c.np + ' รายการ ' + fmtMoney(c.pay) + '</small></div><div class="rec-op">=</div>' +
    '<div class="rec-box rec-diff ' + (ok ? 'ok' : 'bad') + '"><span>ส่วนต่าง</span><b>' + fmtMoney(c.diff) + '</b><small>' + (ok ? '✓ ยอดตรงกันแล้ว กดเสร็จสิ้นได้' : 'ติ๊กรายการที่อยู่ในใบแจ้งยอดจนกว่าส่วนต่างเป็น 0') + '</small></div></div>' +
    reconStmtBar() + (rec.stmt ? reconMatchHTML(lines) : '<div class="exp-tabs">' + [['all','ทั้งหมด'],['pay', bk ? 'ถอน / จ่าย' : 'เครดิต'],['dep', bk ? 'ฝาก / รับ' : 'เดบิต']].map(function(t) { return '<button type="button" data-rectab="' + t[0] + '" class="' + (rec.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>' +
    '<div class="items-wrap"><table class="data-table rec-table"><thead><tr><th>วันที่</th><th>ประเภท</th><th>เลขที่</th><th>คู่ค้า / คำอธิบาย</th><th class="r">' + (bk ? 'ถอน (จ่าย)' : 'เครดิต') + '</th><th class="r">' + (bk ? 'ฝาก (รับ)' : 'เดบิต') + '</th><th class="c"><input type="checkbox" id="recAll" aria-label="เลือกทั้งหมด"' + (allOn ? ' checked' : '') + '></th></tr></thead><tbody>' +
    (shown.map(function(l) { var on = !!rec.cleared[l.key]; return '<tr class="rec-row' + (on ? ' on' : '') + '" data-reck="' + esc(l.key) + '"><td class="num">' + fmtDateNum(l.date) + '</td><td>' + esc(l.d.typeLabel || '') + '</td><td class="num">' + esc(l.d.docNo || '') + '</td><td>' + esc(l.d.party || '') + (l.memo ? '<div class="small muted">' + esc(l.memo) + '</div>' : '') + '</td><td class="r">' + (l.cr ? fmtMoney(l.cr) : '') + '</td><td class="r">' + (l.dr ? fmtMoney(l.dr) : '') + '</td><td class="c"><input type="checkbox" data-recc="' + esc(l.key) + '"' + (on ? ' checked' : '') + ' aria-label="กระทบแล้ว"></td></tr>'; }).join('') || '<tr><td colspan="7" class="empty-hint">ไม่มีรายการที่ยังไม่ได้กระทบยอดถึงวันที่นี้</td></tr>') +
    '</tbody></table></div>');
}
function reconHistoryHTML() {
  var h = (reconDoc(rec.acc).history || []).slice().reverse(), a = STORE.accounts.find(function(x) { return x.code === rec.acc; }) || {};
  if (rec.view != null) {
    var r = (reconDoc(rec.acc).history || [])[rec.view], keys = {}; (r.keys || []).forEach(function(k) { keys[k] = 1; });
    var ls = reconLines(rec.acc).filter(function(l) { return keys[l.key]; });
    return '<button type="button" class="back-link" id="recBackH">← กลับไปประวัติ</button><div class="rep-paper"><div class="rep-title"><div class="rep-co">' + esc(companyName()) + '</div><h1>รายงานการกระทบยอด</h1><div class="small muted">' + esc(a.code + ' ' + a.name) + ' · ใบแจ้งยอด ณ ' + fmtDateNum(r.end) + '</div></div>' +
      '<div class="kv"><div><span>ยอดยกมา</span>' + fmtMoney(r.begBal) + '</div><div><span>ฝาก/รับที่กระทบ</span>' + fmtMoney(r.dep) + '</div><div><span>ถอน/จ่ายที่กระทบ</span>' + fmtMoney(r.pay) + '</div><div><span>ยอดปลายงวด</span><b>' + fmtMoney(r.endBal) + '</b></div><div><span>กระทบยอดเมื่อ</span>' + new Date(r.at).toLocaleString('th-TH') + '</div></div>' +
      '<div class="items-wrap"><table class="data-table"><thead><tr><th>วันที่</th><th>ประเภท</th><th>เลขที่</th><th>คู่ค้า</th><th class="r">ถอน</th><th class="r">ฝาก</th></tr></thead><tbody>' + ls.map(function(l) { return '<tr class="row-link" data-doc="' + esc(l.d._id) + '"><td class="num">' + fmtDateNum(l.date) + '</td><td>' + esc(l.d.typeLabel || '') + '</td><td class="num">' + esc(l.d.docNo || '') + '</td><td>' + esc(l.d.party || '') + '</td><td class="r">' + (l.cr ? fmtMoney(l.cr) : '') + '</td><td class="r">' + (l.dr ? fmtMoney(l.dr) : '') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  }
  return '<div class="coa-bar"><div class="field" style="margin:0"><label for="recAccH">บัญชี</label><select id="recAccH">' + reconAccList().map(function(x) { return '<option value="' + esc(x.code) + '"' + (x.code === rec.acc ? ' selected' : '') + '>' + esc(x.code + ' ' + x.name) + '</option>'; }).join('') + '</select></div><button type="button" class="btn btn-outline" id="recBackS">กระทบยอดใหม่</button></div>' +
    '<div class="items-wrap"><table class="data-table"><thead><tr><th>วันที่ใบแจ้งยอด</th><th class="r">ยอดยกมา</th><th class="r">ฝาก/รับ</th><th class="r">ถอน/จ่าย</th><th class="r">ยอดปลายงวด</th><th>กระทบยอดเมื่อ</th><th></th></tr></thead><tbody>' +
    (h.map(function(r, i) { var idx = h.length - 1 - i; return '<tr><td class="num">' + fmtDateNum(r.end) + '</td><td class="r">' + fmtMoney(r.begBal) + '</td><td class="r">' + fmtMoney(r.dep) + '</td><td class="r">' + fmtMoney(r.pay) + '</td><td class="r"><b>' + fmtMoney(r.endBal) + '</b></td><td class="small">' + new Date(r.at).toLocaleString('th-TH') + '</td><td><button type="button" class="linkish" data-recview="' + idx + '">ดูรายงาน</button>' + (i === 0 ? ' · <button type="button" class="linkish" data-recundo="' + idx + '">ยกเลิก</button>' : '') + '</td></tr>'; }).join('') || '<tr><td colspan="7" class="empty-hint">ยังไม่มีประวัติการกระทบยอดของบัญชีนี้</td></tr>') + '</tbody></table></div>';
}
async function reconAddAdj(amount, date, accCode, isFee) {
  amount = round2(Number(amount) || 0); if (!amount) return;
  var bank = rec.acc, dr = isFee ? accCode : bank, cr = isFee ? bank : accCode;
  await addRec('documents', { type:'journalEntry', typeLabel: DOC_TYPES.journalEntry.label, group:'other', party: isFee ? 'ค่าธรรมเนียมธนาคาร' : 'ดอกเบี้ยรับ', date: date, docNo: nextDocNo('journalEntry', date),
    items: [{ account: dr + ' ' + acctName(dr), debit: amount, credit: 0 }, { account: cr + ' ' + acctName(cr), debit: 0, credit: amount }], total: amount, extra: { reconAdj: true, bankTx: isFee ? 'out' : 'in' }, status:'done', createdAt: Date.now() });
}
function bindRecon() {
  var sb = byId('recSum'); if (sb && !sb._b) { sb._b = 1; sb.onclick = function() { rec.stage = 'summary'; refreshPageData(); }; }
  var hb = byId('recHist'); if (hb && !hb._b) { hb._b = 1; hb.onclick = function() { rec.stage = 'history'; rec.view = null; refreshPageData(); }; }
  var c = byId('pageData'); if (!c) return;
  var q = function(id) { return byId(id); };
  if (rec.stage === 'start') {
    q('recAcc') && (q('recAcc').onchange = function(e) { rec.acc = e.target.value; rec.endBal = ''; rec.begBal = ''; rec.stmt = null; rec.match = {}; refreshPageData(); });
    q('recResume') && (q('recResume').onclick = function() { var d = reconDoc(rec.acc).draft; Object.assign(rec, { begBal: d.begBal != null ? d.begBal : '', end: d.end, endBal: d.endBal, cleared: Object.assign({}, d.cleared || {}), stmt: d.stmt || null, match: Object.assign({}, d.match || {}), stage:'work' }); refreshPageData(); });
    c.querySelectorAll('[data-stmtimp]').forEach(function(b) { b.onclick = openStmtImport; });
    q('recEnd').onchange = function(e) { ['recFeeDate','recIntDate'].forEach(function(id) { if (!q(id)._touched) q(id).value = e.target.value; }); };
    ['recFeeDate','recIntDate'].forEach(function(id) { q(id).addEventListener('change', function() { q(id)._touched = 1; }); });
    q('recStart').onclick = async function() {
      var err = q('recErr'), end = q('recEnd').value, eb = q('recEndBal').value;
      if (!end || eb === '') { err.textContent = 'กรุณาใส่วันที่สิ้นสุดและยอดคงเหลือปลายงวดจากใบแจ้งยอด'; err.hidden = false; return; }
      var last = (reconDoc(rec.acc).history || []).slice(-1)[0];
      if (last && end <= last.end) { err.textContent = 'วันที่ต้องหลังการกระทบยอดครั้งล่าสุด (' + fmtDateNum(last.end) + ')'; err.hidden = false; return; }
      if (Number(q('recFee').value) && !q('recFeeAcc').value) { err.textContent = 'เลือกบัญชีค่าใช้จ่ายสำหรับค่าบริการ'; err.hidden = false; return; }
      if (Number(q('recInt').value) && !q('recIntAcc').value) { err.textContent = 'เลือกบัญชีรายได้สำหรับดอกเบี้ย'; err.hidden = false; return; }
      if (q('recBeg')) rec.begBal = q('recBeg').value;
      rec.end = end; rec.endBal = eb; rec.fee = q('recFee').value; rec.intr = q('recInt').value;
      this.disabled = true;
      var before = {}; reconLines(rec.acc).forEach(function(l) { before[l.key] = 1; });
      await reconAddAdj(rec.fee, q('recFeeDate').value || end, q('recFeeAcc').value, true);
      await reconAddAdj(rec.intr, q('recIntDate').value || end, q('recIntAcc').value, false);
      rec.cleared = {}; reconLines(rec.acc).forEach(function(l) { if (!before[l.key]) rec.cleared[l.key] = 1; });
      rec.fee = ''; rec.intr = ''; rec.stage = 'work'; rec.tab = 'all'; if (rec.stmt) stmtAutoMatch(); refreshPageData();
    };
  } else if (rec.stage === 'work') {
    c.querySelectorAll('[data-recc]').forEach(function(cb) { cb.onchange = function() { if (cb.checked) rec.cleared[cb.dataset.recc] = 1; else delete rec.cleared[cb.dataset.recc]; refreshPageData(); }; });
    c.querySelectorAll('.rec-row').forEach(function(tr) { tr.addEventListener('click', function(e) { if (e.target.tagName === 'INPUT') return; var k = tr.dataset.reck; if (rec.cleared[k]) delete rec.cleared[k]; else rec.cleared[k] = 1; refreshPageData(); }); });
    q('recAll') && (q('recAll').onchange = function(e) { var done = reconClearedSet(rec.acc); reconLines(rec.acc).filter(function(l) { return !done[l.key] && l.date <= rec.end && (rec.tab === 'all' || (rec.tab === 'pay' ? l.cr : l.dr)); }).forEach(function(l) { if (e.target.checked) rec.cleared[l.key] = 1; else delete rec.cleared[l.key]; }); refreshPageData(); });
    c.querySelectorAll('[data-rectab]').forEach(function(b) { b.onclick = function() { rec.tab = b.dataset.rectab; refreshPageData(); }; });
    bindStmt(c);
    q('recEdit').onclick = function() { rec.stage = 'start'; refreshPageData(); };
    q('recLater').onclick = async function() { await saveSettings('recon_' + rec.acc, { draft: { end: rec.end, endBal: rec.endBal, begBal: rec.begBal, cleared: rec.cleared, stmt: rec.stmt, match: rec.match } }); rec.stage = 'start'; showToast('บันทึกไว้แล้ว กลับมาทำต่อได้ภายหลัง'); refreshPageData(); };
    q('recFinish').onclick = async function() {
      var cc = reconCalc(); if (cc.diff !== 0) return;
      var h = (reconDoc(rec.acc).history || []).concat([{ end: rec.end, begBal: cc.beg, endBal: cc.endBal, dep: cc.dep, pay: cc.pay, keys: Object.keys(rec.cleared), at: Date.now() }]);
      await saveSettings('recon_' + rec.acc, { history: h, draft: null });
      rec.stage = 'history'; rec.view = h.length - 1; rec.cleared = {}; rec.endBal = ''; rec.begBal = ''; rec.stmt = null; rec.match = {}; showToast('กระทบยอดเสร็จสิ้น'); refreshPageData();
    };
  } else {
    c.querySelectorAll('[data-recgo]').forEach(function(b) { b.onclick = function() { rec.acc = b.dataset.recgo; rec.stage = 'start'; refreshPageData(); }; });
    q('recAccH') && (q('recAccH').onchange = function(e) { rec.acc = e.target.value; refreshPageData(); });
    q('recBackS') && (q('recBackS').onclick = function() { rec.stage = 'start'; refreshPageData(); });
    q('recBackH') && (q('recBackH').onclick = function() { rec.view = null; refreshPageData(); });
    c.querySelectorAll('[data-recview]').forEach(function(b) { b.onclick = function() { rec.view = Number(b.dataset.recview); refreshPageData(); }; });
    c.querySelectorAll('[data-recundo]').forEach(function(b) { b.onclick = async function() { var h = (reconDoc(rec.acc).history || []).slice(0, -1); await saveSettings('recon_' + rec.acc, { history: h }); showToast('ยกเลิกการกระทบยอดครั้งล่าสุดแล้ว'); refreshPageData(); }; });
  }
}
