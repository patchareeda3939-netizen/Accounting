
/* ================= Batch transactions (accounting:batchTx) ================= */
var BATCH_TYPES = [['invoice','ใบแจ้งหนี้'],['receipt','ใบเสร็จรับเงิน'],['creditNote','ใบลดหนี้'],['expense','ค่าใช้จ่าย'],['bill','บิลซื้อ'],['checkPayment','เช็คจ่าย'],['vendorCredit','เครดิตจากผู้ขาย']];
var batch = { type:'invoice', rows:[], msg:'' };
function batchNewRow() { return { date: todayStr(), docNo:'', party:'', account:'', desc:'', amount:'', vat:'exclusive', wht:0, due:'', method:'โอนเงิน', bankAcc:'' }; }
function batchInit() { if (!batch.rows.length) for (var i = 0; i < 5; i++) batch.rows.push(batchNewRow()); }
function batchCols() {
  var t = batch.type, def = DOC_TYPES[t], c = [['date','วันที่'],['docNo','เลขที่'],['party', def.partyLabel],['account', def.group === 'customer' ? 'บัญชีรายได้' : 'บัญชีค่าใช้จ่าย'],['desc','คำอธิบาย'],['amount','จำนวนเงิน'],['vat','VAT']];
  if (def.wht) c.push(['wht','หัก ณ ที่จ่าย']);
  if (t === 'invoice' || t === 'bill') c.push(['due','ครบกำหนด']);
  if (t === 'receipt' || t === 'expense' || t === 'checkPayment') c.push(['bankAcc', t === 'receipt' ? 'รับเข้าบัญชี' : 'จ่ายจากบัญชี']);
  return c;
}
function batchCalc(r) {
  var base = Number(r.amount) || 0, sub = base, vat = 0, whtR = Number(r.wht) || 0;
  if (r.vat === 'exclusive') vat = base * VAT_RATE; else if (r.vat === 'inclusive') { sub = base / (1 + VAT_RATE); vat = base - sub; }
  sub = round2(sub); vat = round2(vat); var total = round2(sub + vat), wht = round2(sub * whtR / 100);
  return { subtotal: sub, vat: vat, total: total, wht: wht, net: round2(total - wht) };
}
function batchShell() {
  return '<div class="coa-bar"><div><h1 class="section-title" style="margin:0">บันทึกหลายรายการ</h1><p class="section-sub">บันทึกเอกสารประเภทเดียวกันหลายรายการพร้อมกันในตารางเดียว แล้วบันทึกครั้งเดียว</p></div>' +
    '<div class="coa-actions"><label class="date-chip">ประเภทธุรกรรม: <select id="batchType">' + BATCH_TYPES.map(function(t) { return '<option value="' + t[0] + '"' + (batch.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></label></div></div>';
}
function accOptsFor(group, cur) {
  var list = accountsFor(group);
  return '<option value="">— ค่าเริ่มต้น —</option>' + list.map(function(a) { return '<option value="' + esc(a.code) + '"' + (a.code === cur ? ' selected' : '') + '>' + esc(a.code + ' ' + a.name) + '</option>'; }).join('');
}
function batchData() {
  batchInit();
  var def = DOC_TYPES[batch.type], cols = batchCols(), cust = def.group === 'customer';
  var banks = bankAccList ? bankAccList() : [];
  var bankOpts = function(cur) { return '<option value="">เงินสด/ธนาคารหลัก</option>' + banks.map(function(a) { return '<option value="' + esc(a.code) + '"' + (a.code === cur ? ' selected' : '') + '>' + esc(a.code + ' ' + a.name) + '</option>'; }).join(''); };
  var sum = { subtotal:0, vat:0, total:0, wht:0, n:0 };
  var body = batch.rows.map(function(r, i) {
    var c = batchCalc(r); if (Number(r.amount)) { sum.subtotal += c.subtotal; sum.vat += c.vat; sum.total += c.total; sum.wht += c.wht; sum.n++; }
    var cell = function(k) {
      var a = ' data-bi="' + i + '" data-bk="' + k + '"';
      switch (k) {
        case 'date': return '<input type="date" value="' + esc(r.date) + '"' + a + '>';
        case 'due': return '<input type="date" value="' + esc(r.due) + '"' + a + '>';
        case 'docNo': return '<input value="' + esc(r.docNo) + '" placeholder="อัตโนมัติ"' + a + '>';
        case 'party': return '<input list="' + (cust ? 'dl_customers' : 'dl_suppliers') + '" value="' + esc(r.party) + '" placeholder="ชื่อ"' + a + '>';
        case 'account': return '<select' + a + '>' + accOptsFor(def.group, r.account) + '</select>';
        case 'desc': return '<input value="' + esc(r.desc) + '" placeholder="รายละเอียด"' + a + '>';
        case 'amount': return '<input type="number" step="0.01" min="0" class="r" value="' + esc(r.amount) + '" placeholder="0.00" style="width:96px"' + a + '>';
        case 'vat': return '<select' + a + '><option value="exclusive"' + (r.vat === 'exclusive' ? ' selected' : '') + '>แยก 7%</option><option value="inclusive"' + (r.vat === 'inclusive' ? ' selected' : '') + '>รวม 7%</option><option value="none"' + (r.vat === 'none' ? ' selected' : '') + '>ไม่มี</option></select>';
        case 'wht': return '<select' + a + '>' + [0,1,2,3,5].map(function(w) { return '<option value="' + w + '"' + (Number(r.wht) === w ? ' selected' : '') + '>' + (w ? w + '%' : '-') + '</option>'; }).join('') + '</select>';
        case 'bankAcc': return '<select' + a + '>' + bankOpts(r.bankAcc) + '</select>';
      }
    };
    return '<tr' + (r.err ? ' class="batch-bad"' : '') + '><td class="muted small">' + (i + 1) + '</td>' + cols.map(function(c) { return '<td>' + cell(c[0]) + '</td>'; }).join('') +
      '<td class="r num">' + (Number(r.amount) ? fmtMoney(c.net) : '') + (r.err ? '<div class="small neg-text">' + esc(r.err) + '</div>' : '') + '</td>' +
      '<td class="batch-act"><button type="button" class="icon-btn" data-bdup="' + i + '" title="ทำซ้ำแถว" aria-label="ทำซ้ำแถว">⧉</button><button type="button" class="icon-btn" data-bdel="' + i + '" title="ลบแถว" aria-label="ลบแถว">✕</button></td></tr>';
  }).join('');
  return (batch.msg ? '<div class="banner ok">' + batch.msg + '</div>' : '') +
    '<div class="items-wrap batch-wrap"><table class="data-table batch-table"><thead><tr><th>#</th>' + cols.map(function(c) { return '<th' + (c[0] === 'amount' ? ' class="r"' : '') + '>' + esc(c[1]) + '</th>'; }).join('') + '<th class="r">ยอดสุทธิ</th><th></th></tr></thead><tbody>' + body + '</tbody></table></div>' +
    '<div class="batch-foot"><div class="toolbar" style="margin:0"><button type="button" class="btn btn-outline" id="batchAdd">+ เพิ่มแถว</button><button type="button" class="btn btn-outline" id="batchAdd5">+ เพิ่ม 5 แถว</button><button type="button" class="btn btn-outline" id="batchClear">ล้างตาราง</button></div>' +
    '<div class="batch-sum"><span>' + sum.n + ' รายการ</span><span>ก่อนภาษี <b>' + fmtMoney(round2(sum.subtotal)) + '</b></span><span>VAT <b>' + fmtMoney(round2(sum.vat)) + '</b></span>' + (def.wht ? '<span>หัก ณ ที่จ่าย <b>' + fmtMoney(round2(sum.wht)) + '</b></span>' : '') + '<span>รวม <b>' + fmtMoney(round2(sum.total - sum.wht)) + '</b></span>' +
    '<button type="button" class="btn btn-dark" id="batchSave">บันทึกทั้งหมด</button></div></div>' +
    '<p class="small muted">แถวที่ไม่มีจำนวนเงินจะถูกข้าม · ไม่ระบุเลขที่ ระบบออกเลขให้อัตโนมัติ · บัญชี "ค่าเริ่มต้น" = ' + (cust ? '4110 รายได้จากการขาย' : '5290 ค่าใช้จ่ายเบ็ดเตล็ด') + '</p>';
}
function bindBatch() {
  var tSel = byId('batchType');
  if (tSel && !tSel._b) { tSel._b = 1; tSel.onchange = function() { batch.type = tSel.value; batch.msg = ''; batch.rows.forEach(function(r) { r.account = ''; r.err = ''; }); refreshPageData(); }; }
  var c = byId('pageData'); if (!c) return;
  c.querySelectorAll('[data-bi]').forEach(function(el) {
    el.addEventListener(el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input', function() {
      var r = batch.rows[Number(el.dataset.bi)]; r[el.dataset.bk] = el.value; r.err = '';
      if (el.dataset.bk === 'party' && !r.account) { var last = STORE.documents.find(function(d) { return d.type === batch.type && d.party === el.value && d.extra && d.extra.account; }); if (last) r.account = last.extra.account; }
      if (el.tagName === 'SELECT' || el.dataset.bk === 'amount' || el.type === 'date') { var f = document.activeElement && document.activeElement.dataset ? [document.activeElement.dataset.bi, document.activeElement.dataset.bk] : null; refreshPageData(); if (f && f[0] != null) { var n = c.querySelector('[data-bi="' + f[0] + '"][data-bk="' + f[1] + '"]'); if (n) { n.focus(); if (n.setSelectionRange && n.type !== 'number' && n.type !== 'date') try { n.setSelectionRange(n.value.length, n.value.length); } catch (e) {} } } }
    });
  });
  c.querySelectorAll('[data-bdel]').forEach(function(b) { b.onclick = function() { batch.rows.splice(Number(b.dataset.bdel), 1); if (!batch.rows.length) batch.rows.push(batchNewRow()); refreshPageData(); }; });
  c.querySelectorAll('[data-bdup]').forEach(function(b) { b.onclick = function() { var r = Object.assign({}, batch.rows[Number(b.dataset.bdup)], { docNo:'', err:'' }); batch.rows.splice(Number(b.dataset.bdup) + 1, 0, r); refreshPageData(); }; });
  var add = function(n) { var last = batch.rows[batch.rows.length - 1]; for (var i = 0; i < n; i++) batch.rows.push(Object.assign(batchNewRow(), { date: last ? last.date : todayStr() })); batch.msg = ''; refreshPageData(); };
  byId('batchAdd').onclick = function() { add(1); }; byId('batchAdd5').onclick = function() { add(5); };
  byId('batchClear').onclick = function() { batch.rows = []; batch.msg = ''; refreshPageData(); };
  byId('batchSave').onclick = saveBatch;
}
async function saveBatch() {
  var def = DOC_TYPES[batch.type], todo = [], bad = 0, usedNo = {};
  STORE.documents.forEach(function(d) { if (d.docNo) usedNo[d.docNo] = 1; });
  batch.rows.forEach(function(r) {
    r.err = '';
    if (!Number(r.amount)) return;
    if (!r.date) r.err = 'ไม่มีวันที่'; else if (!r.party.trim()) r.err = 'ไม่มี' + def.partyLabel; else if (Number(r.amount) < 0) r.err = 'จำนวนเงินติดลบ';
    else if (r.docNo && usedNo[r.docNo.trim()]) r.err = 'เลขที่ซ้ำ';
    if (r.err) bad++; else { todo.push(r); if (r.docNo) usedNo[r.docNo.trim()] = 1; }
  });
  if (bad || !todo.length) { batch.msg = ''; refreshPageData(); if (!todo.length && !bad) showToast('กรอกจำนวนเงินอย่างน้อย 1 แถว'); else showToast('มี ' + bad + ' แถวที่ต้องแก้ไข'); return; }
  var btn = byId('batchSave'); btn.disabled = true;
  var batchId = 'B' + Date.now();
  try {
    for (var i = 0; i < todo.length; i++) {
      btn.textContent = 'กำลังบันทึก ' + (i + 1) + '/' + todo.length;
      var r = todo[i], c = batchCalc(r), a = r.account && STORE.accounts.find(function(x) { return x.code === r.account; });
      var no = r.docNo.trim();
      if (!no) { no = nextDocNo(batch.type, r.date); while (usedNo[no]) no = no.replace(/(\d+)$/, function(m) { return String(Number(m) + 1).padStart(m.length, '0'); }); }
      usedNo[no] = 1;
      var extra = { account: a ? a.code : '', note: '', batchId: batchId };
      if (a) { if (def.group === 'customer') extra.incomeCat = a.name; else extra.expCategory = a.name; }
      if (r.due) extra.dueDate = r.due;
      if (batch.type === 'receipt' || batch.type === 'expense') { extra.method = r.bankAcc ? 'โอนเงิน' : 'เงินสด'; if (r.bankAcc) extra.bankAcc = r.bankAcc; }
      var desc = r.desc.trim() || def.label;
      await addRec('documents', { type: batch.type, typeLabel: def.label, group: def.group, party: r.party.trim(), date: r.date, docNo: no,
        items: def.template === 'itemized' ? [{ name: desc, qty: 1, price: Number(r.amount) }] : null, desc: desc,
        vatMode: r.vat, whtRate: Number(r.wht) || 0, subtotal: c.subtotal, vat: c.vat, total: c.total, wht: c.wht, net: c.net,
        extra: Object.assign(extra, { note: r.desc.trim() }), status: def.status ? 'unpaid' : 'done', createdAt: Date.now() + i });
    }
    batch.rows = []; batch.msg = 'บันทึก' + def.label + ' ' + todo.length + ' รายการแล้ว · เข้าสมุดรายวันและบัญชีแยกประเภทเรียบร้อย';
    showToast('บันทึกแล้ว ' + todo.length + ' รายการ'); refreshPageData();
  } catch (e) { btn.disabled = false; btn.textContent = 'บันทึกทั้งหมด'; showToast('บันทึกไม่สำเร็จ: ' + (e.message || e)); }
}
