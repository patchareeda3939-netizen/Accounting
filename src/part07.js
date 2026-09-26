
/* ================= Import Data (settings:import) ================= */
var IMP_ICONS = {
  bank: '<path d="M8 24h32M10 24l14-10 14 10M12 24v14M20 24v14M28 24v14M36 24v14M8 40h32"/>',
  customers: '<circle cx="18" cy="16" r="5"/><path d="M8 38c0-7 5-12 10-12s10 5 10 12"/><circle cx="32" cy="18" r="4"/><path d="M30 26c5 0 10 4 10 11"/>',
  vendors: '<rect x="10" y="12" width="28" height="26" rx="2"/><path d="M8 12h32M18 30c0-4 3-6 6-6s6 2 6 6M24 20a3 3 0 1 0 0 .1"/>',
  coa: '<path d="M14 8h14l8 8v24H14z"/><path d="M28 8v8h8M18 22h14M18 27h14M18 32h10"/>',
  products: '<path d="M10 10l6 22h18M16 32a3 3 0 1 0 0 .1"/><rect x="22" y="14" width="14" height="11" rx="1" transform="rotate(-12 29 19)"/>',
  invoices: '<path d="M14 8h14l8 8v24H14z"/><rect x="18" y="20" width="14" height="14"/><path d="M18 25h14M18 30h14M24 20v14"/>',
  creditMemos: '<path d="M14 8h14l8 8v24H14z"/><rect x="18" y="13" width="5" height="5"/><path d="M18 24h14M18 29h14M18 34h10M25 24v10"/>',
  salesReceipts: '<path d="M12 8h20v32l-3-2-3 2-3-2-3 2-3-2-3 2-2-2z"/><path d="M16 16h12M16 22h12M16 28h8"/><path d="M34 12h4v26"/>',
  bills: '<rect x="12" y="8" width="24" height="32" rx="2"/><path d="M17 15h14M17 21h14M17 27h14M17 33h10M20 12v26"/>'
};
var IMP_KINDS = [
  { key:'bank', label:'Bank Data', th:'ข้อมูลธนาคาร' },
  { key:'customers', label:'ลูกค้า', th:'ลูกค้า' },
  { key:'vendors', label:'Vendors', th:'ผู้ขาย / ซัพพลายเออร์' },
  { key:'coa', label:'Chart of Accounts', th:'ผังบัญชี' },
  { key:'products', label:'Products and Services', th:'ผลิตภัณฑ์และบริการ' },
  { key:'invoices', label:'Invoices', th:'ใบแจ้งหนี้', doc:'invoice' },
  { key:'creditMemos', label:'Credit Memos', th:'ใบลดหนี้', doc:'creditNote' },
  { key:'salesReceipts', label:'Sales Receipts', th:'ใบเสร็จรับเงิน', doc:'receipt' },
  { key:'bills', label:'Bills', th:'บิลซื้อ', doc:'bill' }
];
var DOC_IMP_FIELDS = [
  { key:'docNo', label:'เลขที่เอกสาร', syn:['เลขที่','no','number','invoice no','doc no','ref no','bill no','receipt no','memo no','credit memo no','sales receipt no','เลขที่บิล','เลขที่ใบแจ้งหนี้','เลขที่ใบเสร็จ'] },
  { key:'date', label:'วันที่', required:true, syn:['date','วันที่เอกสาร','invoice date','txn date'] },
  { key:'party', label:'ชื่อลูกค้า/ผู้ขาย', required:true, syn:['ลูกค้า','ผู้ขาย','customer','vendor','supplier','name','ชื่อ'] },
  { key:'dueDate', label:'วันครบกำหนด', syn:['due date','due','ครบกำหนด'] },
  { key:'item', label:'รายการ/คำอธิบาย', syn:['description','item','product/service','สินค้า','รายละเอียด','memo'] },
  { key:'qty', label:'จำนวน', syn:['qty','quantity'] },
  { key:'price', label:'ราคา/หน่วย', syn:['rate','price','unit price','ราคา'] },
  { key:'amount', label:'จำนวนเงิน (ก่อน VAT)', syn:['amount','total','ยอดเงิน','มูลค่า'] },
  { key:'vatRate', label:'อัตรา VAT (%)', syn:['vat','tax','vat rate','ภาษี','ภาษีมูลค่าเพิ่ม'] },
  { key:'account', label:'รหัสบัญชี', syn:['account','บัญชี','category','หมวดหมู่'] },
  { key:'note', label:'หมายเหตุ', syn:['note','memo','message'] }
];
var IMP_FIELDS = {
  bank: [
    { key:'date', label:'วันที่', required:true, syn:['date','วันที่ทำรายการ','transaction date'] },
    { key:'desc', label:'คำอธิบาย', syn:['description','รายละเอียด','memo','รายการ','payee'] },
    { key:'amount', label:'จำนวนเงิน (+เข้า / −ออก)', syn:['amount','ยอดเงิน','จำนวน'] },
    { key:'deposit', label:'ฝาก / เงินเข้า', syn:['deposit','credit','เงินเข้า','ฝาก'] },
    { key:'withdraw', label:'ถอน / เงินออก', syn:['withdrawal','debit','เงินออก','ถอน'] },
    { key:'ref', label:'เลขอ้างอิง', syn:['ref','reference','เลขที่อ้างอิง','check no'] }
  ],
  customers: CONTACT_FIELDS.filter(function(f) { return f.key !== 'kind'; }).map(function(f) { return { key:f.key, label:f.label, required:f.required, syn:{ name:['customer','ชื่อลูกค้า','display name','company'], taxId:['tax id','เลขผู้เสียภาษี','เลขประจำตัวผู้เสียภาษี'], branch:['branch'], phone:['phone','เบอร์โทร','mobile'], email:['email','e-mail'], address:['address','billing address'], entity:['entity','ประเภท'] }[f.key] || [] }; }),
  products: PRODUCT_FIELDS.map(function(f) { return { key:f.key, label:f.label, required:f.required, syn:{ name:['product/service name','product','service','ชื่อสินค้า','item name'], sku:['sku','รหัส','code'], kind:['type','ประเภท'], unit:['unit','หน่วย'], price:['sales price','price','rate','ราคาขาย'], cost:['purchase cost','cost','ต้นทุน'], openingQty:['qty on hand','quantity','คงเหลือ','ยอดยกมา'], reorderPoint:['reorder point'] }[f.key] || [] }; })
};
IMP_FIELDS.vendors = IMP_FIELDS.customers.map(function(f) { return f.key === 'name' ? Object.assign({}, f, { syn:['vendor','supplier','ผู้ขาย','ชื่อผู้ขาย','display name','company'] }) : f; });
['invoices','creditMemos','salesReceipts','bills'].forEach(function(k) { IMP_FIELDS[k] = DOC_IMP_FIELDS; });

function importShell() {
  return '<div class="coa-bar"><div><h1 class="page-title" style="margin:0">Import Data</h1><p class="imp-sub">นำข้อมูลที่มีอยู่เข้าสู่ PSMacc</p></div><div class="coa-actions"><button type="button" class="btn btn-outline" onclick="openRestore()">กู้คืนจากไฟล์สำรอง (.json)</button></div></div>' +
    '<div class="imp-grid">' + IMP_KINDS.map(function(k) {
      return '<button type="button" class="imp-tile" data-imp="' + k.key + '"><span class="imp-pin"><svg viewBox="0 0 48 48" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IMP_ICONS[k.key] + '</svg></span><span class="imp-label">' + esc(k.label) + '</span></button>';
    }).join('') + '</div>';
}
function bindImportPage() {
  document.querySelectorAll('[data-imp]').forEach(function(b) { b.onclick = function() { openImportWizard(b.dataset.imp); }; });
}

var impState = null;
function normH(s) { return String(s || '').toLowerCase().replace(/[\s_\-*:()]/g, ''); }
function autoMap(headers, fields) {
  var map = {};
  fields.forEach(function(f) {
    var cands = [f.label, f.key].concat(f.syn || []).map(normH);
    var i = headers.findIndex(function(h) { return cands.indexOf(normH(h)) >= 0; });
    if (i < 0) i = headers.findIndex(function(h) { var n = normH(h); return n && cands.some(function(c) { return c.length > 2 && (n.indexOf(c) >= 0 || c.indexOf(n) >= 0); }); });
    if (i >= 0 && Object.keys(map).map(function(k) { return map[k]; }).indexOf(i) < 0) map[f.key] = i;
  });
  return map;
}
function impTemplateCsv(kind) {
  var f = IMP_FIELDS[kind];
  var ex = {
    bank: ['2026-09-01,รับโอนจากลูกค้า A,5350,,,TR001', '2026-09-02,ค่าไฟฟ้า,-1200,,,TR002'],
    customers: ['บริษัท ตัวอย่าง จำกัด,company,0105561234567,สำนักงานใหญ่,021234567,a@example.com,กรุงเทพฯ'],
    products: ['บริการที่ปรึกษา,SV-01,service,ชั่วโมง,1500,0,0,0']
  }[kind] || ['INV-0001,2026-09-01,บริษัท ตัวอย่าง จำกัด,2026-09-30,ค่าบริการ,1,1000,,7,4120,'];
  if (kind === 'vendors') ex = ['ร้าน ตัวอย่าง,company,0105561234567,สำนักงานใหญ่,021234567,s@example.com,นนทบุรี'];
  return '﻿' + f.map(function(x) { return x.label; }).join(',') + '\n' + ex.join('\n') + '\n';
}
async function downloadTemplate(kind) {
  var name = 'template-' + kind + '.csv', data = impTemplateCsv(kind), dl = await getDownloads();
  if (dl) { try { await dl.save({ filename: name, data: data }); } catch (e) {} return; }
  var u = URL.createObjectURL(new Blob([data], { type:'text/csv' })), a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(function() { URL.revokeObjectURL(u); }, 4000);
}

function openImportWizard(kind) {
  if (kind === 'coa') { go('accounting', 'coa'); return openCoaImport(); }
  var meta = IMP_KINDS.find(function(k) { return k.key === kind; });
  impState = { kind: kind, headers: [], rows: [], map: {} };
  var accOpts = function(base) { return STORE.accounts.filter(function(a) { return subtypeBase(accSubtype(a)) === base; }).map(function(a) { return '<option value="' + esc(a.code) + '">' + esc(a.code + ' ' + a.name) + '</option>'; }).join(''); };
  var extra = '';
  if (kind === 'bank') extra = '<div class="grid-2"><div class="field"><label for="impBankAcc">บัญชีธนาคาร</label><select id="impBankAcc">' + (bankAccounts().map(function(a) { return '<option value="' + esc(a.code) + '">' + esc(a.code + ' ' + a.name) + '</option>'; }).join('') || '<option value="1120">1120 เงินฝากธนาคาร</option>') + '</select></div><div></div>' +
    '<div class="field"><label for="impInAcc">บัญชีรายได้สำหรับเงินเข้า</label><select id="impInAcc">' + (accOpts('income') || '<option value="4110">4110 รายได้จากการขาย</option>') + '</select></div>' +
    '<div class="field"><label for="impOutAcc">บัญชีค่าใช้จ่ายสำหรับเงินออก</label><select id="impOutAcc">' + (accOpts('expense') || '<option value="5290">5290 ค่าใช้จ่ายเบ็ดเตล็ด</option>') + '</select></div></div>';
  if (meta.doc) extra = '<div class="grid-2"><div class="field"><label for="impVatMode">ราคาในไฟล์</label><select id="impVatMode"><option value="exclusive">ยังไม่รวม VAT</option><option value="inclusive">รวม VAT แล้ว</option></select></div>' +
    '<div class="field"><label for="impDefAcc">บัญชีเริ่มต้น (ถ้าไฟล์ไม่ระบุ)</label><select id="impDefAcc"><option value="">— ค่าเริ่มต้นของระบบ —</option>' + accOpts(DOC_TYPES[meta.doc].group === 'customer' ? 'income' : 'expense') + '</select></div></div>' +
    '<p class="small muted" style="margin:0">แถวที่มีเลขที่เอกสารเดียวกันจะรวมเป็นเอกสารเดียวหลายรายการ ถ้าไม่ระบุเลขที่ ระบบจะออกเลขให้อัตโนมัติ</p>';
  var body = '<div class="imp-steps"><span class="on">1 อัปโหลด</span><span>2 จับคู่คอลัมน์</span><span>3 ตรวจสอบและนำเข้า</span></div>' +
    '<div class="field"><label for="impWFile">ไฟล์ CSV หรือ Excel (.xlsx)</label><input id="impWFile" type="file" accept=".csv,.txt,.xlsx,.xls"></div>' +
    '<div class="small"><button type="button" class="linkish" id="impTpl">ดาวน์โหลดไฟล์ตัวอย่าง (CSV)</button></div>' + extra +
    '<div id="impMap"></div><div id="impPrev"></div><div class="form-error" id="formError" hidden></div>';
  openModal({ title:'นำเข้า ' + meta.th, body: body, focus:false, wide:true, buttons:[CANCEL_BTN, { label:'นำเข้า', cls:'btn-dark', onClick: runImportWizard }], onMount: function() {
    byId('impTpl').onclick = function() { downloadTemplate(kind); };
    byId('impWFile').addEventListener('change', async function(e) {
      var f = e.target.files[0]; if (!f) return;
      var err = byId('formError'); err.hidden = true;
      try {
        var rows;
        if (/\.xlsx?$/i.test(f.name)) { await loadXlsxLib(); var wb = XLSX.read(await f.arrayBuffer(), { type:'array', cellDates:true }); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header:1, defval:'', raw:false, dateNF:'yyyy-mm-dd' }); }
        else rows = parseCsv((await f.text()).replace(/^﻿/, ''));
        rows = rows.filter(function(r) { return r.some(function(c) { return String(c).trim() !== ''; }); });
        if (rows.length < 2) throw new Error('ไม่พบข้อมูลในไฟล์ (ต้องมีแถวหัวคอลัมน์และข้อมูลอย่างน้อย 1 แถว)');
        impState.headers = rows[0].map(function(h) { return String(h).trim(); });
        impState.rows = rows.slice(1);
        impState.map = autoMap(impState.headers, IMP_FIELDS[kind]);
        renderImpMap(); renderImpPrev();
        document.querySelectorAll('.imp-steps span').forEach(function(s, i) { s.classList.toggle('on', i <= 2); });
      } catch (ex) { err.textContent = ex.message || 'อ่านไฟล์ไม่ได้'; err.hidden = false; }
    });
  } });
}
function renderImpMap() {
  var fields = IMP_FIELDS[impState.kind], h = impState.headers;
  byId('impMap').innerHTML = '<h3 class="imp-h">จับคู่คอลัมน์</h3><div class="imp-map">' + fields.map(function(f) {
    return '<label>' + esc(f.label) + (f.required ? ' <b class="neg-text">*</b>' : '') + '</label><select data-impmap="' + f.key + '"><option value="">— ไม่ใช้ —</option>' + h.map(function(x, i) { return '<option value="' + i + '"' + (impState.map[f.key] === i ? ' selected' : '') + '>' + esc(x || ('คอลัมน์ ' + (i + 1))) + '</option>'; }).join('') + '</select>';
  }).join('') + '</div>';
  byId('impMap').querySelectorAll('[data-impmap]').forEach(function(s) { s.onchange = function() { if (s.value === '') delete impState.map[s.dataset.impmap]; else impState.map[s.dataset.impmap] = Number(s.value); renderImpPrev(); }; });
}
function impVal(r, key) { var i = impState.map[key]; return i == null ? '' : String(r[i] == null ? '' : r[i]).trim(); }
function impNum(v) { v = String(v || '').replace(/[,\s฿]/g, ''); if (/^\(.*\)$/.test(v)) v = '-' + v.slice(1, -1); var n = Number(v); return isFinite(n) ? n : NaN; }
function impDate(v) {
  v = String(v || '').trim(); if (!v) return '';
  var m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) { var y = Number(m[1]); if (y > 2400) y -= 543; return y + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0'); }
  m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) { var yy = Number(m[3]); if (yy < 100) yy += 2000; if (yy > 2400) yy -= 543; return yy + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); }
  var d = new Date(v); return isNaN(d) ? '' : d.toISOString().slice(0, 10);
}
// build records to import; each {ok, err, label, rec}
function buildImport() {
  var k = impState.kind, meta = IMP_KINDS.find(function(x) { return x.key === k; }), out = [];
  if (k === 'customers' || k === 'vendors' || k === 'products') {
    var coll = k === 'products' ? 'products' : 'contacts', names = {};
    STORE[coll].forEach(function(c) { names[String(c.name).toLowerCase()] = 1; });
    impState.rows.forEach(function(r) {
      var rec = {}; IMP_FIELDS[k].forEach(function(f) { var v = impVal(r, f.key); if (v !== '') rec[f.key] = v; });
      var err = !rec.name ? 'ไม่มีชื่อ' : names[rec.name.toLowerCase()] ? 'ชื่อซ้ำกับที่มีอยู่ (ข้าม)' : '';
      if (coll === 'contacts') {
        rec.kind = k === 'customers' ? 'customer' : 'supplier';
        rec.entity = /person|บุคคล/i.test(rec.entity || '') ? 'person' : 'company';
        if (rec.taxId) { rec.taxId = rec.taxId.replace(/[\s-]/g, ''); if (!err && !/^\d{13}$/.test(rec.taxId)) err = 'เลขผู้เสียภาษีไม่ใช่ 13 หลัก'; }
      } else {
        rec.kind = /service|บริการ/i.test(rec.kind || '') ? 'service' : 'goods';
        ['price','cost','openingQty','reorderPoint'].forEach(function(n) { if (rec[n] != null) rec[n] = impNum(rec[n]) || 0; });
      }
      if (rec.name && !err) names[rec.name.toLowerCase()] = 1;
      out.push({ ok: !err, err: err, label: rec.name || '-', sub: rec.taxId || rec.sku || rec.phone || '', coll: coll, rec: rec });
    });
    return out;
  }
  if (k === 'bank') {
    var bank = (byId('impBankAcc') || {}).value || '1120', inA = (byId('impInAcc') || {}).value || '4110', outA = (byId('impOutAcc') || {}).value || '5290';
    impState.rows.forEach(function(r) {
      var date = impDate(impVal(r, 'date')), amt = impNum(impVal(r, 'amount'));
      if (impState.map.amount == null || isNaN(amt) || impVal(r, 'amount') === '') amt = (impNum(impVal(r, 'deposit')) || 0) - (impNum(impVal(r, 'withdraw')) || 0);
      amt = round2(amt);
      var err = !date ? 'วันที่ไม่ถูกต้อง' : !amt ? 'ไม่มีจำนวนเงิน' : '', desc = impVal(r, 'desc') || 'รายการธนาคาร';
      var inc = amt > 0, type = inc ? 'receipt' : 'expense', a = Math.abs(amt);
      out.push({ ok: !err, err: err, label: desc, sub: (inc ? 'เงินเข้า ' : 'เงินออก ') + fmtMoney(a), date: date, coll:'documents',
        rec: { type: type, typeLabel: DOC_TYPES[type].label, group: inc ? 'customer' : 'supplier', party: desc, date: date, items: null, vatMode:'none', whtRate:0, subtotal:a, vat:0, total:a, wht:0, net:a,
          extra: { method:'โอนเงิน', bankAcc: bank, account: inc ? inA : outA, ref: impVal(r, 'ref'), note:'นำเข้าจากข้อมูลธนาคาร', importedBank: true }, status:'done' } });
    });
    // bank account override for posting
    return out;
  }
  // documents
  var type = meta.doc, def = DOC_TYPES[type], mode = (byId('impVatMode') || {}).value || 'exclusive', defAcc = (byId('impDefAcc') || {}).value || '';
  var groups = [], byNo = {};
  impState.rows.forEach(function(r, i) {
    var no = impVal(r, 'docNo'), key = no || ('#' + i);
    if (!byNo[key]) { byNo[key] = { no: no, rows: [] }; groups.push(byNo[key]); }
    byNo[key].rows.push(r);
  });
  var existing = {}; STORE.documents.forEach(function(d) { if (d.type === type && d.docNo) existing[d.docNo] = 1; });
  groups.forEach(function(g) {
    var r0 = g.rows[0], date = impDate(impVal(r0, 'date')), party = impVal(r0, 'party'), rate = 0, acc = '';
    var items = g.rows.map(function(r) {
      var q = impNum(impVal(r, 'qty')), p = impNum(impVal(r, 'price')), amt = impNum(impVal(r, 'amount'));
      if (isNaN(q) || !impVal(r, 'qty')) q = 1;
      if (isNaN(p) || impVal(r, 'price') === '') p = isNaN(amt) ? 0 : amt / (q || 1);
      var vr = impVal(r, 'vatRate'); if (vr !== '') { var n = impNum(vr); rate = Math.max(rate, isNaN(n) ? 0 : (n < 1 && n > 0 ? n * 100 : n)); }
      if (!acc) acc = impVal(r, 'account').split(' ')[0];
      return { name: impVal(r, 'item') || def.label, qty: q, price: round2(p) };
    });
    if (impState.map.vatRate == null) rate = 7;
    var base = round2(items.reduce(function(s, x) { return s + x.qty * x.price; }, 0)), vm = rate > 0 ? mode : 'none';
    var sub = base, vat = 0;
    if (vm === 'exclusive') vat = round2(base * rate / 100); else if (vm === 'inclusive') { sub = round2(base / (1 + rate / 100)); vat = round2(base - sub); }
    acc = acc || defAcc;
    var a = acc && STORE.accounts.find(function(x) { return x.code === acc || x.name === acc; });
    var err = !date ? 'วันที่ไม่ถูกต้อง' : !party ? 'ไม่มีชื่อ' + def.partyLabel : !base ? 'ยอดเงินเป็นศูนย์' : (g.no && existing[g.no]) ? 'เลขที่ซ้ำกับที่มีอยู่ (ข้าม)' : '';
    var extra = { note: impVal(r0, 'note'), account: a ? a.code : '' };
    if (a) { if (def.group === 'customer') extra.incomeCat = a.name; else extra.expCategory = a.name; }
    if (impVal(r0, 'dueDate')) extra.dueDate = impDate(impVal(r0, 'dueDate'));
    if (type === 'receipt') extra.method = 'โอนเงิน';
    var tot = round2(sub + vat);
    out.push({ ok: !err, err: err, label: (g.no || '(ออกเลขอัตโนมัติ)') + ' · ' + (party || '-'), sub: fmtMoney(tot), date: date, coll:'documents', autoNo: !g.no,
      rec: { type: type, typeLabel: def.label, group: def.group, party: party, date: date, docNo: g.no, items: def.template === 'itemized' ? items : null, vatMode: vm, whtRate: 0, subtotal: sub, vat: vat, total: tot, wht: 0, net: tot, extra: extra, status: def.status ? 'unpaid' : 'done' } });
  });
  return out;
}
function renderImpPrev() {
  var el = byId('impPrev'); if (!el) return;
  var fields = IMP_FIELDS[impState.kind], miss = fields.filter(function(f) { return f.required && impState.map[f.key] == null; });
  if (impState.kind === 'bank' && impState.map.amount == null && impState.map.deposit == null && impState.map.withdraw == null) miss.push({ label:'จำนวนเงิน' });
  if (miss.length) { el.innerHTML = '<div class="banner bad">ยังไม่ได้จับคู่: ' + miss.map(function(m) { return esc(m.label); }).join(', ') + '</div>'; impState.built = []; return; }
  var list = impState.built = buildImport(), ok = list.filter(function(x) { return x.ok; }).length;
  el.innerHTML = '<h3 class="imp-h">ตรวจสอบก่อนนำเข้า</h3><div class="banner ' + (ok === list.length ? 'ok' : 'bad') + '">พร้อมนำเข้า ' + ok + ' รายการ' + (list.length - ok ? ' · ข้าม ' + (list.length - ok) + ' รายการ' : '') + '</div>' +
    '<div class="items-wrap" style="max-height:260px;overflow:auto"><table class="data-table"><thead><tr><th></th><th>รายการ</th><th>วันที่</th><th class="r">รายละเอียด</th></tr></thead><tbody>' +
    list.slice(0, 200).map(function(x) { return '<tr><td>' + (x.ok ? '✓' : '<span class="neg-text">✕</span>') + '</td><td>' + esc(x.label) + (x.err ? '<div class="small neg-text">' + esc(x.err) + '</div>' : '') + '</td><td class="num">' + (x.date ? fmtDateNum(x.date) : '') + '</td><td class="r">' + esc(x.sub || '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
}
async function runImportWizard(btn) {
  var err = byId('formError');
  if (impState && impState.rows.length) renderImpPrev();
  var todo = ((impState && impState.built) || []).filter(function(x) { return x.ok; });
  if (!todo.length) { err.textContent = impState && impState.rows.length ? 'ไม่มีรายการที่นำเข้าได้' : 'เลือกไฟล์ก่อน'; err.hidden = false; return; }
  btn.disabled = true; var usedNo = {};
  try {
    for (var i = 0; i < todo.length; i++) {
      btn.textContent = 'กำลังนำเข้า ' + (i + 1) + '/' + todo.length;
      var x = todo[i], rec = Object.assign({}, x.rec, { createdAt: Date.now() + i });
      if (x.coll === 'documents' && !rec.docNo) {
        var no = nextDocNo(rec.type, rec.date);
        while (usedNo[no]) no = no.replace(/(\d+)$/, function(m) { return String(Number(m) + 1).padStart(m.length, '0'); });
        rec.docNo = no;
      }
      if (rec.docNo) usedNo[rec.docNo] = 1;
      await addRec(x.coll, rec);
    }
    closeModal(); showToast('นำเข้าแล้ว ' + todo.length + ' รายการ');
  } catch (e) { err.textContent = 'นำเข้าไม่สำเร็จ: ' + (e.message || e); err.hidden = false; btn.disabled = false; btn.textContent = 'นำเข้า'; }
}

/* ================= Export Data (QuickBooks-style) ================= */
var EXP_REPORTS = [['gl','บัญชีแยกประเภททั่วไป'],['pl','กำไรขาดทุน'],['bs','งบดุล'],['tb','งบทดลอง'],['journal','สมุดรายวันทั่วไป']];
var EXP_LISTS = [['docs','รายการเอกสาร/ธุรกรรม'],['customers','ลูกค้า'],['vendors','ผู้ขาย'],['products','ผลิตภัณฑ์และบริการ'],['coa','ผังบัญชี'],['employees','พนักงาน']];
var expState = { tab:'rep', period:'all', from:'', to:'', on:{ gl:1, pl:1, bs:1, tb:1, docs:1, customers:1, vendors:1, products:1, coa:1, employees:1 } };
function expListSheet(k) {
  var cust = function(c) { return c.kind === 'customer' || c.kind === 'both'; }, sup = function(c) { return c.kind === 'supplier' || c.kind === 'both'; };
  var r = expRange();
  var cRow = function(c) { return [c.name, c.entity === 'person' ? 'บุคคลธรรมดา' : 'นิติบุคคล', c.taxId, c.branch, c.phone, c.email, c.address]; }, cHead = ['ชื่อ','สถานะผู้เสียภาษี','เลขผู้เสียภาษี','สาขา','โทรศัพท์','อีเมล','ที่อยู่'];
  return {
    docs: ['รายการ', ['วันที่','ชนิด','เลขที่','คู่ค้า','บัญชี','ก่อนภาษี','VAT','ยอดรวม','หัก ณ ที่จ่าย','คงค้าง','สถานะ'], STORE.documents.filter(function(d) { return inRange(d.date || '', r); }).slice().sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); }).map(function(d) { var ex = d.extra || {}; return [d.date, d.typeLabel, d.docNo, d.party, ex.account ? ex.account + ' ' + acctName(ex.account) : (ex.incomeCat || ex.expCategory || ''), d.subtotal, d.vat, d.total, d.wht, DOC_TYPES[d.type] && DOC_TYPES[d.type].status ? docBal(d) : '', strip2(statusText(d))]; })],
    customers: ['ลูกค้า', cHead, STORE.contacts.filter(cust).map(cRow)],
    vendors: ['ผู้ขาย', cHead, STORE.contacts.filter(sup).map(cRow)],
    products: ['ผลิตภัณฑ์และบริการ', ['ชื่อ','SKU','ประเภท','หน่วย','ราคาขาย','ต้นทุน','คงเหลือ'], STORE.products.map(function(p) { return [p.name, p.sku, p.kind === 'service' ? 'บริการ' : 'สินค้า', p.unit, p.price, p.cost, p.kind === 'service' ? '' : productStock(p)]; })],
    coa: ['ผังบัญชี', ['รหัส','ชื่อ','ประเภทบัญชี','ประเภทรายละเอียด','ยอดคงเหลือ'], STORE.accounts.map(function(a) { var b = balancesAt(r[1])[a.code] || { dr:0, cr:0 }, base = subtypeBase(accSubtype(a)); return [a.code, a.name, subtypeLabel(accSubtype(a)), a.detailType, round2(base === 'asset' || base === 'expense' ? b.dr - b.cr : b.cr - b.dr)]; })],
    employees: ['พนักงาน', ['ชื่อ','ตำแหน่ง','โทรศัพท์','อีเมล','เริ่มงาน'], STORE.employees.map(function(e) { return [e.name, e.position, e.phone, e.email, e.startDate]; })]
  }[k];
}
function expRange() { return expState.period === 'custom' ? [expState.from || '0000-01-01', expState.to || '9999-12-31'] : periodRange(expState.period); }
function exportAllData() { openExportData(); }
function openExportData() {
  var opts = [['all','วันที่ทั้งหมด'],['month','เดือนนี้'],['quarter','ไตรมาสนี้'],['year','ปีนี้'],['last12','12 เดือนล่าสุด'],['custom','กำหนดวันที่เอง']];
  function rowsHTML(list) { return list.map(function(x) { return '<label class="exp-row"><span>' + esc(x[1]) + '</span><input type="checkbox" class="exp-sw" data-exp="' + x[0] + '"' + (expState.on[x[0]] ? ' checked' : '') + '></label>'; }).join(''); }
  var body = '<div class="exp-head"><h3>คุณต้องการส่งออกรายงานและรายการใด</h3><p class="small muted">เพิ่มหรือลบรายการ และตั้งค่าช่วงวันที่ของคุณเพื่อรับสิ่งที่คุณต้องการ</p></div>' +
    '<div class="exp-tabs" role="tablist"><button type="button" role="tab" data-exptab="rep">รายงาน</button><button type="button" role="tab" data-exptab="list">รายการ</button></div>' +
    '<div class="exp-bar"><div class="field" style="margin:0"><label for="expPeriod">ช่วงวันที่ที่เลือกไว้ล่วงหน้า</label><select id="expPeriod">' + opts.map(function(o) { return '<option value="' + o[0] + '"' + (expState.period === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
    '<span id="expCustom"' + (expState.period === 'custom' ? '' : ' hidden') + ' class="exp-dates">จาก <input type="date" id="expFrom" value="' + expState.from + '"> ถึง <input type="date" id="expTo" value="' + expState.to + '"></span>' +
    '<span class="small exp-more">หากต้องการดูรายงานเพิ่มเติม <button type="button" class="linkish" id="expGoRep">ไปที่หน้ารายงาน</button></span></div>' +
    '<div id="expPaneRep">' + rowsHTML(EXP_REPORTS) + '</div><div id="expPaneList" hidden>' + rowsHTML(EXP_LISTS) + '</div><div class="form-error" id="formError" hidden></div>';
  openModal({ title:'ส่งออกข้อมูล', body: body, focus:false, buttons:[CANCEL_BTN, { label:'ส่งออกไปยัง Excel', cls:'btn-dark', onClick: runExportData }], onMount: function() {
    function tab(t) { expState.tab = t; document.querySelectorAll('[data-exptab]').forEach(function(b) { b.classList.toggle('on', b.dataset.exptab === t); b.setAttribute('aria-selected', b.dataset.exptab === t); }); byId('expPaneRep').hidden = t !== 'rep'; byId('expPaneList').hidden = t !== 'list'; }
    document.querySelectorAll('[data-exptab]').forEach(function(b) { b.onclick = function() { tab(b.dataset.exptab); }; }); tab(expState.tab);
    document.querySelectorAll('[data-exp]').forEach(function(c) { c.onchange = function() { expState.on[c.dataset.exp] = c.checked ? 1 : 0; }; });
    byId('expPeriod').onchange = function(e) { expState.period = e.target.value; if (expState.period === 'custom' && !expState.from) { expState.from = todayStr().slice(0, 8) + '01'; expState.to = todayStr(); byId('expFrom').value = expState.from; byId('expTo').value = expState.to; } byId('expCustom').hidden = expState.period !== 'custom'; };
    byId('expFrom').onchange = function(e) { expState.from = e.target.value; }; byId('expTo').onchange = function(e) { expState.to = e.target.value; };
    byId('expGoRep').onclick = function() { closeModal(); go('reports', 'standard'); };
  } });
}
function expReportSheet(id) {
  var saveP = pageState.repPeriod, saveF = pageState.pFrom, saveT = pageState.pTo;
  pageState.repPeriod = 'custom'; var r = expRange(); pageState.pFrom = r[0]; pageState.pTo = r[1];
  try {
    var rep = RG[id] ? RG[id]() : null; if (!rep) return null;
    var end = r[1] === '9999-12-31' ? todayStr() : r[1];
    var sub = rep.asOf || id === 'bs' || id === 'tb' ? 'ณ วันที่ ' + fmtDateNum(end) : (r[0] === '0000-01-01' ? 'ทุกช่วงเวลา' : fmtDateNum(r[0]) + ' – ' + fmtDateNum(end));
    var head = [[companyName()], [REPORT_NAME[id] || id], [sub], [], rep.cols.map(function(c) { return c[0]; })];
    var rows = rep.rows.map(function(x) { return x.g ? [x.g] : (x.t || x.c || x).map(function(v) { var s = strip2(v), t = s.replace(/[฿,\s]/g, '').replace(/^\((.*)\)$/, '-$1'), n = Number(t); return t !== '' && /^-?\d+(\.\d+)?$/.test(t) && isFinite(n) ? n : s; }); });
    return [(REPORT_NAME[id] || id).slice(0, 31), head.concat(rows)];
  } finally { pageState.repPeriod = saveP; pageState.pFrom = saveF; pageState.pTo = saveT; }
}
async function runExportData(btn) {
  var err = byId('formError'), sheets = [];
  EXP_REPORTS.forEach(function(x) { if (expState.on[x[0]]) { var s = expReportSheet(x[0]); if (s) sheets.push(s); } });
  EXP_LISTS.forEach(function(x) { if (expState.on[x[0]]) { var s = expListSheet(x[0]); sheets.push([s[0], [s[1]].concat(s[2])]); } });
  if (!sheets.length) { err.textContent = 'เลือกอย่างน้อย 1 รายการ'; err.hidden = false; return; }
  btn.disabled = true; btn.textContent = 'กำลังส่งออก…';
  try {
    await loadXlsxLib();
    var wb = XLSX.utils.book_new(), used = {};
    sheets.forEach(function(s) { var n = s[0].replace(/[\\\/?*\[\]:]/g, ' '); while (used[n]) n = n.slice(0, 28) + '_' + Object.keys(used).length; used[n] = 1; var ws = XLSX.utils.aoa_to_sheet(s[1]); ws['!cols'] = [{ wch: 14 }, { wch: 34 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]; XLSX.utils.book_append_sheet(wb, ws, n); });
    var data = new Uint8Array(XLSX.write(wb, { bookType:'xlsx', type:'array' })), name = 'ส่งออก-' + companyName() + '-' + todayStr() + '.xlsx', dl = await getDownloads();
    if (dl) await dl.save({ filename: name, data: data });
    else { var u = URL.createObjectURL(new Blob([data], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })), a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(function() { URL.revokeObjectURL(u); }, 5000); }
    closeModal(); showToast('ส่งออก ' + sheets.length + ' แผ่นงานแล้ว');
  } catch (e) { btn.disabled = false; btn.textContent = 'ส่งออกไปยัง Excel'; if (e && e.code === 'declined') return; err.textContent = 'ส่งออกไม่สำเร็จ: ' + (e.message || e); err.hidden = false; }
}
