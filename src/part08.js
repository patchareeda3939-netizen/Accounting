
/* ================= Bank accounts & register (accounting:bankTx) ================= */
pageState.bankSel = null; txState['accounting:bankTx'] = { type:'', period:'all', status:'', page:0 };
function bankAccList() { return STORE.accounts.filter(function(a) { return accSubtype(a) === 'bank'; }).sort(function(a, b) { return String(a.code).localeCompare(String(b.code)); }); }
function bankBal(code, end) {
  var b = (end ? balancesAt(end) : accountBalances())[code] || { dr:0, cr:0 };
  return round2(b.dr - b.cr);
}
function bankShell() {
  return '<div class="coa-bar"><div><h1 class="section-title" style="margin:0">ธุรกรรมธนาคาร</h1><p class="section-sub">บัญชีธนาคารและเงินสดของบริษัท ยอดคงเหลือคำนวณจากทุกรายการที่บันทึก</p></div>' +
    '<div class="coa-actions"><button type="button" class="btn btn-outline" onclick="openBankAccForm()">+ เพิ่มบัญชีธนาคาร</button></div></div>';
}
function bankData() {
  var list = bankAccList();
  if (!list.length) return '<div class="empty-state"><div class="empty-state-text"><h3>ยังไม่มีบัญชีธนาคาร</h3><p>เพิ่มบัญชีธนาคารหรือเงินสดของบริษัท พร้อมยอดยกมา แล้วบันทึกฝาก ถอน และโอนเงินได้เอง ไม่ต้องเชื่อมต่อธนาคาร</p><div class="toolbar"><button class="btn btn-dark" type="button" onclick="openBankAccForm()">เพิ่มบัญชีธนาคาร</button></div></div></div>';
  if (!pageState.bankSel || !list.some(function(a) { return a.code === pageState.bankSel; })) pageState.bankSel = list[0].code;
  var sel = list.find(function(a) { return a.code === pageState.bankSel; }), total = 0;
  var cards = list.map(function(a) {
    var bal = bankBal(a.code); total += bal;
    return '<button type="button" class="bank-card' + (a.code === sel.code ? ' on' : '') + '" data-banksel="' + esc(a.code) + '"><span class="bank-name">' + esc(a.name) + '</span><span class="bank-no">' + esc([a.bankName, a.accountNo].filter(Boolean).join(' · ') || a.code) + '</span><span class="bank-bal' + (bal < 0 ? ' neg-text' : '') + '">' + fmtMoney(bal) + '</span><span class="bank-lbl">ยอดคงเหลือตามบัญชี</span></button>';
  }).join('');
  var r = periodRange(txSt('accounting:bankTx').period || 'all');
  var lines = allLines().filter(function(l) { return l.code === sel.code; }).sort(function(a, b) { return (a.date || '').localeCompare(b.date || '') || ((a.d.createdAt || 0) - (b.d.createdAt || 0)); });
  var run = 0, rows = [];
  lines.forEach(function(l) {
    run = round2(run + l.dr - l.cr);
    if (inRange(l.date || '', r)) rows.push('<tr class="row-link" tabindex="0" data-doc="' + esc(l.d._id) + '"><td class="num">' + fmtDateNum(l.date) + '</td><td>' + esc(l.d.typeLabel || '') + '</td><td class="num">' + esc(l.d.docNo || '') + '</td><td>' + esc(l.d.party || '') + (l.memo ? '<div class="small muted">' + esc(l.memo) + '</div>' : '') + '</td><td class="r">' + (l.dr ? fmtMoney(l.dr) : '') + '</td><td class="r">' + (l.cr ? fmtMoney(l.cr) : '') + '</td><td class="r' + (run < 0 ? ' neg-text' : '') + '">' + fmtMoney(run) + '</td></tr>');
  });
  rows.reverse();
  var st = txSt('accounting:bankTx');
  return '<div class="bank-total">ยอดรวมทุกบัญชี <b>' + fmtMoney(round2(total)) + '</b></div><div class="bank-cards">' + cards + '</div>' +
    '<div class="page-block"><div class="coa-bar" style="margin-bottom:8px"><div><h2 style="margin:0">' + esc(sel.code + ' ' + sel.name) + '</h2><div class="small muted">' + esc([sel.bankName, sel.accountNo, sel.detailType].filter(Boolean).join(' · ')) + '</div></div>' +
    '<div class="coa-actions"><button type="button" class="btn btn-dark" data-banktx="in">ฝากเงิน / รับเงิน</button><button type="button" class="btn btn-outline" data-banktx="out">ถอน / จ่ายเงิน</button><button type="button" class="btn btn-outline" data-banktx="xfer">โอนระหว่างบัญชี</button><button type="button" class="btn btn-outline" data-bankedit="' + esc(sel._id) + '">แก้ไขบัญชี</button></div></div>' +
    '<div class="coa-filters"><label class="date-chip">วันที่: <select data-tx="period" aria-label="ช่วงวันที่">' + [['all','ทั้งหมด'],['month','เดือนนี้'],['quarter','ไตรมาสนี้'],['year','ปีนี้'],['last12','12 เดือนที่ผ่านมา'],['custom','กำหนดวันที่เอง']].map(function(o) { return '<option value="' + o[0] + '"' + ((st.period || 'all') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' + customRangeHTML(st.period) + '</div>' +
    '<div class="items-wrap"><table class="data-table"><thead><tr><th>วันที่</th><th>ประเภท</th><th>เลขที่</th><th>คู่ค้า / คำอธิบาย</th><th class="r">ฝาก (เข้า)</th><th class="r">ถอน (ออก)</th><th class="r">คงเหลือ</th></tr></thead><tbody>' +
    (rows.join('') || '<tr><td colspan="7" class="empty-hint">ยังไม่มีรายการในช่วงนี้</td></tr>') + '</tbody></table></div></div>';
}
function bindBank() {
  var c = byId('bankBody'); if (!c) return;
  c.querySelectorAll('[data-banksel]').forEach(function(b) { b.onclick = function() { pageState.bankSel = b.dataset.banksel; refreshPageData(); }; });
  c.querySelectorAll('[data-banktx]').forEach(function(b) { b.onclick = function() { openBankTxForm(b.dataset.banktx); }; });
  c.querySelectorAll('[data-bankedit]').forEach(function(b) { b.onclick = function() { openBankAccForm(STORE.accounts.find(function(a) { return a._id === b.dataset.bankedit; })); }; });
  c.querySelectorAll('[data-tx="period"]').forEach(function(s) { s.onchange = function() { txSt('accounting:bankTx').period = s.value; refreshPageData(); }; });
}
function nextBankCode() {
  var used = {}; STORE.accounts.forEach(function(a) { used[a.code] = 1; });
  for (var n = 1121; n < 1200; n++) if (!used[String(n)]) return String(n);
  return '1199';
}
async function ensureOpeningEquity() {
  var a = STORE.accounts.find(function(x) { return x.code === '3900'; });
  if (!a) await addRec('accounts', { code:'3900', name:'ส่วนของเจ้าของ-ยอดยกมา', accType:'equity', type:'equity', detailType:'ยอดยกมาเปิดบัญชี', createdAt: Date.now() });
  return '3900';
}
function openBankAccForm(acc) {
  var ob = acc && STORE.documents.find(function(d) { return d.extra && d.extra.openingFor === acc.code; });
  var obAmt = ob ? (ob.items || []).reduce(function(s, r) { return s + (String(r.account).split(' ')[0] === acc.code ? (Number(r.debit) || 0) - (Number(r.credit) || 0) : 0); }, 0) : '';
  var body = '<div class="grid-2">' +
    '<div class="field"><label for="baName">ชื่อบัญชี <b class="neg-text">*</b></label><input id="baName" value="' + esc(acc ? acc.name : '') + '" placeholder="เช่น กสิกรไทย ออมทรัพย์"></div>' +
    '<div class="field"><label for="baCode">รหัสบัญชี (ผังบัญชี)</label><input id="baCode" value="' + esc(acc ? acc.code : nextBankCode()) + '"' + (acc ? ' readonly' : '') + '></div>' +
    '<div class="field"><label for="baBank">ธนาคาร</label><input id="baBank" list="dlBanks" value="' + esc(acc && acc.bankName || '') + '" placeholder="เช่น ธนาคารกสิกรไทย"><datalist id="dlBanks">' + ['ธนาคารกสิกรไทย','ธนาคารไทยพาณิชย์','ธนาคารกรุงเทพ','ธนาคารกรุงไทย','ธนาคารกรุงศรีอยุธยา','ธนาคารทหารไทยธนชาต','ธนาคารออมสิน','ธนาคารยูโอบี','ธนาคารซีไอเอ็มบี ไทย','เงินสด'].map(function(b) { return '<option value="' + b + '">'; }).join('') + '</datalist></div>' +
    '<div class="field"><label for="baNo">เลขที่บัญชี</label><input id="baNo" value="' + esc(acc && acc.accountNo || '') + '" placeholder="xxx-x-xxxxx-x"></div>' +
    '<div class="field"><label for="baType">ประเภทบัญชี</label><select id="baType">' + ['ออมทรัพย์','กระแสรายวัน','ฝากประจำ','เงินสดในมือ','เงินสดย่อย'].map(function(t) { return '<option' + (acc && acc.detailType === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div><div></div>' +
    '<div class="field"><label for="baOpen">ยอดยกมา (บาท)</label><input id="baOpen" type="number" step="0.01" value="' + (obAmt === '' ? '' : round2(obAmt)) + '" placeholder="0.00"></div>' +
    '<div class="field"><label for="baOpenDate">ณ วันที่</label><input id="baOpenDate" type="date" value="' + esc(ob ? ob.date : todayStr().slice(0, 4) + '-01-01') + '"></div></div>' +
    '<p class="small muted" style="margin:0">ยอดยกมาบันทึกเป็นสมุดรายวัน: เดบิตบัญชีนี้ / เครดิต 3900 ส่วนของเจ้าของ-ยอดยกมา</p><div class="form-error" id="formError" hidden></div>';
  openModal({ title: acc ? 'แก้ไขบัญชีธนาคาร' : 'เพิ่มบัญชีธนาคาร', body: body, buttons:[CANCEL_BTN, { label:'บันทึก', cls:'btn-dark', onClick: async function(btn) {
    var err = byId('formError'), name = byId('baName').value.trim(), code = byId('baCode').value.trim();
    if (!name) { err.textContent = 'กรุณาระบุชื่อบัญชี'; err.hidden = false; return; }
    if (!acc && (!code || STORE.accounts.some(function(a) { return a.code === code; }))) { err.textContent = 'รหัสบัญชีว่างหรือซ้ำกับที่มีอยู่'; err.hidden = false; return; }
    btn.disabled = true;
    var rec = { code: code, name: name, accType:'bank', type:'asset', bankName: byId('baBank').value.trim(), accountNo: byId('baNo').value.trim(), detailType: byId('baType').value };
    if (acc) await setRec('accounts', acc._id, Object.assign({}, strip(acc), rec, { updatedAt: Date.now() }));
    else await addRec('accounts', Object.assign(rec, { createdAt: Date.now() }));
    var amt = round2(Number(byId('baOpen').value) || 0), date = byId('baOpenDate').value || todayStr();
    if (amt || ob) {
      var eq = await ensureOpeningEquity();
      var items = amt >= 0 ? [{ account: code + ' ' + name, debit: amt, credit: 0 }, { account: eq + ' ส่วนของเจ้าของ-ยอดยกมา', debit: 0, credit: amt }] : [{ account: eq + ' ส่วนของเจ้าของ-ยอดยกมา', debit: -amt, credit: 0 }, { account: code + ' ' + name, debit: 0, credit: -amt }];
      var jd = { type:'journalEntry', typeLabel: DOC_TYPES.journalEntry.label, group:'other', party:'ยอดยกมา ' + name, date: date, items: items, total: Math.abs(amt), extra: { openingFor: code }, status:'done' };
      if (ob) { if (amt) await setRec('documents', ob._id, Object.assign({}, strip(ob), jd, { docNo: ob.docNo, updatedAt: Date.now() })); else await delRec('documents', ob._id); }
      else await addRec('documents', Object.assign(jd, { docNo: nextDocNo('journalEntry', date), createdAt: Date.now() }));
    }
    pageState.bankSel = code; closeModal(); showToast('บันทึกบัญชีธนาคารแล้ว');
    if (route.key !== 'accounting' || route.child !== 'bankTx') go('accounting', 'bankTx');
  } }] });
}
function openBankTxForm(kind) {
  var banks = bankAccList(), cur = pageState.bankSel;
  var bankSel = function(id, v) { return '<select id="' + id + '">' + banks.map(function(a) { return '<option value="' + esc(a.code) + '"' + (a.code === v ? ' selected' : '') + '>' + esc(a.code + ' ' + a.name) + '</option>'; }).join('') + '</select>'; };
  var others = STORE.accounts.filter(function(a) { return a.code !== cur; }).sort(function(a, b) { return String(a.code).localeCompare(String(b.code)); });
  var defCode = kind === 'in' ? '4110' : '5290';
  var accSel = '<select id="btAcc">' + others.map(function(a) { return '<option value="' + esc(a.code) + '"' + (a.code === defCode ? ' selected' : '') + '>' + esc(a.code + ' ' + a.name) + ' · ' + esc(subtypeLabel(accSubtype(a))) + '</option>'; }).join('') + '</select>';
  var title = { in:'ฝากเงิน / รับเงินเข้าบัญชี', out:'ถอน / จ่ายเงินจากบัญชี', xfer:'โอนเงินระหว่างบัญชี' }[kind];
  var body = '<div class="grid-2">' +
    (kind === 'xfer' ? '<div class="field"><label for="btFrom">จากบัญชี</label>' + bankSel('btFrom', cur) + '</div><div class="field"><label for="btTo">เข้าบัญชี</label>' + bankSel('btTo', (banks.find(function(a) { return a.code !== cur; }) || {}).code) + '</div>'
      : '<div class="field"><label for="btBank">บัญชีธนาคาร</label>' + bankSel('btBank', cur) + '</div><div class="field"><label for="btAcc">' + (kind === 'in' ? 'รับจาก (บัญชีคู่)' : 'จ่ายเป็น (บัญชีคู่)') + '</label>' + accSel + '</div>') +
    '<div class="field"><label for="btDate">วันที่</label><input id="btDate" type="date" value="' + todayStr() + '"></div>' +
    '<div class="field"><label for="btAmt">จำนวนเงิน (บาท) <b class="neg-text">*</b></label><input id="btAmt" type="number" step="0.01" min="0" placeholder="0.00"></div>' +
    '<div class="field"><label for="btParty">คู่ค้า / คำอธิบาย</label><input id="btParty" placeholder="' + (kind === 'xfer' ? 'โอนระหว่างบัญชี' : 'เช่น ดอกเบี้ยรับ, ค่าธรรมเนียมธนาคาร') + '"></div>' +
    '<div class="field"><label for="btRef">เลขอ้างอิง</label><input id="btRef"></div></div>' +
    (kind !== 'xfer' ? '<p class="small muted" style="margin:0">รับชำระจากลูกค้าหรือจ่ายบิลผู้ขาย ให้บันทึกจากใบแจ้งหนี้หรือบิลนั้นแทน เพื่อให้ลูกหนี้/เจ้าหนี้ลดลงถูกต้อง</p>' : '') +
    '<div class="form-error" id="formError" hidden></div>';
  openModal({ title: title, body: body, buttons:[CANCEL_BTN, { label:'บันทึก', cls:'btn-dark', onClick: async function(btn) {
    var err = byId('formError'), amt = round2(Number(byId('btAmt').value) || 0), date = byId('btDate').value || todayStr();
    if (amt <= 0) { err.textContent = 'กรุณาระบุจำนวนเงิน'; err.hidden = false; return; }
    var dr, cr;
    if (kind === 'xfer') { dr = byId('btTo').value; cr = byId('btFrom').value; if (dr === cr) { err.textContent = 'เลือกบัญชีต้นทางและปลายทางต่างกัน'; err.hidden = false; return; } }
    else { var bk = byId('btBank').value, ot = byId('btAcc').value; dr = kind === 'in' ? bk : ot; cr = kind === 'in' ? ot : bk; if (bk === ot) { err.textContent = 'บัญชีคู่ต้องไม่ใช่บัญชีเดียวกัน'; err.hidden = false; return; } }
    btn.disabled = true;
    var party = byId('btParty').value.trim() || title;
    await addRec('documents', { type:'journalEntry', typeLabel: DOC_TYPES.journalEntry.label, group:'other', party: party, date: date, docNo: nextDocNo('journalEntry', date),
      items: [{ account: dr + ' ' + acctName(dr), debit: amt, credit: 0 }, { account: cr + ' ' + acctName(cr), debit: 0, credit: amt }], total: amt,
      extra: { bankTx: kind, ref: byId('btRef').value.trim(), note: byId('btRef').value.trim() ? 'อ้างอิง ' + byId('btRef').value.trim() : '' }, status:'done', createdAt: Date.now() });
    closeModal(); showToast('บันทึกรายการแล้ว');
  } }] });
}
