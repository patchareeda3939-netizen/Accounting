/* ================= Custom form styles ================= */
var FORM_TYPES = [['default','ค่าเริ่มต้น'],['estimate','ใบเสนอราคา'],['salesOrder','ใบสั่งขาย'],['invoice','ใบแจ้งหนี้'],['receipt','ใบเสร็จรับเงิน'],['creditNote','ใบลดหนี้'],['refundReceipt','ใบเสร็จการคืนเงิน'],['billingNote','ใบแจ้งวางบิล']];
var FORM_COLORS = ['#2B6CB0','#1F6B3A','#B3402A','#6B3FA0','#C97A1E','#0E7C86','#16233A','#8A1C4A'];
var FORM_FONTS = [['IBM Plex Sans Thai','IBM Plex Sans Thai'],['Sarabun','Sarabun'],['Prompt','Prompt'],['Noto Serif Thai','Noto Serif Thai (มีเชิง)']];
var FORM_TEMPLATES = [['modern','ทันสมัย'],['classic','คลาสสิก'],['fresh','สดใส']];
var DEFAULT_STYLE = { name:'Standard', formType:'default', template:'modern', color:'#2B6CB0', font:'IBM Plex Sans Thai', logo:'', logoSize:'m', logoPos:'left',
  show:{ phone:true, email:true, address:true, taxId:true, terms:true, dueDate:true, colDate:true, colDesc:true, colTax:true, colQty:true, colRate:true, note:true, sign:true },
  title:'', footer:'ขอบคุณที่ใช้บริการ', note:'', signPrep:'ผู้จัดทำ', signAppr:'ผู้อนุมัติ', signCust:'ผู้รับเอกสาร / ลูกค้า', eft:{ bank:'', accName:'', accNo:'' }, printSafe:false,
  emailSubject:'{ประเภท} {เลขที่} จาก {บริษัท}', emailBody:'เรียน {ลูกค้า}\n\nกรุณาดู{ประเภท}เลขที่ {เลขที่} ยอด {ยอดรวม} ครบกำหนด {ครบกำหนด}\n\nขอบคุณครับ/ค่ะ\n{บริษัท}' };
function styleList() { return STORE.formStyles.length ? STORE.formStyles : [Object.assign({ _id:'__standard', _virtual:true, isDefault:true }, clone(DEFAULT_STYLE))]; }
function styleFor(type) {
  var l = styleList();
  return l.find(function(s) { return s.isDefault && s.formType === type; }) || l.find(function(s) { return s.isDefault && s.formType === 'default'; }) || l.find(function(s) { return s.isDefault; }) || l[0];
}
pageState.formSort = 'name';
function formsShell() {
  return '<div class="tx-head"><div><h1 class="section-title">รูปแบบฟอร์มกำหนดเอง</h1><button type="button" class="back-link" style="font-size:14px" onclick="go(\'alldocs\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg>รายการทั้งหมด</button></div>' +
    '<div class="split"><button class="btn btn-outline" type="button" id="newStyleBtn">สร้างสไตล์ใหม่ ▾</button><div class="drop" id="newStyleDrop" hidden>' + FORM_TYPES.slice(1).map(function(t) { return '<button type="button" data-newstyle="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></div></div>' +
    '<div class="banner info" style="align-items:flex-start"><span class="tax-note-ic" style="width:20px;height:20px;font-size:12px;border-color:currentColor;color:inherit">i</span><div>สไตล์ที่ตั้งเป็นค่าเริ่มต้นจะใช้กับเอกสารทุกประเภท ถ้าต้องการหน้าตาเฉพาะของใบแจ้งหนี้หรือใบเสนอราคา ให้สร้างสไตล์สำหรับประเภทนั้นแล้วตั้งเป็นค่าเริ่มต้น</div></div>';
}
function formsData() {
  var l = styleList().slice(), k = pageState.formSort;
  l.sort(function(a, b) { return k === 'updated' ? (b.updatedAt || 0) - (a.updatedAt || 0) : k === 'type' ? a.formType.localeCompare(b.formType) : String(a.name).localeCompare(String(b.name), 'th'); });
  var TL = {}; FORM_TYPES.forEach(function(t) { TL[t[0]] = t[1]; });
  var sortTh = function(key, label) { return '<th><button type="button" class="th-sort' + (k === key ? ' on' : '') + '" data-fsort="' + key + '">' + label + ' ⇅</button></th>'; };
  return '<div class="table-wrap coa-table"><table class="data-table"><thead><tr>' + sortTh('name', 'ชื่อ') + sortTh('type', 'ประเภทแบบฟอร์ม') + sortTh('updated', 'แก้ไขครั้งล่าสุด') + '<th class="r">การดำเนินการ</th></tr></thead><tbody>' +
    l.map(function(s) {
      return '<tr><td><span class="fs-swatch" style="background:' + esc(s.color) + '"></span>' + esc(s.name) + (s.isDefault ? ' <span class="badge b-bal">ค่าเริ่มต้น</span>' : '') + '</td><td>' + (TL[s.formType] || '-') + '</td><td class="num">' + (s.updatedAt ? fmtDateNum(new Date(s.updatedAt).toISOString().slice(0,10)) : fmtDateNum(todayStr())) + '</td>' +
        '<td class="r act"><span class="row-split"><button type="button" class="tax-act" data-editstyle="' + esc(s._id) + '">แก้ไข</button><button type="button" class="row-caret" data-stylemenu="' + esc(s._id) + '" aria-label="ตัวเลือกเพิ่มเติม">⌄</button></span></td></tr>';
    }).join('') + '</tbody></table></div>';
}
function bindForms() {
  var c = byId('sectionContent');
  var nb = byId('newStyleBtn'), nd = byId('newStyleDrop');
  if (nb && !nb._b) { nb._b = 1; nb.addEventListener('click', function(e) { e.stopPropagation(); nd.hidden = !nd.hidden; }); document.addEventListener('click', function() { nd.hidden = true; });
    nd.querySelectorAll('[data-newstyle]').forEach(function(b) { b.addEventListener('click', function() { var s = clone(DEFAULT_STYLE); s.formType = b.dataset.newstyle; s.name = 'สไตล์' + b.textContent + ' ' + (STORE.formStyles.length + 1); openStyleEditor(s); }); }); }
  c.querySelectorAll('[data-fsort]').forEach(function(b) { b.addEventListener('click', function() { pageState.formSort = b.dataset.fsort; refreshPageData(); }); });
  c.querySelectorAll('[data-editstyle]').forEach(function(b) { b.addEventListener('click', function() { var s = styleList().find(function(x) { return x._id === b.dataset.editstyle; }); openStyleEditor(clone(s)); }); });
  c.querySelectorAll('[data-stylemenu]').forEach(function(b) { b.addEventListener('click', function(e) { e.stopPropagation(); styleMenu(b, styleList().find(function(x) { return x._id === b.dataset.stylemenu; })); }); });
}
async function saveStyle(s) {
  var rec = strip(s); delete rec._virtual; rec.updatedAt = Date.now();
  if (rec.isDefault) {
    for (var i = 0; i < STORE.formStyles.length; i++) { var o = STORE.formStyles[i]; if (o._id !== s._id && o.isDefault && o.formType === rec.formType) await setRec('formStyles', o._id, Object.assign({}, strip(o), { isDefault:false })); }
  }
  if (s._id && !s._virtual) await setRec('formStyles', s._id, rec);
  else { if (!STORE.formStyles.length && rec.formType === 'default') rec.isDefault = true; await addRec('formStyles', rec); }
}
function styleMenu(anchor, s) {
  var m = byId('rowMenu');
  if (!m) { m = document.createElement('div'); m.id = 'rowMenu'; m.className = 'drop row-menu'; document.body.appendChild(m); document.addEventListener('click', function() { m.hidden = true; }); window.addEventListener('scroll', function() { m.hidden = true; }, true); }
  var items = [['ทำให้เป็นค่าเริ่มต้น', function() { runStyle(async function() { await saveStyle(Object.assign(s, { isDefault:true })); showToast('ตั้ง ' + s.name + ' เป็นค่าเริ่มต้นแล้ว'); }); }],
    ['ทำสำเนา', function() { var n = clone(s); delete n._id; delete n._virtual; n.isDefault = false; n.name = s.name + ' (สำเนา)'; runStyle(async function() { await addRec('formStyles', Object.assign(strip(n), { updatedAt: Date.now() })); showToast('ทำสำเนาแล้ว'); }); }],
    ['ดูตัวอย่าง', function() { openFormPreview(null, s); }]];
  if (!s._virtual && !(s.isDefault && s.formType === 'default')) items.push(['ลบ', function() { runStyle(async function() { await delRec('formStyles', s._id); showToast('ลบสไตล์แล้ว'); }); }]);
  m.innerHTML = ''; items.forEach(function(it) { var b = document.createElement('button'); b.type = 'button'; b.textContent = it[0]; b.addEventListener('click', function() { m.hidden = true; it[1](); }); m.appendChild(b); });
  m.hidden = false; var r = anchor.getBoundingClientRect(); m.style.position = 'fixed'; m.style.top = (r.bottom + 4) + 'px'; m.style.left = Math.max(8, r.right - m.offsetWidth) + 'px';
}
async function runStyle(fn) { try { await fn(); } catch (e) { showToast(writeError(e)); } }

/* ---- Render a form ---- */
function sampleDoc(type) {
  var t = type === 'default' ? 'invoice' : type, today = todayStr(), due = nextMonthDay(today.slice(0,7), Math.min(28, Number(today.slice(8,10))));
  var base = { type: t, typeLabel: DOC_TYPES[t].label, docNo: (DOC_TYPES[t].prefix || 'DOC') + '-' + today.slice(0,7).replace('-','') + '-001', date: today, party:'บริษัท ตัวอย่าง จำกัด', extra:{},
    items:[{ name:'ค่าบริการออกแบบ', qty:2, price:225 }, { name:'ค่าติดตั้งระบบ', qty:1, price:225 }], vatMode:'exclusive', subtotal:675, vat:47.25, total:722.25, wht:0, net:722.25 };
  if (t === 'invoice') { base.extra.dueDate = due; base.whtRate = 3; base.wht = 20.25; base.net = 702; }
  if (t === 'estimate') base.extra.validUntil = due;
  if (t === 'salesOrder') base.extra.deliveryDate = due;
  if (t === 'receipt') { base.items = null; base.extra = { method:'โอนเงิน', refDoc:'INV-' + today.slice(0,7).replace('-','') + '-001' }; }
  if (t === 'creditNote') { base.items = null; base.subtotal = 100; base.vat = 7; base.total = 107; base.net = 107; base.extra = { refDoc:'INV-' + today.slice(0,7).replace('-','') + '-001', reason:'ส่วนลดสินค้าชำรุด' }; }
  if (t === 'refundReceipt') { base.items = null; base.subtotal = 100; base.vat = 7; base.total = 107; base.net = 107; base.extra = { method:'โอนเงิน', reason:'คืนเงินค่าสินค้าที่ยกเลิก' }; }
  if (t === 'billingNote') { base.vat = 0; base.items = [{ name:'INV-202609-001', date: today, due: due, qty:1, price:722.25 }, { name:'INV-202609-002', date: today, due: due, qty:1, price:1500 }]; base.subtotal = base.total = base.net = 2222.25; base.extra.dueDate = due; }
  return base;
}
var FORM_SPEC = {
  estimate:     { th:'ใบเสนอราคา', en:'QUOTATION', to:'เสนอราคาแก่', date2:['validUntil','ยืนราคาถึง'], total:'ยอดรวมที่เสนอ', sign:['ผู้เสนอราคา','ผู้อนุมัติ','ลูกค้าผู้อนุมัติสั่งซื้อ'], note:'ราคานี้ยืนยันถึงวันที่ระบุ กรุณาลงนามยืนยันเพื่อสั่งซื้อ' },
  salesOrder:   { th:'ใบสั่งขาย', en:'SALES ORDER', to:'ลูกค้า', date2:['deliveryDate','กำหนดส่งของ'], total:'ยอดรวมตามใบสั่งขาย', sign:['ผู้จัดทำ','ผู้อนุมัติ','ลูกค้าผู้สั่งซื้อ'] },
  invoice:      { th:'ใบแจ้งหนี้', thVat:'ใบแจ้งหนี้/ใบกำกับภาษี', en:'INVOICE', to:'ส่งถึง', date2:['dueDate','ครบกำหนด'], terms:true, total:'ยอดที่ต้องชำระ', pay:true, sign:['ผู้จัดทำ','ผู้อนุมัติ','ผู้รับเอกสาร / ลูกค้า'] },
  receipt:      { th:'ใบเสร็จรับเงิน', thVat:'ใบเสร็จรับเงิน/ใบกำกับภาษี', en:'RECEIPT', to:'ได้รับเงินจาก', method:true, refLbl:'อ้างอิงใบแจ้งหนี้', total:'จำนวนเงินที่ได้รับ', sign:['ผู้รับเงิน','ผู้อนุมัติ','ผู้จ่ายเงิน'], note:'ใบเสร็จนี้จะสมบูรณ์เมื่อเรียกเก็บเงินได้ครบถ้วน' },
  creditNote:   { th:'ใบลดหนี้', thVat:'ใบลดหนี้/ใบกำกับภาษี', en:'CREDIT NOTE', to:'ลูกค้า', refLbl:'อ้างอิงเอกสารเดิม', reason:true, total:'มูลค่าที่ลดหนี้', sign:['ผู้จัดทำ','ผู้อนุมัติ','ผู้รับเอกสาร / ลูกค้า'] },
  refundReceipt:{ th:'ใบเสร็จการคืนเงิน', en:'REFUND RECEIPT', to:'คืนเงินให้', method:true, reason:true, total:'จำนวนเงินที่คืน', sign:['ผู้จ่ายคืน','ผู้อนุมัติ','ผู้รับเงินคืน'] },
  billingNote:  { th:'ใบแจ้งวางบิล', en:'BILLING NOTE', to:'วางบิลแก่', date2:['dueDate','นัดชำระวันที่'], billing:true, total:'ยอดรวมวางบิล', sign:['ผู้วางบิล','ผู้อนุมัติ','ผู้รับวางบิล'], note:'กรุณาตรวจสอบรายการและชำระตามวันนัดชำระ' }
};
function renderForm(d, s) {
  s = Object.assign(clone(DEFAULT_STYLE), s || {}); s.show = Object.assign({}, DEFAULT_STYLE.show, s.show || {}); s.eft = Object.assign({}, DEFAULT_STYLE.eft, s.eft || {});
  var cs = companySettings(), ci = coInfoFor(d), c = contactOf(d.party), sh = s.show, col = s.color, ex = d.extra || {};
  var sp = FORM_SPEC[d.type] || { th: d.typeLabel, en:'', to:'ส่งถึง', total:'ยอดรวม', sign:[s.signPrep, s.signAppr, s.signCust] };
  var own = s.formType && s.formType !== 'default';
  var title = (own && s.title) || (d.vat && sp.thVat && taxPointOf(d) !== 'payment' ? sp.thVat : sp.th);
  var signs = own ? [s.signPrep, s.signAppr, s.signCust] : sp.sign;
  var logoW = { s:70, m:110, l:150 }[s.logoSize] || 110;
  var logoSrc = s.logo || cs.logo;
  var logo = logoSrc ? '<img src="' + esc(logoSrc) + '" alt="โลโก้" style="max-width:' + logoW + 'px;max-height:' + logoW + 'px">' : '';
  var head = '<div class="pf-head pf-' + s.template + '" style="' + (s.template === 'fresh' ? 'background:' + col + ';color:#fff;' : '') + (s.logoPos === 'right' ? 'flex-direction:row-reverse;' : '') + '">' +
    (logo ? '<div class="pf-logo">' + logo + '</div>' : '') +
    '<div class="pf-co"><b>' + esc(ci.name) + '</b>' + (sh.address && ci.address ? '<div>' + esc(ci.address) + '</div>' : '') + (sh.phone && ci.phone ? '<div>โทร ' + esc(ci.phone) + '</div>' : '') + (sh.email && (cs.custEmail || cs.email) ? '<div>' + esc(cs.custEmail || cs.email) + '</div>' : '') + (sh.taxId && cs.taxId ? '<div>เลขประจำตัวผู้เสียภาษี ' + esc(cs.taxId) + ' (' + esc(ci.branchName) + ')</div>' : '') + '</div>' +
    '<div class="pf-doctag" style="' + (s.template === 'fresh' ? 'color:#fff;border-color:#fff' : 'color:' + col + ';border-color:' + col) + '">' + esc(sp.en) + '<small>' + (d._copy === 'copy' ? 'สำเนา / COPY' : 'ต้นฉบับ / ORIGINAL') + '</small></div></div>';
  var thR = function(i, n) { return i >= n - 3; };
  var table;
  if (sp.billing) {
    var bi = (d.items || []);
    table = '<table class="pf-table"><thead><tr style="background:' + col + '1f;color:' + col + '"><th>ลำดับ</th><th>เลขที่เอกสาร</th><th>วันที่เอกสาร</th><th>ครบกำหนด</th><th class="r">จำนวนเงิน</th></tr></thead><tbody>' +
      bi.map(function(it, i) { return '<tr><td>' + (i + 1) + '</td><td>' + esc(it.name) + '</td><td>' + fmtDateNum(it.date) + '</td><td>' + fmtDateNum(it.due) + '</td><td class="r">' + M((Number(it.qty) || 1) * (Number(it.price) || 0)) + '</td></tr>'; }).join('') + '</tbody></table>';
  } else {
    var cols = [['colDate','วันที่'],['','รายการ'],['colDesc','คำอธิบาย'],['colTax','ภาษี'],['colQty','จำนวน'],['colRate','ราคา/หน่วย'],['','จำนวนเงิน']].filter(function(x) { return !x[0] || sh[x[0]]; });
    var items = (d.items && d.items.length) ? d.items : [{ name: ex.reason || (ex.refDoc ? sp.th + ' อ้างอิง ' + ex.refDoc : d.typeLabel), qty:1, price: d.subtotal != null ? d.subtotal : d.total }];
    var rows = items.map(function(it) {
      var m = { colDate: fmtDateNum(d.date), colDesc: esc(it.desc || ''), colTax: d.vat ? '7%' : '-', colQty: fmtNum(it.qty), colRate: fmtNum(Number(it.price)) };
      return '<tr>' + cols.map(function(x, i) { var v = !x[0] ? (i === 1 ? esc(it.name) : M((Number(it.qty) || 0) * (Number(it.price) || 0))) : m[x[0]]; return '<td' + (thR(i, cols.length) && x[0] !== 'colDesc' && x[0] !== 'colDate' ? ' class="r"' : '') + '>' + v + '</td>'; }).join('') + '</tr>';
    }).join('');
    table = '<table class="pf-table"><thead><tr style="background:' + col + '1f;color:' + col + '">' + cols.map(function(x, i) { return '<th' + (thR(i, cols.length) && x[0] !== 'colDesc' && x[0] !== 'colDate' ? ' class="r"' : '') + '>' + x[1] + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table>';
  }
  var kv = '<span>เลขที่</span><b>' + esc(d.docNo || '-') + '</b><span>วันที่</span><b>' + fmtDateNum(d.date) + '</b>';
  if (sp.terms && sh.terms && ex.dueDate) kv += '<span>เงื่อนไข</span><b>เครดิต ' + Math.max(0, daysBetween(d.date, ex.dueDate)) + ' วัน</b>';
  if (sp.date2 && ex[sp.date2[0]] && (sp.date2[0] !== 'dueDate' || sh.dueDate)) kv += '<span>' + sp.date2[1] + '</span><b>' + fmtDateNum(ex[sp.date2[0]]) + '</b>';
  if (sp.refLbl && ex.refDoc) kv += '<span>' + sp.refLbl + '</span><b>' + esc(ex.refDoc) + '</b>';
  if (sp.method && ex.method) kv += '<span>ชำระโดย</span><b>' + esc(ex.method) + '</b>';
  var hasPay = sp.pay && d.payments && d.payments.length;
  var sub = d.subtotal != null ? d.subtotal : d.total;
  var sum = '<div class="pf-sum">' + (sp.billing ? '' : '<div><span>รวมเป็นเงิน</span><span>' + M(sub) + '</span></div>' + (d.vat ? '<div><span>ภาษีมูลค่าเพิ่ม 7%</span><span>' + M(d.vat) + '</span></div>' : '') + '<div><span>ยอดรวม</span><span>' + M(d.total) + '</span></div>') +
    (d.wht ? '<div class="pf-wht"><span>หักภาษี ณ ที่จ่าย ' + esc(d.whtRate) + '% (จาก ' + M(sub) + ')</span><span>−' + M(d.wht) + '</span></div>' : '') +
    (hasPay ? '<div><span>ชำระแล้ว</span><span>−' + M(docPaidAmt(d)) + '</span></div>' : '') +
    '<div class="pf-due" style="border-color:' + col + '"><span>' + (hasPay ? 'ยอดคงค้าง' : sp.total) + '</span><b>' + M(hasPay ? docBal(d) : (sp.billing ? d.total : docNet(d))) + '</b></div>' +
    '<div class="pf-words">(' + bahtText(hasPay ? docBal(d) : (sp.billing ? d.total : docNet(d))) + ')</div></div>';
  var notes = [d.type === 'invoice' && taxPointOf(d) === 'payment' && d.vat ? 'ค่าบริการ: ใบกำกับภาษีจะออกให้เมื่อได้รับชำระเงิน' : '', ex.reason && sp.reason ? 'เหตุผล: ' + ex.reason : '', ex.note, s.note, !own ? sp.note : ''].filter(Boolean);
  var body = '<div class="pf-title" style="color:' + (s.template === 'fresh' ? 'var(--pf-ink)' : col) + '">' + esc(title) + '</div>' +
    '<div class="pf-meta"><div><div class="pf-lbl">' + esc(sp.to) + '</div><b>' + esc(d.party) + '</b>' + (c.address ? '<div>' + esc(c.address) + '</div>' : '') + (c.taxId ? '<div>เลขประจำตัวผู้เสียภาษี ' + esc(c.taxId) + (c.branch ? ' (' + esc(c.branch) + ')' : '') + '</div>' : '') + '</div><div class="pf-kv">' + kv + '</div></div>' +
    table + sum +
    (hasPay ? '<div class="pf-note"><div class="pf-lbl" style="color:' + col + '">รายละเอียดการชำระเงิน</div>' + d.payments.map(function(p) { return fmtDateNum(p.date) + ' · ' + esc(p.method) + (p.ref ? ' · ' + esc(p.ref) : '') + ' · ' + M(p.amount) + (p.wht ? ' (หัก ณ ที่จ่าย ' + M(p.wht) + ')' : ''); }).join('\n') + '</div>' : '') +
    ((sp.pay || sp.billing || d.type === 'estimate') && (s.eft.bank || s.eft.accNo) ? '<div class="pf-eft"><div class="pf-lbl">ชำระเงินโดยโอนเข้าบัญชี</div>' + esc([s.eft.bank, s.eft.accName, s.eft.accNo].filter(Boolean).join(' · ')) + '</div>' : '') +
    (sh.note && notes.length ? '<div class="pf-note"><div class="pf-lbl" style="color:' + col + '">หมายเหตุ</div><div>' + esc(notes.join('\n')) + '</div></div>' : '') +
    (sh.sign ? '<div class="pf-sign"><div class="pf-sign-side"><div class="pf-lbl">ในนาม ' + esc(cs.legalName || companyName()) + '</div><div class="pf-sign-row">' +
      [signs[0], signs[1]].map(function(t) { return '<div class="pf-sig"><div class="pf-sig-line"></div><div>( ' + '&nbsp;'.repeat(28) + ' )</div><b>' + esc(t) + '</b><div>วันที่ ____/____/______</div></div>'; }).join('') +
      '<div class="pf-stamp">ตราประทับ<br>บริษัท</div></div></div>' +
      '<div class="pf-sign-side pf-cust"><div class="pf-lbl">ในนาม ' + esc(d.party) + '</div><div class="pf-sign-row"><div class="pf-sig"><div class="pf-sig-line"></div><div>( ' + '&nbsp;'.repeat(28) + ' )</div><b>' + esc(signs[2]) + '</b><div>วันที่ ____/____/______</div></div><div class="pf-stamp">ตราประทับ<br>ลูกค้า</div></div></div></div>' : '') +
    (s.footer ? '<div class="pf-footer">' + esc(s.footer) + '</div>' : '');
  return '<div class="pf-paper' + (s.printSafe ? ' pf-safe' : '') + (s.template === 'classic' ? ' pf-classic' : '') + '" style="font-family:\'' + esc(s.font) + '\', \'IBM Plex Sans Thai\', sans-serif;--pf-accent:' + col + '">' + head + '<div class="pf-body">' + body + '</div></div>';
}
function bahtText(n) {
  n = round2(Math.abs(Number(n) || 0));
  var D = ['','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า'], P = ['','สิบ','ร้อย','พัน','หมื่น','แสน'];
  function rd(x) {
    if (x === 0) return '';
    if (x >= 1000000) return rd(Math.floor(x / 1000000)) + 'ล้าน' + rd(x % 1000000);
    var s = '', str = String(x), L = str.length;
    for (var i = 0; i < L; i++) {
      var dg = Number(str[i]), pos = L - i - 1; if (!dg) continue;
      if (pos === 1 && dg === 1) s += 'สิบ'; else if (pos === 1 && dg === 2) s += 'ยี่สิบ'; else if (pos === 0 && dg === 1 && L > 1) s += 'เอ็ด'; else s += D[dg] + P[pos];
    }
    return s;
  }
  var b = Math.floor(n), st = Math.round((n - b) * 100);
  return (b ? rd(b) + 'บาท' : (st ? '' : 'ศูนย์บาท')) + (st ? rd(st) + 'สตางค์' : 'ถ้วน');
}
function ensureFormFonts() {
  if (byId('pfFonts')) return;
  var l = document.createElement('link'); l.id = 'pfFonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&family=Prompt:wght@400;600&family=Noto+Serif+Thai:wght@400;600&display=swap';
  document.head.appendChild(l);
}
function openFormPreview(d, s) {
  ensureFormFonts();
  d = d || sampleDoc(s ? s.formType : 'invoice');
  s = s || styleFor(d.type);
  openModal({ title:'แบบฟอร์ม ' + (d.docNo || ''), focus:false, body:'<div class="pf-scroll">' + renderForm(d, s) + '</div>', buttons:[{ label:'แก้ไขสไตล์', onClick: function() { openStyleEditor(clone(s)); } }, { label:'🖨 พิมพ์', onClick: function() { printDoc(d); } }, { label:'⬇ ดาวน์โหลด PDF', onClick: function(el) { downloadDocPdf(d, el); } }, { label:'ปิด', cls:'btn-primary', onClick: closeModal }] });
  byId('overlay').querySelector('.modal').classList.add('modal-wide');
}

/* ---- Style editor (full screen) ---- */
var styleDraft = null, styleTab = 'design';
function openStyleEditor(s) {
  ensureFormFonts(); closeModal();
  styleDraft = s; styleTab = 'design';
  var ed = byId('styleEditor');
  if (!ed) { ed = document.createElement('div'); ed.id = 'styleEditor'; ed.className = 'se'; ed.setAttribute('role', 'dialog'); ed.setAttribute('aria-modal', 'true'); document.body.appendChild(ed); }
  var TL = {}; FORM_TYPES.forEach(function(t) { TL[t[0]] = t[1]; });
  ed.innerHTML = '<div class="se-top"><h2>แก้ไข' + (TL[s.formType] === 'ค่าเริ่มต้น' ? 'แบบฟอร์ม' : TL[s.formType]) + ' · <input id="seName" class="se-name" value="' + esc(s.name) + '" aria-label="ชื่อสไตล์"></h2><button type="button" class="modal-close" id="seClose" aria-label="ปิด">✕</button></div>' +
    '<div class="se-main"><div class="se-left"><div class="se-tabs">' + [['design','รูปแบบ'],['content','เนื้อหา'],['email','อีเมล']].map(function(t) { return '<button type="button" class="se-tab" data-setab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div id="sePanel"></div></div>' +
    '<div class="se-right"><div id="sePreview"></div></div></div>' +
    '<div class="se-foot"><button type="button" class="btn" id="seFull">แสดงตัวอย่างเต็มหน้า</button><button type="button" class="btn btn-dark" id="seDone">เสร็จ</button></div>';
  ed.hidden = false; document.body.style.overflow = 'hidden';
  function close() { ed.hidden = true; document.body.style.overflow = ''; }
  byId('seClose').addEventListener('click', close);
  byId('seName').addEventListener('input', function(e) { styleDraft.name = e.target.value; });
  ed.querySelectorAll('[data-setab]').forEach(function(b) { b.addEventListener('click', function() { styleTab = b.dataset.setab; renderSePanel(); }); });
  byId('seFull').addEventListener('click', function() { var d = sampleDoc(styleDraft.formType); openModal({ title:'ตัวอย่างเต็มหน้า', focus:false, body:'<div class="pf-scroll">' + renderForm(d, styleDraft) + '</div>', buttons:[{ label:'ปิด', cls:'btn-primary', onClick: closeModal }] }); byId('overlay').querySelector('.modal').classList.add('modal-wide'); byId('overlay').style.zIndex = 80; });
  byId('seDone').addEventListener('click', async function(e) {
    var b = e.target; if (!styleDraft.name.trim()) { showToast('กรุณาตั้งชื่อสไตล์'); return; }
    b.disabled = true;
    try { await saveStyle(styleDraft); showToast('บันทึกสไตล์ ' + styleDraft.name + ' แล้ว'); close(); if (route.key === 'settings') refreshPageData(); }
    catch (err) { showToast(writeError(err)); b.disabled = false; }
  });
  renderSePanel();
}
function renderSePanel() {
  var s = styleDraft; s.show = Object.assign({}, DEFAULT_STYLE.show, s.show || {}); s.eft = Object.assign({}, DEFAULT_STYLE.eft, s.eft || {});
  document.querySelectorAll('[data-setab]').forEach(function(b) { b.classList.toggle('on', b.dataset.setab === styleTab); });
  var p = byId('sePanel'), h = '';
  var chk = function(k, label) { return '<label class="se-chk"><input type="checkbox" data-show="' + k + '"' + (s.show[k] ? ' checked' : '') + '> ' + label + '</label>'; };
  if (styleTab === 'design') {
    h += '<div class="se-sec"><div class="se-ic">▤</div><div><b>เริ่มต้นด้วยเทมเพลต</b><div class="se-opts">' + FORM_TEMPLATES.map(function(t) { return '<button type="button" class="se-tpl' + (s.template === t[0] ? ' on' : '') + '" data-tpl="' + t[0] + '"><span class="se-tpl-' + t[0] + '" style="--c:' + s.color + '"></span>' + t[1] + '</button>'; }).join('') + '</div></div></div>';
    h += '<div class="se-sec"><div class="se-ic">🖼</div><div><b>โลโก้</b><div class="se-logo">' + (s.logo ? '<img src="' + esc(s.logo) + '" alt="โลโก้">' : '<label class="se-logo-add" for="seLogo">เพิ่มโลโก้<span>+</span></label>') + '<input type="file" id="seLogo" accept="image/*" hidden></div>' +
      (s.logo ? '<div class="se-opts"><label class="btn btn-sm" for="seLogo">เปลี่ยน</label><button type="button" class="btn btn-sm" id="seLogoDel">ลบโลโก้</button>' +
        '<select id="seLogoSize" class="coa-select" style="min-width:0">' + [['s','เล็ก'],['m','กลาง'],['l','ใหญ่']].map(function(o) { return '<option value="' + o[0] + '"' + (s.logoSize === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
        '<select id="seLogoPos" class="coa-select" style="min-width:0">' + [['left','ชิดซ้าย'],['right','ชิดขวา']].map(function(o) { return '<option value="' + o[0] + '"' + (s.logoPos === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' : '') + '</div></div>';
    h += '<div class="se-sec"><div class="se-ic">🎨</div><div><b>สาดบางสี</b><div class="se-opts">' + FORM_COLORS.map(function(c) { return '<button type="button" class="se-color' + (s.color === c ? ' on' : '') + '" data-color="' + c + '" style="background:' + c + '" aria-label="สี ' + c + '"></button>'; }).join('') + '<label class="se-color-custom">อื่น ๆ <input type="color" id="seColor" value="' + esc(s.color) + '"></label></div></div></div>';
    h += '<div class="se-sec"><div class="se-ic" style="font-family:serif">Ff</div><div><b>เลือกสรรแบบอักษรของคุณ</b><div class="se-opts"><select id="seFont" class="coa-select">' + FORM_FONTS.map(function(f) { return '<option value="' + f[0] + '"' + (s.font === f[0] ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('') + '</select></div></div></div>';
    h += '<div class="se-sec"><div class="se-ic">🏦</div><div><b>เพิ่มรายละเอียดการโอนเงิน (EFT) ของคุณ</b><div class="se-grid"><input id="seBank" placeholder="ธนาคาร" value="' + esc(s.eft.bank) + '"><input id="seAccName" placeholder="ชื่อบัญชี" value="' + esc(s.eft.accName) + '"><input id="seAccNo" placeholder="เลขที่บัญชี" value="' + esc(s.eft.accNo) + '"></div></div></div>';
    h += '<div class="se-sec"><div class="se-ic">⬚</div><div><b>เมื่อสงสัย ให้พิมพ์ออกมา</b><label class="se-chk"><input type="checkbox" id="seSafe"' + (s.printSafe ? ' checked' : '') + '> เว้นขอบกระดาษกว้างขึ้นสำหรับพิมพ์และใส่ซองจดหมาย</label></div></div>';
  } else if (styleTab === 'content') {
    h += '<div class="se-sec"><div class="se-ic">H</div><div><b>ส่วนหัว</b><div class="field"><label for="seTitle">ชื่อแบบฟอร์ม (เว้นว่างเพื่อใช้ชื่อเอกสาร)</label><input id="seTitle" value="' + esc(s.title) + '" placeholder="ใบแจ้งหนี้/ใบกำกับภาษี"></div>' + chk('phone','โทรศัพท์บริษัท') + chk('email','อีเมลบริษัท') + chk('address','ที่อยู่บริษัท') + chk('taxId','เลขประจำตัวผู้เสียภาษี') + chk('terms','เงื่อนไขการชำระ') + chk('dueDate','วันครบกำหนด') + '<p class="small muted">แก้ข้อมูลบริษัทได้ที่ ⚙ → บัญชีและการตั้งค่า</p></div></div>';
    h += '<div class="se-sec"><div class="se-ic">▦</div><div><b>ตารางรายการ</b>' + chk('colDate','คอลัมน์วันที่') + chk('colDesc','คอลัมน์คำอธิบาย') + chk('colTax','คอลัมน์ภาษี') + chk('colQty','คอลัมน์จำนวน') + chk('colRate','คอลัมน์ราคา/หน่วย') + '</div></div>';
    h += '<div class="se-sec"><div class="se-ic">▁</div><div><b>ส่วนท้าย</b>' + chk('note','หมายเหตุ') + '<div class="field"><label for="seNote">หมายเหตุมาตรฐาน (แสดงทุกเอกสาร)</label><textarea id="seNote" class="imp-text" rows="3" placeholder="เช่น กรุณาชำระภายในกำหนด หากเกินกำหนดคิดดอกเบี้ย 1.5% ต่อเดือน">' + esc(s.note) + '</textarea></div>' + chk('sign','ช่องรับรองเอกสาร (ลายเซ็นและตราประทับ)') + '<div class="se-grid"><input id="seSignPrep" value="' + esc(s.signPrep) + '" aria-label="ชื่อช่องผู้จัดทำ"><input id="seSignAppr" value="' + esc(s.signAppr) + '" aria-label="ชื่อช่องผู้อนุมัติ"><input id="seSignCust" value="' + esc(s.signCust) + '" aria-label="ชื่อช่องฝั่งลูกค้า"></div><div class="field" style="margin-top:10px"><label for="seFooter">ข้อความท้ายเอกสาร</label><input id="seFooter" value="' + esc(s.footer) + '"></div></div></div>';
  } else {
    h += '<div class="se-sec"><div class="se-ic">✉</div><div><b>ข้อความอีเมลเมื่อส่งเอกสาร</b><div class="field"><label for="seSubj">หัวเรื่อง</label><input id="seSubj" value="' + esc(s.emailSubject) + '"></div><div class="field"><label for="seBody">ข้อความ</label><textarea id="seBody" class="imp-text" rows="8">' + esc(s.emailBody) + '</textarea></div><p class="small muted">ใช้ตัวแปร {บริษัท} {ลูกค้า} {ประเภท} {เลขที่} {ยอดรวม} {ครบกำหนด} ได้</p><div class="se-mail" id="seMail"></div></div></div>';
  }
  p.innerHTML = h;
  function bindVal(id, fn) { var el = byId(id); if (el) el.addEventListener('input', function() { fn(el); updateSePreview(); }); }
  p.querySelectorAll('[data-tpl]').forEach(function(b) { b.addEventListener('click', function() { s.template = b.dataset.tpl; renderSePanel(); }); });
  p.querySelectorAll('[data-color]').forEach(function(b) { b.addEventListener('click', function() { s.color = b.dataset.color; renderSePanel(); }); });
  p.querySelectorAll('[data-show]').forEach(function(b) { b.addEventListener('change', function() { s.show[b.dataset.show] = b.checked; updateSePreview(); }); });
  bindVal('seColor', function(el) { s.color = el.value; });
  bindVal('seFont', function(el) { s.font = el.value; });
  bindVal('seBank', function(el) { s.eft.bank = el.value; }); bindVal('seAccName', function(el) { s.eft.accName = el.value; }); bindVal('seAccNo', function(el) { s.eft.accNo = el.value; });
  bindVal('seTitle', function(el) { s.title = el.value; }); bindVal('seNote', function(el) { s.note = el.value; }); bindVal('seSignPrep', function(el) { s.signPrep = el.value; }); bindVal('seSignAppr', function(el) { s.signAppr = el.value; }); bindVal('seSignCust', function(el) { s.signCust = el.value; }); bindVal('seFooter', function(el) { s.footer = el.value; });
  bindVal('seSubj', function(el) { s.emailSubject = el.value; }); bindVal('seBody', function(el) { s.emailBody = el.value; });
  bindVal('seLogoSize', function(el) { s.logoSize = el.value; }); bindVal('seLogoPos', function(el) { s.logoPos = el.value; });
  var safe = byId('seSafe'); if (safe) safe.addEventListener('change', function() { s.printSafe = safe.checked; updateSePreview(); });
  var ld = byId('seLogoDel'); if (ld) ld.addEventListener('click', function() { s.logo = ''; renderSePanel(); });
  var lf = byId('seLogo'); if (lf) lf.addEventListener('change', function(e) {
    var f = e.target.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function() { var img = new Image(); img.onload = function() { var k = Math.min(1, 320 / Math.max(img.width, img.height)); var cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); s.logo = cv.toDataURL('image/png'); if (s.logo.length > 150000) s.logo = cv.toDataURL('image/jpeg', .8); renderSePanel(); }; img.onerror = function() { showToast('อ่านรูปภาพไม่ได้'); }; img.src = rd.result; };
    rd.readAsDataURL(f);
  });
  updateSePreview();
}
function fillVars(t, d) {
  var map = { 'บริษัท': companyName(), 'ลูกค้า': d.party, 'ประเภท': d.typeLabel, 'เลขที่': d.docNo, 'ยอดรวม': M(d.total), 'ครบกำหนด': fmtDate(d.extra && d.extra.dueDate) };
  return String(t || '').replace(/\{([^}]+)\}/g, function(m, k) { return map[k] != null ? map[k] : m; });
}
function updateSePreview() {
  var d = sampleDoc(styleDraft.formType);
  byId('sePreview').innerHTML = renderForm(d, styleDraft);
  var m = byId('seMail'); if (m) m.innerHTML = '<div class="pf-lbl">ตัวอย่างอีเมล</div><b>' + esc(fillVars(styleDraft.emailSubject, d)) + '</b><div style="white-space:pre-wrap;margin-top:6px">' + esc(fillVars(styleDraft.emailBody, d)) + '</div>';
}
