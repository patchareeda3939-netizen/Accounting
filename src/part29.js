/* ================= เงินสดย่อย และ เงินทดรองจ่าย (ค่าใช้จ่ายและบิล) ================= */
/* เงินสดย่อย: กองทุนเก็บใน settings/petty { funds:[{ id, name, acc, custodian, limit }] }
   ตั้งวงเงิน/เบิกชดเชย/คืนเงิน = เอกสาร pettyFund · จ่ายเงินสดย่อย = ค่าใช้จ่าย (expense) ที่จ่ายจากบัญชีเงินสดย่อย (extra.bankAcc, extra.pettyFund)
   เงินทดรองจ่าย: จ่ายทดรอง = เอกสาร advance · เคลียร์ = ค่าใช้จ่ายที่จ่ายจากบัญชีเงินทดรอง (extra.advanceId) และ advanceSettle (รับคืน / จ่ายเพิ่ม) */
DOC_TYPES.pettyFund = { label:'เงินสดย่อย', group:'other', template:'record', partyLabel:'กองทุนเงินสดย่อย', prefix:'PC', extra:[] };
DOC_TYPES.advance = { label:'เงินทดรองจ่าย', group:'other', template:'record', partyLabel:'พนักงาน', partyList:'dl_employees', prefix:'AV', extra:[] };
DOC_TYPES.advanceSettle = { label:'เคลียร์เงินทดรองจ่าย', group:'other', template:'record', partyLabel:'พนักงาน', partyList:'dl_employees', prefix:'AS', extra:[] };
var PC_KIND = { setup:'ตั้งวงเงินสดย่อย', replenish:'เบิกชดเชยเงินสดย่อย', 'return':'คืนเงินสดย่อยเข้าบัญชี' };

var _postingsOfBase = postingsOf;
postingsOf = function(d) {
  if (!d || d.voided || !(d.type === 'pettyFund' || d.type === 'advance' || d.type === 'advanceSettle')) return _postingsOfBase(d);
  var ex = d.extra || {}, amt = round2(Number(d.total) || 0), L = [];
  var add = function(code, dr, cr, memo) { if (code && (dr || cr)) L.push({ code: code, dr: dr, cr: cr, memo: memo || '', date: d.date, d: d }); };
  if (d.type === 'pettyFund') {
    if (ex.kind === 'return') { add(ex.fromAcc, amt, 0); add(ex.fundAcc, 0, amt); }
    else { add(ex.fundAcc, amt, 0, PC_KIND[ex.kind] || ''); add(ex.fromAcc, 0, amt); }
  } else if (d.type === 'advance') { add(ex.advAcc, amt, 0); add(ex.fromAcc, 0, amt); }
  else if (ex.dir === 'pay') { add(ex.advAcc, amt, 0, 'จ่ายเพิ่มเงินทดรอง'); add(ex.cashAcc, 0, amt); }
  else { add(ex.cashAcc, amt, 0, 'รับคืนเงินทดรอง'); add(ex.advAcc, 0, amt); }
  return L;
};
var _openDocFormBase = openDocForm;
openDocForm = function(typeKey, doc, prefill) {
  if (typeKey === 'pettyFund') return doc ? openPcMove(pcFund(doc.extra && doc.extra.fund) || {}, doc.extra && doc.extra.kind, doc) : go('billing', 'pettyCash');
  if (typeKey === 'advance') return openAdvForm(doc || null);
  if (typeKey === 'advanceSettle') { var a = doc && findDoc(doc.extra && doc.extra.advanceId); return a ? openAdvSettle(a, doc.extra.dir, doc) : go('billing', 'advances'); }
  return _openDocFormBase(typeKey, doc, prefill);
};

/* ---- ตัวช่วย ---- */
function pcAccBal(code) { return round2(allLines().reduce(function(s, l) { return l.code === code ? s + l.dr - l.cr : s; }, 0)); }
function pcPayAccs(exclude) { // บัญชีเงินสด/ธนาคารที่ใช้จ่าย
  var l = bankAccounts().map(function(a) { return [a.code, a.name]; });
  [SYS.cash, SYS.bank].forEach(function(c) { if (!l.some(function(x) { return x[0] === c; })) l.push([c, acctName(c)]); });
  return l.filter(function(x) { return (exclude || []).indexOf(x[0]) < 0; });
}
function pcOpts(list, cur) { return list.map(function(x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === cur ? ' selected' : '') + '>' + esc(x[0] + ' ' + (x[1] || '')) + '</option>'; }).join(''); }
function pcFreeCode(start) { var n = Number(start); while (STORE.accounts.some(function(a) { return a.code === String(n); }) || n === Number(SYS.inv)) n++; return String(n); }
function pcDateErr(date) { var lk = lockDate(); if (!date) return 'ระบุวันที่'; return lk && date <= lk ? 'งวดบัญชีถึงวันที่ ' + fmtDateNum(lk) + ' ถูกล็อกแล้ว' : ''; }
function pcErr(msg) { var el = byId('formError'); el.textContent = msg; el.hidden = false; }
function pcEmpList() { return '<datalist id="dl_pc_emp">' + STORE.employees.map(function(e) { return '<option value="' + esc(e.name) + '">'; }).join('') + '</datalist>'; }
async function pcSaveDoc(doc, rec) {
  if (doc) await setRec('documents', doc._id, Object.assign({}, strip(doc), rec, { updatedAt: Date.now() }));
  else await addRec('documents', Object.assign({ status:'done', createdAt: Date.now() }, rec));
}

/* ================= เงินสดย่อย ================= */
function pcFunds() { return (STORE.settings.find(function(s) { return s._id === 'petty'; }) || {}).funds || []; }
function pcFund(id) { return pcFunds().find(function(f) { return f.id === id; }); }
pageState.pcFund = '';
function pcShell() { return pageHead('เงินสดย่อย', 'ตั้งวงเงินสดย่อย บันทึกจ่ายเงินสดย่อย (ใบสำคัญจ่าย) และเบิกชดเชยให้กลับมาเต็มวงเงิน ยอดคงเหลือคำนวณจากบัญชีเงินสดย่อยในสมุดบัญชี'); }
function pcData() {
  var funds = pcFunds(), ro = fbReadOnly();
  if (!funds.length) return '<div class="yc-card adj-empty"><b>ยังไม่มีเงินสดย่อย</b><div>ตั้งวงเงินสดย่อยเพื่อจ่ายค่าใช้จ่ายเล็ก ๆ น้อย ๆ แล้วเบิกชดเชยตามที่จ่ายไป</div>' +
    (ro ? '' : '<div style="margin-top:10px"><button type="button" class="btn btn-dark" onclick="openPcFund()">+ ตั้งวงเงินสดย่อย</button></div>') + '</div>';
  var f = pcFund(pageState.pcFund) || funds[0]; pageState.pcFund = f.id;
  var bal = pcAccBal(f.acc), lim = Number(f.limit) || 0, need = round2(Math.max(lim - bal, 0));
  var h = (funds.length > 1 || !ro ? '<div class="toolbar" style="margin:0 0 10px">' + (funds.length > 1 ? '<select class="coa-select" aria-label="กองทุน" onchange="pageState.pcFund=this.value;refreshPageData()">' + funds.map(function(x) { return '<option value="' + esc(x.id) + '"' + (x.id === f.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select>' : '') +
      (ro ? '' : '<button type="button" class="btn btn-dark" onclick="pcNewExpense()">+ บันทึกจ่ายเงินสดย่อย</button><button type="button" class="btn btn-outline" onclick="openPcMove(pcFund(pageState.pcFund),\'replenish\')">เบิกชดเชย</button>' +
        '<details class="iv-new"><summary class="btn btn-outline">อื่น ๆ ▾</summary><div class="iv-menu"><button type="button" onclick="this.closest(\'details\').open=false;openPcFund(pcFund(pageState.pcFund))">แก้ไขกองทุน</button><button type="button" onclick="this.closest(\'details\').open=false;openPcMove(pcFund(pageState.pcFund),\'return\')">คืนเงินสดย่อยเข้าบัญชี</button><button type="button" onclick="this.closest(\'details\').open=false;openPcFund()">ตั้งกองทุนใหม่</button></div></details>') + '</div>' : '') +
    '<div class="kpi-row">' + kpi('ยอดคงเหลือ', fmtMoney(bal), f.acc + ' ' + (acctName(f.acc) || '')) + kpi('วงเงิน', fmtMoney(lim), 'ผู้รักษาเงิน: ' + (f.custodian || '-')) + kpi('ต้องเบิกชดเชย', fmtMoney(need), need > 0 ? 'จ่ายไปแล้วตั้งแต่เบิกครั้งก่อน' : 'เต็มวงเงิน', need > 0 ? 'warn' : '') + '</div>' +
    (bal < -0.009 ? '<div class="banner warn">ยอดเงินสดย่อยติดลบ ตรวจสอบรายการจ่ายหรือเบิกชดเชย</div>' : '');
  var ls = allLines().filter(function(l) { return l.code === f.acc; }).sort(function(a, b) { return (a.date || '').localeCompare(b.date || '') || (a.d.createdAt || 0) - (b.d.createdAt || 0); }), run = 0;
  var rows = ls.map(function(l) { run = round2(run + l.dr - l.cr); return { l: l, run: run }; }).reverse();
  h += '<div class="page-block"><h2>ความเคลื่อนไหว</h2>' + tableOrEmpty('<th>วันที่</th><th>เลขที่</th><th>รายการ</th><th class="r">รับเข้า</th><th class="r">จ่ายออก</th><th class="r">คงเหลือ</th>',
    rows.map(function(x) { var d = x.l.d; return '<tr class="row-link" tabindex="0" data-doc="' + esc(d._id) + '"><td class="num">' + fmtDateNum(x.l.date) + '</td><td class="docno">' + esc(d.docNo || '') + '</td><td>' + esc(d.type === 'pettyFund' ? (PC_KIND[d.extra && d.extra.kind] || d.typeLabel) : (d.typeLabel || '') + ' · ' + (d.party || '')) + (d.extra && d.extra.note ? '<div class="small muted">' + esc(d.extra.note) + '</div>' : '') + '</td><td class="r">' + (x.l.dr ? fmtMoney(x.l.dr) : '') + '</td><td class="r">' + (x.l.cr ? fmtMoney(x.l.cr) : '') + '</td><td class="r">' + fmtMoney(x.run) + '</td></tr>'; }).join(''),
    'ยังไม่มีรายการ') + '</div>';
  return h + '<p class="small muted">จ่ายเงินสดย่อยบันทึกเป็นค่าใช้จ่าย (มี VAT / หัก ณ ที่จ่ายได้) ที่จ่ายจากบัญชีเงินสดย่อย · เบิกชดเชย = โอนจากธนาคารเข้าเงินสดย่อยเท่ากับยอดที่จ่ายไป</p>';
}
function openPcFund(f) {
  if (fbReadOnly()) return;
  var used = pcFunds().filter(function(x) { return !f || x.id !== f.id; }).map(function(x) { return x.acc; });
  var accs = bankAccounts().filter(function(a) { return used.indexOf(a.code) < 0; }).map(function(a) { return [a.code, a.name]; });
  var guess = accs.find(function(a) { return /ย่อย/.test(a[1]); }), newCode = pcFreeCode(1111);
  var h = pcEmpList() + '<div class="grid-2"><div class="field"><label for="pcName">ชื่อกองทุน</label><input id="pcName" value="' + esc(f ? f.name : (pcFunds().length ? 'เงินสดย่อย ' + (pcFunds().length + 1) : 'เงินสดย่อย')) + '"></div>' +
    '<div class="field"><label for="pcCust">ผู้รักษาเงิน</label><input id="pcCust" list="dl_pc_emp" value="' + esc(f ? f.custodian || '' : '') + '"></div></div>' +
    '<div class="grid-2"><div class="field"><label for="pcLimit">วงเงิน</label><input id="pcLimit" type="number" min="0" step="0.01" value="' + esc(f ? f.limit : '') + '"></div>' +
    '<div class="field"><label for="pcAcc">บัญชีเงินสดย่อย</label>' + (f ? '<input id="pcAcc" value="' + esc(f.acc + ' ' + (acctName(f.acc) || '')) + '" disabled>' : '<select id="pcAcc"><option value="@new">สร้างบัญชีใหม่ ' + newCode + ' ' + esc(pcFunds().length ? 'เงินสดย่อย ' + (pcFunds().length + 1) : 'เงินสดย่อย') + '</option>' + pcOpts(accs, guess && guess[0]) + '</select>') + '</div></div>' +
    (f ? '' : '<div class="grid-2"><div class="field"><label for="pcAmt">เงินตั้งต้น (โอนเข้าเงินสดย่อย)</label><input id="pcAmt" type="number" min="0" step="0.01"></div><div class="field"><label for="pcFrom">จ่ายจากบัญชี</label><select id="pcFrom">' + pcOpts(pcPayAccs(), SYS.bank) + '</select></div></div>' +
      '<div class="field"><label for="pcDate">วันที่</label><input id="pcDate" type="date" value="' + todayStr() + '"></div><p class="small muted" style="margin:0">เว้นเงินตั้งต้นว่างไว้ ถ้าลงยอดเงินสดย่อยไว้แล้ว (เช่น ยอดยกมา)</p>') +
    '<div class="form-error" id="formError" hidden></div>';
  openModal({ title: f ? 'แก้ไขกองทุนเงินสดย่อย' : 'ตั้งวงเงินสดย่อย', body: h, focus:false, buttons:[CANCEL_BTN, { label:'บันทึก', cls:'btn-dark', onClick: async function(btn) {
    var name = byId('pcName').value.trim(), lim = Number(byId('pcLimit').value) || 0, amt = f ? 0 : Number(byId('pcAmt').value) || 0;
    if (!name) return pcErr('ระบุชื่อกองทุน');
    if (lim <= 0) return pcErr('ระบุวงเงินมากกว่า 0');
    if (amt < 0) return pcErr('เงินตั้งต้นต้องไม่ติดลบ');
    if (amt && pcDateErr(byId('pcDate').value)) return pcErr(pcDateErr(byId('pcDate').value));
    btn.disabled = true;
    try {
      var list = pcFunds().slice(), acc = f ? f.acc : byId('pcAcc').value;
      if (acc === '@new') { acc = newCode; await addRec('accounts', { code: acc, name: name, accType: 'bank' }); }
      var rec = { id: f ? f.id : 'pc' + Date.now().toString(36), name: name, acc: acc, custodian: byId('pcCust').value.trim(), limit: round2(lim) };
      if (f) list = list.map(function(x) { return x.id === f.id ? rec : x; }); else list.push(rec);
      await saveSettings('petty', { funds: list });
      if (amt) { var dt = byId('pcDate').value; await pcSaveDoc(null, { type:'pettyFund', typeLabel: DOC_TYPES.pettyFund.label, group:'other', party: name, date: dt, docNo: nextDocNo('pettyFund', dt), total: round2(amt), subtotal: round2(amt), net: round2(amt), extra: { fund: rec.id, kind:'setup', fundAcc: acc, fromAcc: byId('pcFrom').value } }); }
      pageState.pcFund = rec.id; closeModal(); showToast(f ? 'บันทึกกองทุนแล้ว' : 'ตั้งวงเงินสดย่อยแล้ว'); refreshPageData();
    } catch (e) { btn.disabled = false; pcErr('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e)); }
  } }] });
}
// เบิกชดเชย / คืนเงินสดย่อยเข้าบัญชี
function openPcMove(f, kind, doc) {
  if (!f || !f.acc || fbReadOnly()) return;
  kind = kind || 'replenish';
  var ex = (doc && doc.extra) || {}, bal = pcAccBal(f.acc), def = kind === 'return' ? Math.max(bal, 0) : Math.max((Number(f.limit) || 0) - bal, 0);
  var date = (doc && doc.date) || todayStr();
  var h = '<p class="small muted" style="margin:0">' + esc(f.name) + ' · ยอดคงเหลือ ' + fmtMoney(bal) + ' · วงเงิน ' + fmtMoney(f.limit) + '</p>' +
    '<div class="grid-2"><div class="field"><label for="pmDate">วันที่</label><input id="pmDate" type="date" value="' + esc(date) + '"></div><div class="field"><label for="pmAmt">จำนวนเงิน</label><input id="pmAmt" type="number" min="0" step="0.01" value="' + esc(doc ? doc.total : round2(def) || '') + '"></div></div>' +
    '<div class="field"><label for="pmAcc">' + (kind === 'return' ? 'นำเข้าบัญชี' : 'จ่ายจากบัญชี') + '</label><select id="pmAcc">' + pcOpts(pcPayAccs([f.acc]), ex.fromAcc || SYS.bank) + '</select></div>' +
    '<div class="field"><label for="pmNote">หมายเหตุ</label><input id="pmNote" value="' + esc(ex.note || '') + '"></div><div class="form-error" id="formError" hidden></div>';
  openModal({ title: (PC_KIND[kind] || 'เงินสดย่อย') + (doc ? ' ' + (doc.docNo || '') : ''), body: h, focus:false, buttons:[CANCEL_BTN, { label:'บันทึก', cls:'btn-dark', onClick: async function(btn) {
    var dt = byId('pmDate').value, amt = round2(Number(byId('pmAmt').value) || 0);
    if (amt <= 0) return pcErr('ระบุจำนวนเงินมากกว่า 0');
    if (pcDateErr(dt) || (doc && pcDateErr(doc.date))) return pcErr(pcDateErr(dt) || pcDateErr(doc.date));
    btn.disabled = true;
    try {
      await pcSaveDoc(doc, { type:'pettyFund', typeLabel: DOC_TYPES.pettyFund.label, group:'other', party: f.name, date: dt, docNo: (doc && doc.docNo) || nextDocNo('pettyFund', dt), total: amt, subtotal: amt, net: amt, extra: { fund: f.id, kind: kind, fundAcc: f.acc, fromAcc: byId('pmAcc').value, note: byId('pmNote').value.trim() } });
      closeModal(); showToast(PC_KIND[kind] + ' ' + fmtMoney(amt) + ' แล้ว'); refreshPageData();
    } catch (e) { btn.disabled = false; pcErr('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e)); }
  } }] });
}
function pcNewExpense() {
  var f = pcFund(pageState.pcFund); if (!f) return;
  openDocForm('expense', null, { date: todayStr(), extra: { method:'เงินสด', note: 'จ่ายจาก' + f.name }, _keep: { bankAcc: f.acc, pettyFund: f.id } });
}

/* ================= เงินทดรองจ่าย ================= */
pageState.advTab = 'open';
function advAccDefault() {
  var a = STORE.accounts.find(function(x) { return /ทดรอง/.test(x.name) && accBaseOf(x.code) === 'asset'; });
  return a ? a.code : '';
}
function advInfo(a) {
  var spent = 0, ret = 0, pay = 0, exps = [], sets = [];
  STORE.documents.forEach(function(d) {
    if (d.voided || !d.extra || d.extra.advanceId !== a._id) return;
    if (d.type === 'advanceSettle') { sets.push(d); if (d.extra.dir === 'pay') pay += Number(d.total) || 0; else ret += Number(d.total) || 0; }
    else if (DOC_TYPES[d.type] && DOC_TYPES[d.type].flow === 'exp') { exps.push(d); spent += (Number(d.total) || 0) - (Number(d.wht) || 0); }
  });
  var out = round2((Number(a.total) || 0) - spent - ret + pay);
  var st = Math.abs(out) < 0.01 ? 'done' : out < 0 ? 'owe' : (a.extra && a.extra.dueDate && a.extra.dueDate < todayStr() ? 'late' : 'open');
  return { spent: round2(spent), ret: round2(ret), pay: round2(pay), out: out, st: st, exps: exps, sets: sets };
}
var ADV_ST = { open:['ค้างเคลียร์','st-unpaid'], late:['เกินกำหนดเคลียร์','st-overdue'], owe:['ต้องจ่ายเพิ่มให้พนักงาน','st-unpaid'], done:['เคลียร์แล้ว','st-paid'] };
function advShell() { return pageHead('เงินทดรองจ่าย', 'จ่ายเงินทดรองให้พนักงานไปใช้จ่ายก่อน แล้วเคลียร์ด้วยใบเสร็จค่าใช้จ่าย รับเงินที่เหลือคืน หรือจ่ายเพิ่มถ้าใช้เกิน'); }
function advData() {
  var ro = fbReadOnly(), all = STORE.documents.filter(function(d) { return d.type === 'advance' && !d.voided; }).map(function(a) { return { a: a, i: advInfo(a) }; })
    .sort(function(x, y) { return (y.a.date || '').localeCompare(x.a.date || '') || String(y.a.docNo || '').localeCompare(String(x.a.docNo || '')); });
  var open = all.filter(function(x) { return x.i.st !== 'done'; }), list = pageState.advTab === 'open' ? open : pageState.advTab === 'done' ? all.filter(function(x) { return x.i.st === 'done'; }) : all;
  var outTot = round2(open.reduce(function(s, x) { return s + Math.max(x.i.out, 0); }, 0)), late = open.filter(function(x) { return x.i.st === 'late'; }).length;
  var h = (ro ? '' : '<div class="toolbar" style="margin:0 0 10px"><button type="button" class="btn btn-dark" onclick="openAdvForm()">+ จ่ายเงินทดรอง</button></div>') +
    '<div class="kpi-row">' + kpi('ยอดค้างเคลียร์', fmtMoney(outTot), open.length + ' รายการ') + kpi('เกินกำหนดเคลียร์', String(late), 'รายการ', late ? 'warn' : '') + '</div>' +
    '<div class="jn-tabs">' + [['open','ค้างเคลียร์'],['done','เคลียร์แล้ว'],['all','ทั้งหมด']].map(function(t) { return '<button type="button" class="' + (pageState.advTab === t[0] ? 'on' : '') + '" onclick="pageState.advTab=\'' + t[0] + '\';refreshPageData()">' + t[1] + '</button>'; }).join('') + '</div>';
  if (!list.length) return h + '<div class="yc-card adj-empty"><b>ไม่มีรายการ</b><div>' + (all.length ? 'ไม่มีรายการในแท็บนี้' : 'ยังไม่มีเงินทดรองจ่าย') + '</div></div>';
  return h + '<div class="table-wrap"><table class="data-table"><thead><tr><th>เลขที่ / วันที่</th><th>พนักงาน / วัตถุประสงค์</th><th>กำหนดเคลียร์</th><th class="r">จำนวนเงิน</th><th class="r">ใช้จ่ายแล้ว</th><th class="r">คืน / จ่ายเพิ่ม</th><th class="r">คงค้าง / สถานะ</th>' + (ro ? '' : '<th></th>') + '</tr></thead><tbody>' +
    list.map(function(x) { var a = x.a, i = x.i, s = ADV_ST[i.st], ex = a.extra || {};
      return '<tr><td style="white-space:nowrap"><a href="#" class="po-link" data-doc="' + esc(a._id) + '" onclick="event.preventDefault()">' + esc(a.docNo || '-') + '</a><div class="small muted">' + fmtDateNum(a.date) + '</div></td><td>' + esc(a.party || '') + (ex.purpose ? '<div class="small muted">' + esc(ex.purpose) + '</div>' : '') + '</td><td class="num">' + (ex.dueDate ? fmtDateNum(ex.dueDate) : '-') + '</td>' +
        '<td class="r">' + fmtMoney(a.total) + '</td><td class="r">' + fmtMoney(i.spent) + '</td><td class="r">' + (i.ret ? '−' + fmtMoney(i.ret) : '') + (i.pay ? (i.ret ? '<br>' : '') + '+' + fmtMoney(i.pay) : '') + '</td><td class="r"><b>' + fmtMoney(i.out) + '</b><div><span class="status ' + s[1] + '">' + s[0] + '</span></div></td>' +
        (ro ? '' : '<td class="r"><button type="button" class="btn btn-outline btn-sm" onclick="openAdvClear(\'' + esc(a._id) + '\')">' + (i.st === 'done' ? 'ดูรายละเอียด' : 'เคลียร์') + '</button></td>') + '</tr>'; }).join('') +
    '</tbody></table></div><p class="small muted">ค่าใช้จ่ายที่เคลียร์บันทึกเป็นค่าใช้จ่ายจากบัญชีเงินทดรองจ่าย (มี VAT / หัก ณ ที่จ่ายได้) · คงค้าง = จำนวนเงิน − ใช้จ่ายแล้ว − รับคืน + จ่ายเพิ่ม</p>';
}
function openAdvForm(doc) {
  if (fbReadOnly()) return;
  var ex = (doc && doc.extra) || {}, accs = STORE.accounts.filter(function(a) { return accBaseOf(a.code) === 'asset' && accSubtype(a) !== 'bank'; }).map(function(a) { return [a.code, a.name]; });
  var cur = ex.advAcc || advAccDefault(), newCode = pcFreeCode(1135), date = (doc && doc.date) || todayStr();
  var h = pcEmpList() + '<div class="grid-2"><div class="field"><label for="avEmp">พนักงาน *</label><input id="avEmp" list="dl_pc_emp" value="' + esc((doc && doc.party) || '') + '"></div><div class="field"><label for="avDate">วันที่จ่าย</label><input id="avDate" type="date" value="' + esc(date) + '"></div></div>' +
    '<div class="grid-2"><div class="field"><label for="avAmt">จำนวนเงิน *</label><input id="avAmt" type="number" min="0" step="0.01" value="' + esc(doc ? doc.total : '') + '"></div><div class="field"><label for="avDue">กำหนดเคลียร์</label><input id="avDue" type="date" value="' + esc(ex.dueDate || '') + '"></div></div>' +
    '<div class="field"><label for="avPurpose">วัตถุประสงค์</label><input id="avPurpose" value="' + esc(ex.purpose || '') + '" placeholder="เช่น ค่าเดินทางไปพบลูกค้า"></div>' +
    '<div class="grid-2"><div class="field"><label for="avFrom">จ่ายจากบัญชี</label><select id="avFrom">' + pcOpts(pcPayAccs(), ex.fromAcc || SYS.bank) + '</select></div>' +
    '<div class="field"><label for="avAcc">บัญชีเงินทดรองจ่าย</label><select id="avAcc">' + (cur ? '' : '<option value="@new">สร้างบัญชีใหม่ ' + newCode + ' เงินทดรองจ่าย</option>') + pcOpts(accs, cur) + '</select></div></div>' +
    '<div class="form-error" id="formError" hidden></div>';
  openModal({ title: doc ? 'แก้ไขเงินทดรองจ่าย ' + (doc.docNo || '') : 'จ่ายเงินทดรอง', body: h, focus:false, buttons:[CANCEL_BTN, { label:'บันทึก', cls:'btn-dark', onClick: async function(btn) {
    var emp = byId('avEmp').value.trim(), dt = byId('avDate').value, amt = round2(Number(byId('avAmt').value) || 0), due = byId('avDue').value;
    if (!emp) return pcErr('ระบุพนักงาน');
    if (amt <= 0) return pcErr('ระบุจำนวนเงินมากกว่า 0');
    if (due && due < dt) return pcErr('กำหนดเคลียร์ต้องไม่ก่อนวันที่จ่าย');
    if (pcDateErr(dt) || (doc && pcDateErr(doc.date))) return pcErr(pcDateErr(dt) || pcDateErr(doc.date));
    btn.disabled = true;
    try {
      var acc = byId('avAcc').value;
      if (acc === '@new') { acc = newCode; await addRec('accounts', { code: acc, name: 'เงินทดรองจ่าย', accType: 'curAsset' }); }
      await pcSaveDoc(doc, { type:'advance', typeLabel: DOC_TYPES.advance.label, group:'other', party: emp, date: dt, docNo: (doc && doc.docNo) || nextDocNo('advance', dt), total: amt, subtotal: amt, net: amt, extra: { advAcc: acc, fromAcc: byId('avFrom').value, dueDate: due, purpose: byId('avPurpose').value.trim() } });
      closeModal(); showToast('บันทึกเงินทดรองจ่าย ' + fmtMoney(amt) + ' แล้ว'); refreshPageData();
    } catch (e) { btn.disabled = false; pcErr('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e)); }
  } }] });
}
function openAdvClear(id) {
  var a = findDoc(id); if (!a) return;
  var i = advInfo(a), ro = fbReadOnly(), s = ADV_ST[i.st];
  var rows = i.exps.map(function(d) { return '<tr class="row-link" data-docm="' + esc(d._id) + '"><td class="num">' + fmtDateNum(d.date) + '</td><td class="docno">' + esc(d.docNo || '') + '</td><td>' + esc(d.party || '') + '</td><td class="r">' + fmtMoney((Number(d.total) || 0) - (Number(d.wht) || 0)) + '</td></tr>'; })
    .concat(i.sets.map(function(d) { return '<tr class="row-link" data-docm="' + esc(d._id) + '"><td class="num">' + fmtDateNum(d.date) + '</td><td class="docno">' + esc(d.docNo || '') + '</td><td>' + (d.extra.dir === 'pay' ? 'จ่ายเพิ่มให้พนักงาน' : 'รับเงินคืน') + '</td><td class="r">' + (d.extra.dir === 'pay' ? '+' : '−') + fmtMoney(d.total) + '</td></tr>'; })).join('');
  var body = '<p style="margin:0">' + esc(a.party) + ' · ' + esc(a.docNo || '') + ' · ' + fmtDateNum(a.date) + ((a.extra || {}).purpose ? ' · ' + esc(a.extra.purpose) : '') + '</p>' +
    '<div class="kpi-row">' + kpi('จำนวนเงินทดรอง', fmtMoney(a.total), '') + kpi('ใช้จ่ายแล้ว', fmtMoney(i.spent), i.exps.length + ' รายการ') + kpi('คงค้าง', fmtMoney(i.out), s[0], i.st === 'done' ? '' : 'warn') + '</div>' +
    '<div class="items-wrap"><table class="data-table"><thead><tr><th>วันที่</th><th>เลขที่</th><th>รายการ</th><th class="r">จำนวนเงิน</th></tr></thead><tbody>' + (rows || '<tr><td colspan="4" class="empty-hint">ยังไม่มีรายการเคลียร์</td></tr>') + '</tbody></table></div>';
  var b = [{ label:'ปิด', onClick: closeModal }];
  if (!ro) {
    b.push({ label:'+ ค่าใช้จ่ายจากเงินทดรอง', onClick: function() { closeModal(); openDocForm('expense', null, { date: todayStr(), extra: { method:'เงินสด', note:'เคลียร์เงินทดรอง ' + (a.docNo || '') + ' · ' + a.party }, _keep: { bankAcc: a.extra.advAcc, advanceId: a._id } }); } });
    if (i.out > 0.009) b.push({ label:'รับเงินคืน', cls:'btn-dark', onClick: function() { openAdvSettle(a, 'return'); } });
    if (i.out < -0.009) b.push({ label:'จ่ายเพิ่มให้พนักงาน', cls:'btn-dark', onClick: function() { openAdvSettle(a, 'pay'); } });
  }
  openModal({ title:'เคลียร์เงินทดรองจ่าย', body: body, focus:false, buttons: b, onMount: function() { modalBody.querySelectorAll('[data-docm]').forEach(function(tr) { tr.addEventListener('click', function() { openDocDetail(tr.dataset.docm); }); }); } });
}
function openAdvSettle(a, dir, doc) {
  if (fbReadOnly()) return;
  var i = advInfo(a), amt = doc ? doc.total : Math.abs(i.out), ex = (doc && doc.extra) || {}, date = (doc && doc.date) || todayStr();
  var h = '<p class="small muted" style="margin:0">' + esc(a.party) + ' · ' + esc(a.docNo || '') + ' · คงค้าง ' + fmtMoney(i.out) + '</p>' +
    '<div class="grid-2"><div class="field"><label for="asDate">วันที่</label><input id="asDate" type="date" value="' + esc(date) + '"></div><div class="field"><label for="asAmt">จำนวนเงิน</label><input id="asAmt" type="number" min="0" step="0.01" value="' + esc(round2(amt) || '') + '"></div></div>' +
    '<div class="field"><label for="asAcc">' + (dir === 'pay' ? 'จ่ายจากบัญชี' : 'รับเข้าบัญชี') + '</label><select id="asAcc">' + pcOpts(pcPayAccs([a.extra.advAcc]), ex.cashAcc || SYS.cash) + '</select></div><div class="form-error" id="formError" hidden></div>';
  openModal({ title: dir === 'pay' ? 'จ่ายเพิ่มให้พนักงาน' : 'รับเงินทดรองคืน', body: h, focus:false, buttons:[CANCEL_BTN, { label:'บันทึก', cls:'btn-dark', onClick: async function(btn) {
    var dt = byId('asDate').value, v = round2(Number(byId('asAmt').value) || 0);
    if (v <= 0) return pcErr('ระบุจำนวนเงินมากกว่า 0');
    if (dt < a.date) return pcErr('วันที่ต้องไม่ก่อนวันที่จ่ายเงินทดรอง');
    if (pcDateErr(dt) || (doc && pcDateErr(doc.date))) return pcErr(pcDateErr(dt) || pcDateErr(doc.date));
    btn.disabled = true;
    try {
      await pcSaveDoc(doc, { type:'advanceSettle', typeLabel: DOC_TYPES.advanceSettle.label, group:'other', party: a.party, date: dt, docNo: (doc && doc.docNo) || nextDocNo('advanceSettle', dt), total: v, subtotal: v, net: v, extra: { advanceId: a._id, advAcc: a.extra.advAcc, cashAcc: byId('asAcc').value, dir: dir } });
      closeModal(); showToast((dir === 'pay' ? 'จ่ายเพิ่ม ' : 'รับคืน ') + fmtMoney(v) + ' แล้ว'); refreshPageData();
    } catch (e) { btn.disabled = false; pcErr('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e)); }
  } }] });
}
