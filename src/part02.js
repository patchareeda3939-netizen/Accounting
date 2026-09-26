/* ================= Config ================= */
var VAT_RATE = 0.07;
var WHT_RATES = [0, 1, 2, 3, 5];
var PAYMENT_METHODS = ['เงินสด', 'โอนเงิน', 'เช็ค', 'บัตรเครดิต', 'QR พร้อมเพย์'];

// flow: 'rev' | 'exp' counts toward P&L; sign flips credit notes
var DOC_TYPES = {
  invoice:        { label:'ใบแจ้งหนี้', group:'customer', template:'itemized', partyLabel:'ลูกค้า', prefix:'INV', vat:true, flow:'rev', sign:1, status:true, extra:[{key:'dueDate',label:'วันครบกำหนดชำระ',type:'date'}] },
  receipt:        { label:'ใบเสร็จรับเงิน', group:'customer', template:'simple', partyLabel:'ผู้จ่ายเงิน', prefix:'RE', vat:true, wht:true, flow:'rev', sign:1, extra:[{key:'method',label:'วิธีชำระเงิน',type:'select',options:PAYMENT_METHODS},{key:'refDoc',label:'รับชำระตามใบแจ้งหนี้เลขที่',type:'text',list:'dl_openinv'}] },
  payment:        { label:'การรับชำระเงิน', group:'customer', template:'simple', partyLabel:'ลูกค้า', prefix:'PM', extra:[{key:'method',label:'วิธีชำระเงิน',type:'select',options:PAYMENT_METHODS},{key:'refDoc',label:'ชำระสำหรับเอกสารเลขที่',type:'text'}] },
  estimate:       { label:'ใบเสนอราคา', group:'customer', template:'itemized', partyLabel:'ลูกค้า', prefix:'QT', vat:true, extra:[{key:'validUntil',label:'ยืนราคาถึงวันที่',type:'date'}] },
  salesOrder:     { label:'ใบสั่งขาย', group:'customer', template:'itemized', partyLabel:'ลูกค้า', prefix:'SO', vat:true, status:true, order:true, extra:[{key:'deliveryDate',label:'วันที่ส่งของ',type:'date'}] },
  creditNote:     { label:'ใบลดหนี้', group:'customer', template:'simple', partyLabel:'ลูกค้า', prefix:'CN', vat:true, flow:'rev', sign:-1, extra:[{key:'refDoc',label:'อ้างอิงเอกสารเดิม',type:'text'},{key:'reason',label:'เหตุผล',type:'text'}] },
  refundReceipt:  { label:'ใบเสร็จการคืนเงิน', group:'customer', template:'simple', partyLabel:'ลูกค้า', prefix:'RF', vat:true, flow:'rev', sign:-1, extra:[{key:'reason',label:'เหตุผลคืนเงิน',type:'text'}] },
  billingNote:    { label:'ใบแจ้งวางบิล', group:'customer', template:'itemized', billing:true, partyLabel:'ลูกค้า', prefix:'BN', extra:[{key:'dueDate',label:'นัดชำระวันที่',type:'date'}] },

  expense:        { label:'ค่าใช้จ่าย', group:'supplier', template:'simple', partyLabel:'ผู้รับเงิน', prefix:'EX', vat:true, wht:true, flow:'exp', sign:1, extra:[{key:'method',label:'วิธีชำระเงิน',type:'select',options:PAYMENT_METHODS}] },
  bill:           { label:'บิลซื้อ', group:'supplier', template:'itemized', partyLabel:'ผู้ขาย', prefix:'BL', vat:true, wht:true, flow:'exp', sign:1, status:true, extra:[{key:'dueDate',label:'วันครบกำหนดชำระ',type:'date'}] },
  checkPayment:   { label:'เช็คจ่าย', group:'supplier', template:'simple', partyLabel:'ผู้รับเงิน', prefix:'CQ', vat:true, wht:true, flow:'exp', sign:1, extra:[{key:'checkNo',label:'เลขที่เช็ค',type:'text'}] },
  purchaseOrder:  { label:'ใบสั่งซื้อ', group:'supplier', template:'itemized', partyLabel:'ผู้ขาย', prefix:'PO', vat:true, status:true, order:true, extra:[{key:'deliveryDate',label:'วันที่รับของ',type:'date'}] },
  vendorCredit:   { label:'เครดิตจากผู้ขาย', group:'supplier', template:'simple', partyLabel:'ผู้ขาย', prefix:'VC', vat:true, flow:'exp', sign:-1, extra:[{key:'refDoc',label:'อ้างอิงเอกสารเดิม',type:'text'}] },
  addSupplier:    { label:'เพิ่มซัพพลายเออร์', group:'supplier', action:'contact' },

  oneTimeActivity:{ label:'กิจกรรมครั้งเดียว', group:'team', template:'record', partyLabel:'รายละเอียดกิจกรรม', prefix:'AC', extra:[{key:'employee',label:'พนักงาน',type:'text',list:'dl_employees'},{key:'hours',label:'จำนวนชั่วโมง',type:'number'}] },
  weeklyTimesheet:{ label:'บันทึกงานรายสัปดาห์', group:'team', template:'record', partyLabel:'พนักงาน', partyList:'dl_employees', prefix:'TS', extra:[{key:'week',label:'สัปดาห์ที่',type:'text'},{key:'hours',label:'จำนวนชั่วโมง',type:'number'}] },

  project:        { label:'โปรเจกต์', group:'project', template:'record', partyLabel:'ชื่อโปรเจกต์', prefix:'PJ', status:true, proj:true, extra:[{key:'client',label:'ลูกค้า/เจ้าของโครงการ',type:'text',list:'dl_customers'},{key:'budget',label:'งบประมาณ (บาท)',type:'number'},{key:'endDate',label:'กำหนดเสร็จ',type:'date'},{key:'manager',label:'ผู้รับผิดชอบ',type:'text',list:'dl_employees'}] },

  journalEntry:   { label:'สมุดรายวันทั่วไป', group:'other', template:'journal', partyLabel:'คำอธิบายรายการ', prefix:'JV', extra:[] },
  bankDeposit:    { label:'ฝากเงินธนาคาร', group:'other', template:'simple', partyLabel:'บัญชีธนาคาร', prefix:'DP', extra:[{key:'source',label:'รับจาก',type:'text'}] },
  transfer:       { label:'โอนเงิน', group:'other', template:'simple', partyLabel:'จากบัญชี', prefix:'TR', extra:[{key:'toAccount',label:'ไปยังบัญชี',type:'text'}] },
  inventoryAdjust:{ label:'ปรับจำนวนสินค้าคงคลัง', group:'other', template:'record', partyLabel:'สินค้า', partyList:'dl_products', prefix:'IA', extra:[{key:'qtyChange',label:'จำนวนที่ปรับ (+ เพิ่ม / − ลด)',type:'number'},{key:'reason',label:'เหตุผล',type:'text'}] },
  addProduct:     { label:'เพิ่มสินค้า/บริการ', group:'other', action:'product' },
  addAccount:     { label:'เพิ่มบัญชีในผังบัญชี', group:'other', action:'account' }
};
// supplier's own invoice / tax-invoice reference on purchase documents
['expense','bill','checkPayment','vendorCredit','purchaseOrder'].forEach(function(t) {
  var x = DOC_TYPES[t]; if (!x) return;
  x.extra = [{ key:'supInvNo', label: t === 'purchaseOrder' ? 'เลขที่ใบเสนอราคาผู้ขาย' : 'เลขที่ใบกำกับภาษี / เลขที่บิลผู้ขาย', type:'text' }, { key:'supInvDate', label: t === 'purchaseOrder' ? 'วันที่ใบเสนอราคา' : 'วันที่ใบกำกับภาษี / บิล', type:'date' }].concat(x.extra || []);
});

var GROUP_ORDER = ['customer','supplier','team','project','other'];
var GROUP_LABEL = { customer:'ลูกค้า', supplier:'ซัพพลายเออร์', team:'ทีมงาน', project:'โครงการ', other:'อื่น ๆ' };

var ACCOUNT_TYPES = [
  { key:'asset', label:'สินทรัพย์', debitNormal:true },
  { key:'liability', label:'หนี้สิน', debitNormal:false },
  { key:'equity', label:'ส่วนของเจ้าของ', debitNormal:false },
  { key:'income', label:'รายได้', debitNormal:false },
  { key:'expense', label:'ค่าใช้จ่าย', debitNormal:true }
];
// Account type (ประเภทบัญชี) -> base class; BAL = balance sheet, P&L = income statement
var ACC_SUBTYPES = [
  ['bank','ธนาคาร','asset'],['ar','ลูกหนี้การค้า (A/R)','asset'],['curAsset','สินทรัพย์หมุนเวียน','asset'],['fixedAsset','สินทรัพย์ถาวร','asset'],
  ['ap','เจ้าหนี้การค้า (A/P)','liability'],['curLiab','หนี้สินหมุนเวียน','liability'],['ltLiab','หนี้สินไม่หมุนเวียน','liability'],
  ['equity','ส่วนของเจ้าของ','equity'],
  ['income','รายได้','income'],['otherIncome','รายได้อื่น','income'],
  ['cogs','ต้นทุนขาย','expense'],['expense','ค่าใช้จ่าย','expense'],['otherExpense','ค่าใช้จ่ายอื่น','expense']
];
var DEFAULT_SUBTYPE = { asset:'curAsset', liability:'curLiab', equity:'equity', income:'income', expense:'expense' };
function accSubtype(a) {
  if (a.accType && ACC_SUBTYPES.some(function(x) { return x[0] === a.accType; })) return a.accType;
  if (DEFAULT_SUBTYPE[a.type]) return DEFAULT_SUBTYPE[a.type];
  var t = String(a.accType || a.type || '');
  var th = ACC_SUBTYPES.find(function(x) { return x[1] === t; }); if (th) return th[0];
  if (/รายได้/.test(t)) return 'income'; if (/ต้นทุน/.test(t)) return 'cogs'; if (/ค่าใช้จ่าย/.test(t)) return 'expense';
  if (/หนี้สิน/.test(t)) return 'curLiab'; if (/ทุน|เจ้าของ/.test(t)) return 'equity'; if (/สินทรัพย์|ธนาคาร|เงินสด/.test(t)) return 'curAsset';
  return ({ '1':'curAsset','2':'curLiab','3':'equity','4':'income','5':'expense' })[String(a.code || '').charAt(0)] || 'expense';
}
function subtypeLabel(k) { var s = ACC_SUBTYPES.find(function(x) { return x[0] === k; }); return s ? s[1] : k; }
function subtypeBase(k) { var s = ACC_SUBTYPES.find(function(x) { return x[0] === k; }); return s ? s[2] : 'expense'; }
function isPL(a) { var t = subtypeBase(accSubtype(a)); return t === 'income' || t === 'expense'; }
var TAX_CODES = [['','—'],['vat7','VAT 7%'],['vat0','VAT 0%'],['exempt','ยกเว้น VAT']];
// [code, name, accType, detailType, taxCode]
var STANDARD_COA = [
  ['1110','เงินสด','bank','เงินสดในมือ',''],['1120','เงินฝากธนาคาร','bank','บัญชีออมทรัพย์/กระแสรายวัน',''],
  ['1130','ลูกหนี้การค้า','ar','ลูกหนี้การค้า (A/R)',''],['1140','สินค้าคงเหลือ','curAsset','สินค้าคงคลัง',''],
  ['1150','ภาษีซื้อ','curAsset','ภาษีซื้อรอเครดิต','vat7'],['1155','ภาษีซื้อรอเรียกเก็บ','curAsset','ภาษีซื้อที่ยังไม่ได้จ่ายชำระ (ค่าบริการ)','vat7'],['1160','ภาษีเงินได้ถูกหัก ณ ที่จ่าย','curAsset','สินทรัพย์หมุนเวียนอื่น ๆ',''],
  ['1210','อุปกรณ์สำนักงาน','fixedAsset','เครื่องใช้สำนักงาน',''],['1220','ค่าเสื่อมราคาสะสม','fixedAsset','ค่าเสื่อมราคาสะสม',''],
  ['2110','เจ้าหนี้การค้า','ap','เจ้าหนี้การค้า (A/P)',''],['2120','ภาษีขาย','curLiab','ภาษีการขายและบริการที่ต้องชำระ','vat7'],
  ['2130','ภาษีหัก ณ ที่จ่ายค้างจ่าย','curLiab','ภาษีหัก ณ ที่จ่ายค้างนำส่ง',''],['2125','ภาษีขายรอเรียกเก็บ','curLiab','ภาษีขายที่ยังไม่ได้รับชำระ (ค่าบริการ)','vat7'],['2140','ค่าใช้จ่ายค้างจ่าย','curLiab','ค่าใช้จ่ายค้างจ่าย',''],
  ['2210','เงินกู้ยืมระยะยาว','ltLiab','เงินกู้ยืมจากสถาบันการเงิน',''],
  ['3110','ทุนจดทะเบียน','equity','ทุนที่ออกและชำระแล้ว',''],['3120','กำไรสะสม','equity','กำไรสะสม',''],
  ['4110','รายได้จากการขาย','income','รายได้จากการขายผลิตภัณฑ์','vat7'],['4120','รายได้จากการให้บริการ','income','รายได้ค่าบริการ/ค่าธรรมเนียม','vat7'],
  ['4190','รายได้อื่น','otherIncome','รายได้อื่น ๆ',''],
  ['5110','ต้นทุนขาย','cogs','ต้นทุนสินค้าที่ขาย',''],['5210','เงินเดือนและค่าจ้าง','expense','เงินเดือนและสวัสดิการ',''],
  ['5220','ค่าเช่า','expense','ค่าเช่าหรือค่าเช่าซื้อ','vat7'],['5230','ค่าสาธารณูปโภค','expense','ค่าน้ำ ค่าไฟ ค่าโทรศัพท์','vat7'],
  ['5240','ค่าโฆษณา','expense','การโฆษณา/การส่งเสริมการขาย','vat7'],['5250','ค่าเสื่อมราคา','expense','ค่าเสื่อมราคา',''],
  ['5290','ค่าใช้จ่ายเบ็ดเตล็ด','otherExpense','ค่าใช้จ่ายอื่น ๆ','']
];

var CONTACT_FIELDS = [
  { key:'name', label:'ชื่อ', required:true },
  { key:'kind', label:'ประเภทคู่ค้า', type:'select', options:[['customer','ลูกค้า'],['supplier','ซัพพลายเออร์'],['both','ทั้งลูกค้าและซัพพลายเออร์']] },
  { key:'entity', label:'สถานะผู้เสียภาษี', type:'select', options:[['company','นิติบุคคล (ภ.ง.ด.53)'],['person','บุคคลธรรมดา (ภ.ง.ด.3)']] },
  { key:'taxId', label:'เลขประจำตัวผู้เสียภาษี (13 หลัก)', placeholder:'0105561234567' },
  { key:'branch', label:'สาขา', placeholder:'สำนักงานใหญ่' },
  { key:'phone', label:'โทรศัพท์' },
  { key:'email', label:'อีเมล', type:'email' },
  { key:'address', label:'ที่อยู่' }
];
var PRODUCT_FIELDS = [
  { key:'name', label:'ชื่อสินค้า/บริการ', required:true },
  { key:'sku', label:'รหัสสินค้า (SKU)' },
  { key:'kind', label:'ประเภท', type:'select', options:[['goods','สินค้า (นับสต็อก)'],['service','บริการ']] },
  { key:'unit', label:'หน่วยนับ', placeholder:'ชิ้น, กล่อง, ชั่วโมง' },
  { key:'price', label:'ราคาขาย/หน่วย (บาท)', type:'number' },
  { key:'cost', label:'ต้นทุน/หน่วย (บาท)', type:'number' },
  { key:'openingQty', label:'ยอดยกมา (จำนวน)', type:'number' },
  { key:'reorderPoint', label:'จุดสั่งซื้อใหม่ (แจ้งเตือนเมื่อเหลือไม่เกิน)', type:'number', placeholder:'5' }
];
var ACCOUNT_FIELDS = [
  { key:'code', label:'รหัสบัญชี', required:true, placeholder:'เช่น 5260' },
  { key:'name', label:'ชื่อบัญชี', required:true },
  { key:'accType', label:'ประเภทบัญชี', type:'select', options:ACC_SUBTYPES.map(function(t){ return [t[0], t[1] + ' · ' + (t[2] === 'income' || t[2] === 'expense' ? 'P&L' : 'BAL')]; }) },
  { key:'detailType', label:'ประเภทรายละเอียด', placeholder:'เช่น รายได้ค่าบริการ/ค่าธรรมเนียม' },
  { key:'taxCode', label:'ภาษี', type:'select', options:TAX_CODES },
  { key:'description', label:'คำอธิบาย' }
];
var EMPLOYEE_FIELDS = [
  { key:'name', label:'ชื่อ-นามสกุล', required:true },
  { key:'position', label:'ตำแหน่ง' },
  { key:'empType', label:'ประเภทการจ้าง', type:'select', options:[['full','พนักงานประจำ'],['part','พาร์ทไทม์'],['contract','ฟรีแลนซ์/สัญญาจ้าง']] },
  { key:'startDate', label:'วันที่เริ่มงาน', type:'date' },
  { key:'salary', label:'เงินเดือน/ค่าจ้าง (บาท)', type:'number' },
  { key:'hourlyRate', label:'ค่าแรงต่อชั่วโมง (บาท)', type:'number' },
  { key:'phone', label:'โทรศัพท์' },
  { key:'email', label:'อีเมล', type:'email' },
  { key:'active', label:'สถานะ', type:'select', options:[['yes','ทำงานอยู่'],['no','ลาออกแล้ว']] }
];
var COLL_META = {
  employees: { fields:EMPLOYEE_FIELDS, title:'พนักงาน' },
  contacts: { fields:CONTACT_FIELDS, title:'ผู้ติดต่อ' },
  products: { fields:PRODUCT_FIELDS, title:'สินค้า/บริการ' },
  accounts: { fields:ACCOUNT_FIELDS, title:'บัญชี' }
};

/* ================= Helpers ================= */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
function todayStr() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function fmtMoney(n, dec) { n = Number(n) || 0; var d = dec == null ? 2 : dec; return (n < 0 ? '−฿' : '฿') + Math.abs(n).toLocaleString('th-TH', { minimumFractionDigits:d, maximumFractionDigits:d }); }
function fmtNum(n) { return (Number(n) || 0).toLocaleString('th-TH', { maximumFractionDigits:2 }); }
function fmtDate(s) { if (!s) return '-'; var d = new Date(s + 'T00:00:00'); if (isNaN(d)) return esc(s); return d.toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit' }); }
function monthLabel(ym, long) { var d = new Date(ym + '-01T00:00:00'); return d.toLocaleDateString('th-TH', long ? { month:'long', year:'numeric' } : { month:'short' }); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function byId(id) { return document.getElementById(id); }

function docAmountExVat(d) { return d.subtotal != null ? Number(d.subtotal) || 0 : Number(d.total) || 0; }
function docNet(d) { if (d.type === 'invoice' || d.type === 'bill') return Number(d.total) || 0; return d.net != null ? Number(d.net) || 0 : Number(d.total) || 0; }
function docFlow(d) { var t = DOC_TYPES[d.type]; if (d.type === 'receipt' && d.extra && d.extra.invoiceId) return null; return t ? t.flow : null; }
function docSign(d) { var t = DOC_TYPES[d.type]; return t && t.sign ? t.sign : 1; }
function docStatus(d) {
  if (d.voided) return 'void';
  var t = DOC_TYPES[d.type];
  if (!t || !t.status) return 'done';
  if (d.status === 'paid') return 'paid';
  if (t.flow && d.payments && d.payments.length && docBal(d) <= 0.009) return 'paid';
  var due = d.extra && (d.extra.dueDate || d.extra.deliveryDate || d.extra.endDate);
  if (due && due < todayStr()) return 'overdue';
  if (t.flow && d.payments && d.payments.length) return 'partial';
  return 'unpaid';
}
function docPaidAmt(d) { return round2((d.payments || []).reduce(function(s, p) { return s + (Number(p.amount) || 0) + (Number(p.wht) || 0) + (Number(p.fee) || 0); }, 0)); }
function docBal(d) { if (d.voided) return 0; if (d.status === 'paid' && !(d.payments && d.payments.length)) return 0; return round2(Math.max(0, docNet(d) - docPaidAmt(d))); }
var STATUS_LABEL = { void:'ยกเลิกแล้ว', partial:'ชำระบางส่วน', paid:'ชำระแล้ว', unpaid:'ค้างชำระ', overdue:'เกินกำหนด', done:'บันทึกแล้ว' };
var ORDER_LABEL = { partial:'เปิดอยู่', paid:'ปิดแล้ว', unpaid:'เปิดอยู่', overdue:'เลยกำหนดส่ง', done:'บันทึกแล้ว' };
var PROJECT_LABEL = { partial:'กำลังดำเนินการ', paid:'เสร็จแล้ว', unpaid:'กำลังดำเนินการ', overdue:'เลยกำหนด', done:'บันทึกแล้ว' };
function statusText(d) { var s = docStatus(d), t = DOC_TYPES[d.type]; return (t && t.proj ? PROJECT_LABEL : t && t.order ? ORDER_LABEL : STATUS_LABEL)[s]; }
function statusPill(d) { var s = docStatus(d); return '<span class="status st-' + s + '">' + statusText(d) + '</span>'; }

/* ================= Data store ================= */
var db = null;
var dbReady = false;
var STORE = { documents:[], contacts:[], products:[], accounts:[], taxReturns:[], employees:[], settings:[], formStyles:[] };
var localSeq = 0;

var CUR_CO = 'main', COMPANIES = [], _unsubs = [], LOCAL_CO = {};
try { CUR_CO = localStorage.getItem('psm_company') || 'main'; } catch (e) {}
function cname(coll) { return CUR_CO === 'main' ? coll : coll + '__' + CUR_CO; }
var SUBS = [['documents','createdAt','desc'],['contacts','name','asc'],['products','name','asc'],['accounts','code','asc'],['taxReturns','period','asc'],['employees','name','asc'],['settings','updatedAt','asc'],['formStyles','name','asc']];
async function initDb() {
  try { db = (window.claude && window.claude.use) ? await window.claude.use('db') : null; } catch (e) { db = null; }
  if (!db && fbConfigured()) db = await fbStart();
  dbReady = true;
  byId('modeBadge').hidden = !!db;
  if (!db) { localLoadCompanies(); localLoad(); onData(); return; }
  try { db.collection('companies').orderBy('createdAt', 'asc').limit(200).onSnapshot(function(snap) { COMPANIES = snap.docs.map(function(d) { var o = Object.assign({}, d.data()); o._id = d.id; return o; }); if (typeof renderCoSwitch === 'function') renderCoSwitch(); }); } catch (e) {}
  subscribeAll();
  if (FB_MODE) fbAfterStart();
}
function subscribeAll() {
  _unsubs.forEach(function(u) { try { u && u(); } catch (e) {} }); _unsubs = [];
  SUBS.forEach(function(s) { subscribe(s[0], s[1], s[2]); });
}
function subscribe(coll, field, dir) {
  var co = CUR_CO;
  try {
    var u = db.collection(cname(coll)).orderBy(field, dir).limit(1000).onSnapshot(function(snap) {
      if (co !== CUR_CO) return;
      STORE[coll] = snap.docs.map(function(d) { var o = Object.assign({}, d.data()); o._id = d.id; return o; });
      onData();
    }, function(err) { showToast('โหลดข้อมูล ' + coll + ' ไม่สำเร็จ'); });
    _unsubs.push(u);
  } catch (e) {}
}
function switchCompany(id) {
  if (id === CUR_CO) return;
  if (!db) { localFlush(); LOCAL_CO[CUR_CO] = STORE; STORE = LOCAL_CO[id] || { documents:[], contacts:[], products:[], accounts:[], taxReturns:[], employees:[], settings:[], formStyles:[] }; }
  else SUBS.forEach(function(s) { STORE[s[0]] = []; });
  CUR_CO = id; try { localStorage.setItem('psm_company', id); } catch (e) {}
  if (!db && !LOCAL_CO[id]) localLoad();
  if (db) subscribeAll();
  if (FB_MODE) fbWatchRole();
  var hb = byId('sidebarHomeBtn'); if (hb) hb.click();
  onData();
}
function strip(rec) { var o = Object.assign({}, rec); delete o._id; return o; }
function sortLocal(coll) {
  var f = { documents:['createdAt',-1], contacts:['name',1], products:['name',1], accounts:['code',1], taxReturns:['period',1], employees:['name',1], settings:['updatedAt',1], formStyles:['name',1] }[coll];
  STORE[coll].sort(function(a, b) { var x = a[f[0]], y = b[f[0]]; return (x > y ? 1 : x < y ? -1 : 0) * f[1]; });
}
function writeError(e) {
  var code = e && e.code;
  if (code === 'quota_exceeded') return 'พื้นที่เก็บข้อมูลเต็ม ลบเอกสารเก่าที่ไม่ใช้ก่อนแล้วลองใหม่';
  if (code === 'permission-denied') return fbReadOnly() ? 'คุณมีสิทธิ์ดูอย่างเดียวในบริษัทนี้' : 'คุณไม่มีสิทธิ์ทำรายการนี้';
  if (code === 'invalid_argument') return 'คุณไม่มีสิทธิ์แก้ไขข้อมูลในหน้านี้ ขอสิทธิ์ Contributor จากเจ้าของ';
  return 'บันทึกไม่สำเร็จ ลองอีกครั้ง';
}
async function addRec(coll, rec) {
  if (db) { var ref = await db.collection(cname(coll)).add(rec); return ref && ref.id; }
  rec = Object.assign({}, rec, { _id: 'local' + (++localSeq) });
  STORE[coll].push(rec); sortLocal(coll); onData();
  return rec._id;
}
async function setRec(coll, id, rec) {
  if (db) { await db.doc(cname(coll) + '/' + id).set(strip(rec)); return; }
  var i = STORE[coll].findIndex(function(r) { return r._id === id; });
  if (i >= 0) STORE[coll][i] = Object.assign({}, strip(rec), { _id:id });
  sortLocal(coll); onData();
}
async function delRec(coll, id) {
  if (db) { await db.doc(cname(coll) + '/' + id).delete(); return; }
  STORE[coll] = STORE[coll].filter(function(r) { return r._id !== id; }); onData();
}
function findDoc(id) { return STORE.documents.find(function(d) { return d._id === id; }); }

// standalone mode (no Claude database, e.g. GitHub Pages): keep data in this browser's localStorage
function localKey() { return 'psmacc_data_' + CUR_CO; }
// localSeq only grows so ids stay unique when switching back to a company already in memory
function localLoad() {
  try { var s = JSON.parse(localStorage.getItem(localKey()) || 'null'); if (s) { Object.keys(STORE).forEach(function(k) { if (Array.isArray(s[k])) STORE[k] = s[k]; }); localSeq = Math.max(localSeq, s._seq || 1000); } } catch (e) {}
}
// the company list is read once at startup; afterwards memory is the source of truth
function localLoadCompanies() {
  try { var cs = JSON.parse(localStorage.getItem('psmacc_companies') || 'null'); if (Array.isArray(cs)) COMPANIES = cs; } catch (e) {}
}
var _lsT = null, _lsFailed = false;
function localFlush() {
  clearTimeout(_lsT); _lsT = null;
  if (db || !dbReady) return;
  try {
    var o = Object.assign({ _seq: localSeq }, STORE);
    localStorage.setItem(localKey(), JSON.stringify(o)); localStorage.setItem('psmacc_companies', JSON.stringify(COMPANIES));
    _lsFailed = false;
  } catch (e) {
    if (!_lsFailed) showToast('บันทึกข้อมูลลงเบราว์เซอร์ไม่สำเร็จ (พื้นที่อาจเต็ม) กรุณาสำรองข้อมูลบริษัททันที');
    _lsFailed = true;
  }
}
function localSave() {
  if (db || !dbReady) return;
  clearTimeout(_lsT); _lsT = setTimeout(localFlush, 300);
}
window.addEventListener('pagehide', function() { if (_lsT) localFlush(); });
function onData() {
  localSave();
  if (dbReady && !fbReadOnly() && STORE.accounts.length && (!STORE.accounts.some(function(a) { return a.code === '2125'; }) || STORE.accounts.some(function(a) { return (a.code === '2125' || a.code === '1155') && /ยังไม่ถึงกำหนด/.test(a.name); }))) setTimeout(ensureVatAccounts, 0);
  if (typeof applyCompany === 'function') applyCompany();
  renderDatalists();
  renderDashboard();
  if (!byId('sectionView').hidden) refreshPageData();
}

/* ================= Datalists ================= */
function renderDatalists() {
  var host = byId('datalists');
  if (!host) { host = document.createElement('div'); host.id = 'datalists'; host.hidden = true; document.body.appendChild(host); }
  function opts(arr) { return arr.map(function(v) { return '<option value="' + esc(v) + '"></option>'; }).join(''); }
  var cust = STORE.contacts.filter(function(c) { return c.kind !== 'supplier'; }).map(function(c) { return c.name; });
  var sup = STORE.contacts.filter(function(c) { return c.kind === 'supplier' || c.kind === 'both'; }).map(function(c) { return c.name; });
  var cats = {};
  STORE.documents.forEach(function(d) { if (d.extra && d.extra.expCategory) cats[d.extra.expCategory] = 1; });
  STORE.accounts.forEach(function(a) { if (a.type === 'expense') cats[a.name] = 1; });
  host.innerHTML =
    '<datalist id="dl_customers">' + opts(cust) + '</datalist>' +
    '<datalist id="dl_suppliers">' + opts(sup) + '</datalist>' +
    '<datalist id="dl_products">' + opts(STORE.products.map(function(p) { return p.name; })) + '</datalist>' +
    '<datalist id="dl_employees">' + opts(STORE.employees.map(function(e) { return e.name; })) + '</datalist>' +
    '<datalist id="dl_openinv">' + STORE.documents.filter(function(d) { return d.type === 'invoice' && docBal(d) > 0.009; }).map(function(d) { return '<option value="' + esc(d.docNo) + '">' + esc(d.party + ' · คงค้าง ' + fmtMoney(docBal(d))) + '</option>'; }).join('') + '</datalist>' +
    '<datalist id="dl_expcat">' + opts(Object.keys(cats)) + '</datalist>';
}

/* ================= Modal ================= */
var overlay = byId('overlay'), menuOverlay = byId('menuOverlay');
var modalBody = byId('modalBody'), modalTitle = byId('modalTitle'), modalFoot = byId('modalFoot');

function openModal(o) {
  modalTitle.textContent = o.title;
  modalBody.innerHTML = o.body;
  modalFoot.innerHTML = '';
  (o.buttons || []).forEach(function(b) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'btn ' + (b.cls || '');
    el.textContent = b.label;
    if (b.left) el.style.marginRight = 'auto';
    el.addEventListener('click', function() { b.onClick(el); });
    modalFoot.appendChild(el);
  });
  overlay.classList.add('open');
  modalBody.parentNode.scrollTop = 0;
  if (o.onMount) o.onMount();
  var first = modalBody.querySelector('input, select');
  if (first && o.focus !== false) first.focus();
}
function closeModal() { overlay.classList.remove('open'); form = null; }
function openMenu() { menuOverlay.classList.add('open'); }
function closeMenu() { menuOverlay.classList.remove('open'); }
var CANCEL_BTN = { label:'ยกเลิก', onClick: function() { closeModal(); } };
function confirmDeleteBtn(onConfirm) {
  return { label:'ลบ', cls:'btn-danger', left:true, onClick: function(el) {
    if (!el.classList.contains('arm')) { el.classList.add('arm'); el.textContent = 'กดอีกครั้งเพื่อยืนยันการลบ'; return; }
    onConfirm(el);
  } };
}
async function runSave(btn, fn) {
  btn.disabled = true;
  try { await fn(); } catch (e) { var fe = byId('formError'); if (e && e._msg && fe) { fe.textContent = e._msg; fe.hidden = false; } else showToast(e && e._msg || writeError(e)); btn.disabled = false; }
}

function showToast(msg) {
  var t = byId('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(function() { t.classList.remove('show'); }, 2600);
}

/* ================= Generic record form (contacts / products / accounts) ================= */
function fieldHTML(f, val, idPrefix) {
  var id = idPrefix + f.key;
  var v = val == null ? '' : val;
  if (f.type === 'select') {
    var opts = f.options.map(function(o) {
      var k = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(k) + '"' + (String(v) === String(k) ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('');
    return '<div class="field"><label for="' + id + '">' + esc(f.label) + '</label><select id="' + id + '">' + opts + '</select></div>';
  }
  return '<div class="field"><label for="' + id + '">' + esc(f.label) + (f.required ? ' *' : '') + '</label><input id="' + id + '" type="' + (f.type || 'text') + '"' +
    (f.type === 'number' ? ' step="any"' : '') + (f.list ? ' list="' + f.list + '"' : '') +
    ' value="' + esc(v) + '" placeholder="' + esc(f.placeholder || '') + '"></div>';
}

function openRecordForm(coll, rec, defaults) {
  var meta = COLL_META[coll];
  var src = rec || defaults || {};
  if (coll === 'accounts') src = Object.assign({}, src, { accType: accSubtype(src) });
  var body = meta.fields.map(function(f) { return fieldHTML(f, src[f.key], 'r_'); }).join('') + '<div class="form-error" id="formError" hidden></div>';
  var buttons = [];
  if (rec) buttons.push(confirmDeleteBtn(function(el) {
    runSave(el, async function() { await delRec(coll, rec._id); showToast('ลบแล้ว'); closeModal(); });
  }));
  buttons.push(CANCEL_BTN);
  buttons.push({ label:'บันทึก', cls:'btn-primary', onClick: function(el) { saveRecord(el, coll, rec); } });
  openModal({ title: (rec ? 'แก้ไข' : 'เพิ่ม') + meta.title, body: body, buttons: buttons });
}

function saveRecord(btn, coll, rec) {
  var meta = COLL_META[coll];
  var out = {};
  var err = null;
  meta.fields.forEach(function(f) {
    var el = byId('r_' + f.key);
    var v = el.value.trim();
    if (f.required && !v && !err) err = 'กรุณาระบุ' + f.label;
    out[f.key] = f.type === 'number' ? (v === '' ? null : Number(v)) : v;
  });
  if (!err && coll === 'contacts' && out.taxId && !/^\d{13}$/.test(out.taxId.replace(/[\s-]/g, ''))) err = 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก';
  if (coll === 'contacts' && out.taxId) out.taxId = out.taxId.replace(/[\s-]/g, '');
  if (coll === 'accounts') out.type = subtypeBase(out.accType);
  if (!err && coll === 'accounts') {
    var dup = STORE.accounts.find(function(a) { return a.code === out.code && (!rec || a._id !== rec._id); });
    if (dup) err = 'รหัสบัญชี ' + out.code + ' ถูกใช้แล้วกับ "' + dup.name + '"';
  }
  var errEl = byId('formError');
  if (err) { errEl.textContent = err; errEl.hidden = false; return; }
  runSave(btn, async function() {
    if (rec) await setRec(coll, rec._id, Object.assign({}, strip(rec), out, { updatedAt: Date.now() }));
    else await addRec(coll, Object.assign(out, { createdAt: Date.now() }));
    showToast(meta.title + ' บันทึกแล้ว');
    closeModal();
  });
}

/* ================= Document form ================= */
var form = null;

function nextDocNo(type, date) {
  var def = DOC_TYPES[type];
  var pre = (def.prefix || 'DOC') + '-' + (date || todayStr()).slice(0,7).replace('-','') + '-';
  var used = {};
  STORE.documents.forEach(function(d) { if (d.docNo && d.docNo.indexOf(pre) === 0) { var n = parseInt(d.docNo.slice(pre.length), 10); if (n > 0) used[n] = 1; } });
  var n = 1; while (used[n]) n++;   // reuse the first free number (deleted docs); voided docs keep theirs
  return pre + String(n).padStart(3, '0');
}

function partyList(def) {
  if (def.partyList) return def.partyList;
  if (def.group === 'customer') return 'dl_customers';
  if (def.group === 'supplier') return 'dl_suppliers';
  return '';
}

function openDocForm(typeKey, doc, prefill) {
  var def = DOC_TYPES[typeKey];
  if (!def) return;
  if (def.action === 'contact') return openRecordForm('contacts', null, { kind:'supplier', entity:'company' });
  if (typeKey === 'project') { go('project', 'list'); return openDimForm('projects', null); }
  if (def.action === 'product') return openRecordForm('products', null, { kind:'goods' });
  if (def.action === 'account') return openRecordForm('accounts', null, { accType:'expense' });
  form = { type: typeKey, doc: doc || null };
  var src = doc || prefill;
  form.items = (src && def.template === 'itemized' && src.items && src.items.length) ? clone(src.items) : [{ name:'', qty:1, price:0 }];
  form.journal = (doc && def.template === 'journal' && doc.items && doc.items.length) ? clone(doc.items) : [{ account:'', debit:0, credit:0 }, { account:'', debit:0, credit:0 }];

  var d = doc || prefill || {};
  var ex = d.extra || {};
  var html = '';
  var pl = partyList(def);
  html += '<div class="field"><label for="f_party">' + esc(def.partyLabel) + ' *</label><input type="text" id="f_party" ' + (pl ? 'list="' + pl + '" ' : '') + 'value="' + esc(d.party || '') + '" placeholder="ระบุ' + esc(def.partyLabel) + '" autocomplete="off"></div>';
  html += '<div class="field-row">';
  html += '<div class="field"><label for="f_date">วันที่</label><input type="date" id="f_date" value="' + esc(d.date || todayStr()) + '"></div>';
  html += '<div class="field"><label for="f_docno">เลขที่เอกสาร</label><input type="text" id="f_docno" value="' + esc(d.docNo || '') + '" placeholder="อัตโนมัติ: ' + esc(nextDocNo(typeKey, d.date)) + '"></div>';
  html += '</div>';
  def.extra.forEach(function(f, i) {
    var fx = Object.assign({}, f, { key: String(i) });
    html += fieldHTML(fx, ex[f.key], 'fx_');
  });
  if (def.flow || ['estimate','salesOrder','purchaseOrder'].indexOf(typeKey) >= 0) html += accountFieldHTML(def.group, ex);
  if (def.group === 'customer' || def.group === 'supplier') html += '<div class="field"><label for="f_note">หมายเหตุ (แสดงในแบบฟอร์ม)</label><input id="f_note" type="text" value="' + esc(ex.note || '') + '"></div>';
  form.attachments = ((ex.attachments) || []).slice();
  if (def.group === 'customer' || def.group === 'supplier' || def.group === 'other') html += dimSelectsHTML(ex);
  if (branches().length && (def.group === 'customer' || def.group === 'supplier')) html += '<div class="field"><label for="f_branch">สาขาที่ออกเอกสาร</label><select id="f_branch">' + [branchOf('')].concat(branches()).map(function(b) { return '<option value="' + esc(b.code) + '"' + ((ex.branch || '00000') === b.code ? ' selected' : '') + '>' + esc(b.code + ' · ' + branchLabel(b)) + '</option>'; }).join('') + '</select></div>';
  html += '<div class="field"><label>ไฟล์แนบ</label><div id="attList" class="att-list"></div><label class="btn btn-outline att-add">📎 แนบไฟล์<input type="file" id="attInput" multiple hidden accept="image/*,application/pdf,.csv,.txt,.json,.md"></label><div class="small muted" id="attMsg">รูปภาพ PDF หรือไฟล์ข้อความ ไม่เกิน 20 MB ต่อไฟล์</div></div>';

  if (def.template === 'itemized') {
    html += '<div><div class="items-wrap"><table class="items-table"><thead><tr><th>รายการ</th><th style="width:70px">จำนวน</th><th style="width:100px">ราคา/หน่วย</th><th style="width:100px;text-align:right">รวม</th><th style="width:30px"></th></tr></thead><tbody id="itemsBody"></tbody></table></div>';
    html += '<button type="button" class="add-row-btn" id="addRowBtn">+ เพิ่มรายการ</button>' + (def.billing ? ' <button type="button" class="add-row-btn" id="pullInv">ดึงใบแจ้งหนี้ค้างชำระของลูกค้า</button>' : '') + '</div>';
  } else if (def.template === 'journal') {
    if (!STORE.accounts.length) html += '<div class="banner info">ยังไม่มีผังบัญชี ไปที่ การบัญชี → ผังบัญชี เพื่อใช้ผังบัญชีมาตรฐาน หรือพิมพ์ชื่อบัญชีเองได้</div>';
    html += '<div><div class="items-wrap"><table class="items-table"><thead><tr><th>บัญชี</th><th style="width:110px">เดบิต</th><th style="width:110px">เครดิต</th><th style="width:30px"></th></tr></thead><tbody id="itemsBody"></tbody></table></div>';
    html += '<button type="button" class="add-row-btn" id="addRowBtn">+ เพิ่มบรรทัด</button></div>';
  } else if (def.template === 'simple') {
    html += '<div class="field"><label for="f_amount">จำนวนเงิน (บาท)</label><input type="number" step="any" id="f_amount" value="' + (d.base != null ? esc(d.base) : (d.total ? esc(d.total) : '')) + '" placeholder="0.00"></div>';
  }
  if (def.vat) {
    html += '<div class="field-row">';
    html += '<div class="field"><label for="f_vat">ภาษีมูลค่าเพิ่ม</label><select id="f_vat">' +
      [['none','ไม่มี VAT'],['exclusive','VAT 7% แยกนอก'],['inclusive','VAT 7% รวมในราคา']].map(function(o) {
        return '<option value="' + o[0] + '"' + ((d.vatMode || 'none') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select></div>';
    if (def.wht) {
      html += '<div class="field"><label for="f_wht">' + (def.group === 'customer' ? 'ลูกค้าหัก ณ ที่จ่าย' : 'หัก ณ ที่จ่าย') + '</label><select id="f_wht">' +
        WHT_RATES.map(function(r) { return '<option value="' + r + '"' + (Number(d.whtRate || 0) === r ? ' selected' : '') + '>' + (r ? r + '%' : 'ไม่หัก') + '</option>'; }).join('') + '</select></div>';
    } else html += '<div></div>';
    html += '</div>';
    if (typeKey === 'invoice' || typeKey === 'bill') {
      var tpDef = d.taxPoint || (isServiceAcc(ex.account || '') ? 'payment' : 'invoice');
      html += '<div class="field"><label for="f_taxpoint">จุดความรับผิดภาษี (VAT)</label><select id="f_taxpoint">' +
        [['invoice', typeKey === 'invoice' ? 'ขายสินค้า · รับรู้ VAT วันที่ออกใบแจ้งหนี้' : 'ซื้อสินค้า · รับรู้ภาษีซื้อวันที่ในบิล'], ['payment', typeKey === 'invoice' ? 'ค่าบริการ · รับรู้ VAT วันที่ได้รับชำระ' : 'ค่าบริการ · รับรู้ภาษีซื้อวันที่จ่ายชำระ']].map(function(o) { return '<option value="' + o[0] + '"' + (tpDef === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>';
    }
  }
  if (def.template !== 'record') html += '<div class="sum-block" id="sumBlock"></div>';
  html += '<div class="form-error" id="formError" hidden></div>';

  var buttons = [CANCEL_BTN, { label: doc ? 'บันทึกการแก้ไข' : 'บันทึก', cls:'btn-primary', onClick: saveDoc }];
  openModal({ title: (doc ? 'แก้ไข' + def.label + ' ' + (doc.docNo || '') : def.label), body: html, buttons: buttons, onMount: function() { renderAttList();
    if (typeKey === 'receipt') {
      var ri = def.extra.findIndex(function(f) { return f.key === 'refDoc'; }), rEl = byId('fx_' + ri);
      if (rEl) rEl.addEventListener('change', function() {
        var inv = STORE.documents.find(function(x) { return x.type === 'invoice' && x.docNo === rEl.value.trim(); });
        if (!inv) return;
        if (!byId('f_party').value) byId('f_party').value = inv.party;
        var acc = byId('f_acc'); if (acc && inv.extra && inv.extra.account && !acc.value) acc.value = inv.extra.account;
        var vs = byId('f_vat'); if (vs && inv.vat) vs.value = 'inclusive';
        var am = byId('f_amount'); if (am && !Number(am.value)) am.value = round2(docBal(inv) + (Number(inv.wht) || 0));
        updateSummary();
      });
    }
    var accSel = byId('f_acc'), tpSel = byId('f_taxpoint');
    if (accSel && tpSel && !doc) accSel.addEventListener('change', function() { tpSel.value = isServiceAcc(accSel.value) ? 'payment' : 'invoice'; });
    if (def.billing) byId('pullInv').addEventListener('click', function() {
      var party = byId('f_party').value.trim();
      var inv = STORE.documents.filter(function(x) { return x.type === 'invoice' && x.party === party && docBal(x) > 0.009; });
      if (!party) { showToast('ระบุลูกค้าก่อน'); return; }
      if (!inv.length) { showToast('ลูกค้านี้ไม่มีใบแจ้งหนี้ค้างชำระ'); return; }
      form.items = inv.map(function(x) { return { name: x.docNo, date: x.date, due: (x.extra && x.extra.dueDate) || x.date, ref: x._id, qty:1, price: docBal(x) }; });
      renderItemRows();
    });
    if (def.template === 'itemized') { renderItemRows(); byId('addRowBtn').addEventListener('click', function() { form.items.push({ name:'', qty:1, price:0 }); renderItemRows(); }); }
    if (def.template === 'journal') { renderJournalRows(); byId('addRowBtn').addEventListener('click', function() { form.journal.push({ account:'', debit:0, credit:0 }); renderJournalRows(); }); }
    ['f_amount','f_vat','f_wht'].forEach(function(id) { var el = byId(id); if (el) el.addEventListener('input', updateSummary); });
    byId('f_date').addEventListener('change', function() { byId('f_docno').placeholder = 'อัตโนมัติ: ' + nextDocNo(typeKey, byId('f_date').value); });
    updateSummary();
  } });
}

function renderItemRows() {
  var body = byId('itemsBody');
  body.innerHTML = form.items.map(function(r, i) {
    return '<tr><td><input type="text" list="dl_products" value="' + esc(r.name) + '" data-idx="' + i + '" data-f="name" aria-label="รายการ"></td>' +
      '<td><input type="number" step="any" value="' + esc(r.qty) + '" data-idx="' + i + '" data-f="qty" min="0" aria-label="จำนวน"></td>' +
      '<td><input type="number" step="any" value="' + esc(r.price) + '" data-idx="' + i + '" data-f="price" min="0" aria-label="ราคาต่อหน่วย"></td>' +
      '<td class="amt" data-amt="' + i + '">' + fmtMoney(r.qty * r.price) + '</td>' +
      '<td><button type="button" class="item-remove" data-idx="' + i + '" aria-label="ลบรายการ">✕</button></td></tr>';
  }).join('');
  body.querySelectorAll('input').forEach(function(inp) {
    inp.addEventListener('input', function() {
      var i = Number(inp.dataset.idx), f = inp.dataset.f;
      form.items[i][f] = f === 'name' ? inp.value : Number(inp.value) || 0;
      if (f === 'name') {
        var p = STORE.products.find(function(p) { return p.name === inp.value; });
        if (p && p.price != null && !form.items[i].price) {
          form.items[i].price = Number(p.price) || 0;
          inp.closest('tr').querySelector('[data-f="price"]').value = form.items[i].price;
        }
      }
      var cell = body.querySelector('[data-amt="' + i + '"]');
      if (cell) cell.textContent = fmtMoney(form.items[i].qty * form.items[i].price);
      updateSummary();
    });
  });
  body.querySelectorAll('.item-remove').forEach(function(b) {
    b.addEventListener('click', function() {
      form.items.splice(Number(b.dataset.idx), 1);
      if (!form.items.length) form.items.push({ name:'', qty:1, price:0 });
      renderItemRows();
    });
  });
  updateSummary();
}

function accountOptions(selected) {
  var has = false;
  var html = '<option value="">— เลือกบัญชี —</option>' + ACCOUNT_TYPES.map(function(t) {
    var accs = STORE.accounts.filter(function(a) { return a.type === t.key; });
    if (!accs.length) return '';
    return '<optgroup label="' + t.label + '">' + accs.map(function(a) {
      var sel = a.code === selected; if (sel) has = true;
      return '<option value="' + esc(a.code) + '"' + (sel ? ' selected' : '') + '>' + esc(a.code + ' ' + a.name) + '</option>';
    }).join('') + '</optgroup>';
  }).join('');
  if (selected && !has) html += '<option value="' + esc(selected) + '" selected>' + esc(selected) + '</option>';
  return html;
}

function renderJournalRows() {
  var body = byId('itemsBody');
  var useSelect = STORE.accounts.length > 0;
  body.innerHTML = form.journal.map(function(r, i) {
    var acc = useSelect
      ? '<select data-idx="' + i + '" data-f="account" aria-label="บัญชี">' + accountOptions(r.account) + '</select>'
      : '<input type="text" value="' + esc(r.account) + '" data-idx="' + i + '" data-f="account" aria-label="บัญชี" placeholder="เช่น 1110 เงินสด">';
    return '<tr><td>' + acc + '</td>' +
      '<td><input type="number" step="any" value="' + esc(r.debit || '') + '" data-idx="' + i + '" data-f="debit" min="0" aria-label="เดบิต"></td>' +
      '<td><input type="number" step="any" value="' + esc(r.credit || '') + '" data-idx="' + i + '" data-f="credit" min="0" aria-label="เครดิต"></td>' +
      '<td><button type="button" class="item-remove" data-idx="' + i + '" aria-label="ลบบรรทัด">✕</button></td></tr>';
  }).join('');
  body.querySelectorAll('input, select').forEach(function(inp) {
    inp.addEventListener('input', function() {
      var i = Number(inp.dataset.idx), f = inp.dataset.f;
      form.journal[i][f] = f === 'account' ? inp.value : Number(inp.value) || 0;
      updateSummary();
    });
  });
  body.querySelectorAll('.item-remove').forEach(function(b) {
    b.addEventListener('click', function() {
      form.journal.splice(Number(b.dataset.idx), 1);
      if (!form.journal.length) form.journal.push({ account:'', debit:0, credit:0 });
      renderJournalRows();
    });
  });
  updateSummary();
}

function computeTotals() {
  var def = DOC_TYPES[form.type];
  var base = 0;
  if (def.template === 'itemized') base = form.items.reduce(function(s, r) { return s + (Number(r.qty) || 0) * (Number(r.price) || 0); }, 0);
  else if (def.template === 'simple') base = Number((byId('f_amount') || {}).value) || 0;
  var mode = def.vat ? byId('f_vat').value : 'none';
  var whtRate = def.wht ? Number(byId('f_wht').value) || 0 : 0;
  var subtotal = base, vat = 0;
  if (mode === 'exclusive') vat = base * VAT_RATE;
  else if (mode === 'inclusive') { subtotal = base / (1 + VAT_RATE); vat = base - subtotal; }
  subtotal = round2(subtotal); vat = round2(vat);
  var total = round2(subtotal + vat);
  var wht = round2(subtotal * whtRate / 100);
  return { base: round2(base), vatMode: mode, whtRate: whtRate, subtotal: subtotal, vat: vat, total: total, wht: wht, net: round2(total - wht) };
}

function updateSummary() {
  var el = byId('sumBlock');
  if (!el || !form) return;
  var def = DOC_TYPES[form.type];
  if (def.template === 'journal') {
    var dr = round2(form.journal.reduce(function(s, r) { return s + (Number(r.debit) || 0); }, 0));
    var cr = round2(form.journal.reduce(function(s, r) { return s + (Number(r.credit) || 0); }, 0));
    var ok = dr === cr && dr > 0;
    el.innerHTML = '<div class="sum-line"><span>รวมเดบิต</span><span>' + fmtMoney(dr) + '</span></div>' +
      '<div class="sum-line"><span>รวมเครดิต</span><span>' + fmtMoney(cr) + '</span></div>' +
      '<div class="sum-line ' + (ok ? 'bal-ok' : 'bal-bad') + '"><span>' + (ok ? '✓ สมดุล' : 'ยังไม่สมดุล ต่างกัน') + '</span><span>' + (ok ? '' : fmtMoney(Math.abs(dr - cr))) + '</span></div>';
    return;
  }
  var t = computeTotals();
  var h = '';
  if (def.vat && t.vatMode !== 'none') {
    h += '<div class="sum-line"><span>มูลค่าก่อนภาษี</span><span>' + fmtMoney(t.subtotal) + '</span></div>';
    h += '<div class="sum-line"><span>ภาษีมูลค่าเพิ่ม 7%</span><span>' + fmtMoney(t.vat) + '</span></div>';
  }
  h += '<div class="sum-line big"><span>รวมทั้งสิ้น</span><span>' + fmtMoney(t.total) + '</span></div>';
  if (t.wht) {
    h += '<div class="sum-line"><span>หัก ณ ที่จ่าย ' + t.whtRate + '% (จากมูลค่าก่อน VAT)</span><span>−' + fmtMoney(t.wht) + '</span></div>';
    h += '<div class="sum-line big"><span>' + (def.group === 'customer' ? 'ยอดรับสุทธิ' : 'ยอดจ่ายสุทธิ') + '</span><span>' + fmtMoney(t.net) + '</span></div>';
  }
  el.innerHTML = h;
}

async function saveDoc(btn) {
  var def = DOC_TYPES[form.type];
  var errEl = byId('formError');
  function fail(msg) { errEl.textContent = msg; errEl.hidden = false; }
  var party = byId('f_party').value.trim();
  if (!party) return fail('กรุณาระบุ' + def.partyLabel);
  var date = byId('f_date').value || todayStr();
  var _lk = (typeof lockDate === 'function') ? lockDate() : '';
  if (_lk && (date <= _lk || (form.doc && (form.doc.date || '') <= _lk))) return fail('งวดบัญชีถึงวันที่ ' + fmtDateNum(_lk) + ' ถูกล็อกแล้ว ปลดล็อกได้ที่ การบัญชี → ปิดงบรายเดือน');
  var extra = {};
  def.extra.forEach(function(f, i) {
    var el = byId('fx_' + i);
    extra[f.key] = el ? (f.type === 'number' ? (el.value === '' ? null : Number(el.value)) : el.value.trim()) : '';
  });
  var noteEl = byId('f_note'); if (noteEl) extra.note = noteEl.value.trim();
  extra.attachments = (form.attachments || []).slice();
  ['f_project:project','f_dept:dept'].forEach(function(k) { var q = k.split(':'), el = byId(q[0]); if (el) { if (el.value) extra[q[1]] = el.value; } else if (form.doc && form.doc.extra && form.doc.extra[q[1]]) extra[q[1]] = form.doc.extra[q[1]]; });
  var brEl = byId('f_branch'); if (brEl) extra.branch = brEl.value === '00000' ? '' : brEl.value; else if (form.doc && form.doc.extra && form.doc.extra.branch) extra.branch = form.doc.extra.branch;
  var accEl = byId('f_acc');
  if (accEl) {
    var av = accEl.value.trim(), aa = STORE.accounts.find(function(a) { return a.code === av; });
    extra.account = aa ? aa.code : '';
    if (def.group === 'customer') extra.incomeCat = aa ? aa.name : av; else extra.expCategory = aa ? aa.name : av;
  }
  var rec = { type: form.type, typeLabel: def.label, group: def.group, party: party, date: date, extra: extra };
  var contact = STORE.contacts.find(function(c) { return c.name === party; });
  rec.contactId = contact ? contact._id : null;

  if (def.template === 'journal') {
    var lines = form.journal.filter(function(r) { return r.account && ((Number(r.debit) || 0) || (Number(r.credit) || 0)); });
    var dr = round2(lines.reduce(function(s, r) { return s + (Number(r.debit) || 0); }, 0));
    var cr = round2(lines.reduce(function(s, r) { return s + (Number(r.credit) || 0); }, 0));
    if (lines.length < 2) return fail('ต้องมีอย่างน้อย 2 บรรทัดที่ระบุบัญชีและจำนวนเงิน');
    if (dr !== cr) return fail('ยอดเดบิตและเครดิตต้องเท่ากัน (ต่างกัน ' + fmtMoney(Math.abs(dr - cr)) + ')');
    rec.items = lines.map(function(r) {
      var a = STORE.accounts.find(function(a) { return a.code === r.account; });
      return { account: r.account, accountName: a ? a.name : '', debit: Number(r.debit) || 0, credit: Number(r.credit) || 0 };
    });
    rec.total = dr; rec.subtotal = dr; rec.net = dr;
  } else if (def.template === 'record') {
    rec.items = null;
    rec.total = extra.budget != null && def.group === 'project' ? Number(extra.budget) || 0 : 0;
  } else {
    var t = computeTotals();
    if (def.template === 'itemized') {
      rec.items = form.items.filter(function(r) { return r.name; }).map(function(r) { var o = { name: r.name, qty: Number(r.qty) || 0, price: Number(r.price) || 0 }; if (r.date) o.date = r.date; if (r.due) o.due = r.due; if (r.ref) o.ref = r.ref; return o; });
      if (!rec.items.length) return fail('กรุณาเพิ่มอย่างน้อย 1 รายการ');
    } else rec.items = null;
    if (t.base <= 0) return fail('กรุณาระบุจำนวนเงินมากกว่า 0');
    Object.assign(rec, t);
    var tpEl = byId('f_taxpoint'); if (tpEl) rec.taxPoint = rec.vat ? tpEl.value : 'invoice';
  }
  rec.docNo = byId('f_docno').value.trim() || nextDocNo(form.type, date);
  var dupe = STORE.documents.find(function(d) { return d.docNo === rec.docNo && (!form.doc || d._id !== form.doc._id); });
  if (dupe) return fail('เลขที่เอกสาร ' + rec.docNo + ' ถูกใช้แล้ว');
  errEl.hidden = true;

  var editing = form.doc;
  runSave(btn, async function() {
    if (editing) {
      await setRec('documents', editing._id, Object.assign({}, strip(editing), rec, { updatedAt: Date.now() }));
      showToast(def.label + ' ' + rec.docNo + ' แก้ไขแล้ว');
    } else {
      rec.status = def.status ? 'unpaid' : 'done';
      rec.createdAt = Date.now();
      var linkInv = form.type === 'receipt' && rec.extra.refDoc ? STORE.documents.find(function(x) { return x.type === 'invoice' && x.docNo === rec.extra.refDoc; }) : null;
      if (linkInv) {
        var covered = round2((rec.net != null ? rec.net : rec.total) + (Number(rec.wht) || 0) - (Number(linkInv.wht) ? 0 : 0));
        if (covered > docBal(linkInv) + 0.01) throw { code:'_', message:'x' , _msg:'ยอดใบเสร็จ ' + fmtMoney(covered) + ' เกินยอดคงค้างของ ' + linkInv.docNo + ' (' + fmtMoney(docBal(linkInv)) + ')' };
        rec.extra.invoiceId = linkInv._id;
        if (!rec.extra.account && linkInv.extra) { rec.extra.account = linkInv.extra.account || ''; rec.extra.incomeCat = linkInv.extra.incomeCat || rec.extra.incomeCat || ''; }
      }
      var newId = await addRec('documents', rec);
      if (linkInv) {
        var p = { date: rec.date, method: rec.extra.method || 'เงินสด', amount: round2(rec.net != null ? rec.net : rec.total), wht: Number(rec.wht) || 0, fee: 0, ref: rec.docNo, receiptId: newId, createdAt: Date.now() };
        await applyPayment(linkInv, p);
        showToast('ออกใบเสร็จ ' + rec.docNo + ' และตัดชำระ ' + linkInv.docNo + ' แล้ว');
      } else showToast(def.label + ' ' + rec.docNo + ' บันทึกแล้ว');
    }
    closeModal();
  });
}

/* ================= Document detail ================= */
function openDocDetail(id) {
  window._detailId = id;
  var d = findDoc(id);
  if (!d) return;
  var def = DOC_TYPES[d.type] || { label: d.typeLabel || 'เอกสาร', extra:[], partyLabel:'คู่ค้า' };
  var ex = d.extra || {};
  var h = (d.voided ? '<div class="banner bad">เอกสารนี้ถูกยกเลิกแล้ว' + (d.voidReason ? ' · เหตุผล: ' + esc(d.voidReason) : '') + (d.voidedAt ? ' · เมื่อ ' + new Date(d.voidedAt).toLocaleDateString('th-TH') : '') + ' — ไม่ลงบัญชีและภาษี</div>' : '') + '<div class="kv">' +
    '<div><span>เลขที่</span><b class="num">' + esc(d.docNo || '-') + '</b></div>' +
    '<div><span>วันที่</span>' + fmtDate(d.date) + '</div>' +
    '<div><span>' + esc(def.partyLabel) + '</span>' + esc(d.party || '-') + '</div>' +
    (def.status ? '<div><span>สถานะ</span>' + statusPill(d) + (d.paidDate ? ' <span class="small muted">' + fmtDate(d.paidDate) + '</span>' : '') + '</div>' : '');
  (def.extra || []).forEach(function(f) {
    var v = ex[f.key];
    if (v == null || v === '') return;
    h += '<div><span>' + esc(f.label) + '</span>' + (f.type === 'date' ? fmtDate(v) : f.type === 'number' ? fmtNum(v) : esc(v)) + '</div>';
  });
  if (ex.account || ex.expCategory || ex.incomeCat) h += '<div><span>บัญชี</span>' + esc((ex.account ? ex.account + ' ' : '') + (ex.expCategory || ex.incomeCat || '')) + '</div>';
  if (ex.attachments && ex.attachments.length) h += '<div><span>ไฟล์แนบ</span>' + attLinksHTML(ex.attachments) + '</div>';
  h += '</div>';
  var __pl = postingsOf(d);
  if (d.items && d.items.length) {
    if (def.template === 'journal') {
      h += '<div class="items-wrap"><table class="data-table"><thead><tr><th>บัญชี</th><th class="r">เดบิต</th><th class="r">เครดิต</th></tr></thead><tbody>' +
        d.items.map(function(r) { return '<tr><td>' + esc(r.account) + ' ' + esc(r.accountName || '') + '</td><td class="r">' + (r.debit ? fmtMoney(r.debit) : '') + '</td><td class="r">' + (r.credit ? fmtMoney(r.credit) : '') + '</td></tr>'; }).join('') +
        '</tbody></table></div>';
    } else {
      h += '<div class="items-wrap"><table class="data-table"><thead><tr><th>รายการ</th><th class="r">จำนวน</th><th class="r">ราคา/หน่วย</th><th class="r">รวม</th></tr></thead><tbody>' +
        d.items.map(function(r) { return '<tr><td>' + esc(r.name) + '</td><td class="r">' + fmtNum(r.qty) + '</td><td class="r">' + fmtMoney(r.price) + '</td><td class="r">' + fmtMoney(r.qty * r.price) + '</td></tr>'; }).join('') +
        '</tbody></table></div>';
    }
  }
  if (def.template !== 'record' && def.template !== 'journal') {
    h += '<div class="sum-block">';
    if (d.vat) h += '<div class="sum-line"><span>มูลค่าก่อนภาษี</span><span>' + fmtMoney(d.subtotal) + '</span></div><div class="sum-line"><span>ภาษีมูลค่าเพิ่ม 7%</span><span>' + fmtMoney(d.vat) + '</span></div>';
    h += '<div class="sum-line big"><span>รวมทั้งสิ้น</span><span>' + fmtMoney(d.total) + '</span></div>';
    if (d.wht) h += '<div class="sum-line"><span>หัก ณ ที่จ่าย ' + esc(d.whtRate) + '%</span><span>−' + fmtMoney(d.wht) + '</span></div><div class="sum-line big"><span>ยอดสุทธิ</span><span>' + fmtMoney(d.net) + '</span></div>';
    h += '</div>';
  }
  if (def.status && def.flow && !d.voided) h += paymentHistoryHTML(d);
  if (__pl.length && d.type !== 'journalEntry') h += '<details class="table-view"><summary>การลงบัญชี (' + __pl.length + ' บรรทัด)</summary><div class="items-wrap"><table class="data-table"><thead><tr><th>วันที่</th><th>บัญชี</th><th class="r">เดบิต</th><th class="r">เครดิต</th></tr></thead><tbody>' + __pl.map(function(l) { return '<tr><td class="num">' + fmtDateNum(l.date) + '</td><td><span class="num">' + esc(l.code) + '</span> ' + esc(acctName(l.code)) + (l.memo ? ' <span class="small muted">' + esc(l.memo) + '</span>' : '') + '</td><td class="r">' + (l.dr ? fmtMoney(l.dr) : '') + '</td><td class="r">' + (l.cr ? fmtMoney(l.cr) : '') + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
  var buttons = [confirmDeleteBtn(function(el) {
    runSave(el, async function() {
      await delRec('documents', d._id);
      var inv = d.extra && d.extra.invoiceId && findDoc(d.extra.invoiceId);
      if (inv) { var pays = (inv.payments || []).filter(function(p) { return p.receiptId !== d._id; }); var u = Object.assign({}, strip(inv), { payments: pays, updatedAt: Date.now() }); u.status = pays.length && docBal(Object.assign({}, u, { status:'unpaid' })) <= 0.009 ? 'paid' : 'unpaid'; await setRec('documents', inv._id, u); }
      showToast('ลบ ' + (d.docNo || 'เอกสาร') + ' แล้ว' + (inv ? ' และยกเลิกการรับชำระใน ' + inv.docNo : '')); closeModal();
    });
  })];
  if (DOC_TYPES[d.type] && !DOC_TYPES[d.type].action) {
    if (d.voided) buttons.push({ label:'กู้คืนเอกสาร', onClick: function(el) { runSave(el, async function() { var u = Object.assign({}, strip(d), { updatedAt: Date.now() }); delete u.voided; delete u.voidReason; delete u.voidedAt; await setRec('documents', d._id, u); showToast('กู้คืน ' + d.docNo + ' แล้ว'); closeModal(); }); } });
    else buttons.push({ label:'ยกเลิกเอกสาร', onClick: function() { openVoidDoc(d); } });
  }
  if (def.status && def.flow && !d.voided) {
    if (docBal(d) > 0.009) buttons.push({ label: d.group === 'customer' ? 'รับชำระเงิน' : 'บันทึกจ่ายชำระ', cls:'btn-primary', onClick: function() { openPayment(d); } });
    else if (d.status === 'paid') buttons.push({ label:'ย้อนเป็นค้างชำระ', onClick: function(el) { runSave(el, async function() { await setRec('documents', d._id, Object.assign({}, strip(d), { status:'unpaid', paidDate:null, payments:[], updatedAt: Date.now() })); showToast('เปลี่ยนเป็นค้างชำระแล้ว'); closeModal(); }); } });
  } else if (def.status) {
    var paid = d.status === 'paid';
    buttons.push({ label: def.proj ? (paid ? 'เปิดโครงการอีกครั้ง' : 'ทำเครื่องหมายว่าเสร็จแล้ว') : (paid ? 'เปิดคำสั่งอีกครั้ง' : 'ปิดคำสั่ง'), cls: paid ? '' : 'btn-primary', onClick: function(el) {
      runSave(el, async function() {
        await setRec('documents', d._id, Object.assign({}, strip(d), { status: paid ? 'unpaid' : 'paid', paidDate: paid ? null : todayStr(), updatedAt: Date.now() }));
        showToast(paid ? 'เปิดอีกครั้งแล้ว' : 'ปิดแล้ว'); closeModal();
      });
    } });
  }
  var conv = { estimate:[['salesOrder','แปลงเป็นใบสั่งขาย'],['invoice','แปลงเป็นใบแจ้งหนี้']], salesOrder:[['invoice','ออกใบแจ้งหนี้']], invoice:[['receipt','ออกใบเสร็จรับเงิน'],['creditNote','ออกใบลดหนี้'],['billingNote','ออกใบวางบิล']], receipt:[['refundReceipt','ออกใบเสร็จการคืนเงิน']] }[d.type] || [];
  if (conv.length) buttons.push({ label:'สร้างต่อ ▾', onClick: function(el) { convMenu(el, d, conv); } });
  if (d.group === 'supplier' && typeof certsForDoc === 'function') certsForDoc(d).forEach(function(c) { buttons.push({ label:'50 ทวิ' + (d.payments && d.payments.length > 1 ? ' ' + fmtDateNum(c.date) : ''), onClick: function() { openWhtCert(c); } }); });
  if (d.group === 'customer' || d.group === 'supplier') { buttons.push({ label:'🖨 พิมพ์', onClick: function() { openPrintViewer(d); } }); }
  if (DOC_TYPES[d.type] && !DOC_TYPES[d.type].action) buttons.push({ label:'แก้ไข', onClick: function() { openDocForm(d.type, d); } });
  buttons.push({ label:'ปิด', onClick: closeModal });
  openModal({ title: def.label + (d.docNo ? ' ' + d.docNo : ''), body: h, buttons: buttons, focus: false });
}

/* ================= Menu ================= */
function buildMenu() {
  GROUP_ORDER.forEach(function(g) {
    var c = document.querySelector('#menuOverlay [data-group="' + g + '"]');
    Object.keys(DOC_TYPES).forEach(function(key) {
      var def = DOC_TYPES[key];
      if (def.group !== g) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = def.label;
      btn.addEventListener('click', function() { closeMenu(); openDocForm(key); });
      c.appendChild(btn);
    });
  });
}

/* ================= Account category & payments ================= */
function accountsFor(group) {
  var want = group === 'customer' ? ['income'] : ['expense'];
  return STORE.accounts.filter(function(a) { return want.indexOf(subtypeBase(accSubtype(a))) >= 0; }).sort(function(a, b) { return String(a.code).localeCompare(String(b.code)); });
}
function accountFieldHTML(group, ex) {
  var list = accountsFor(group), cur = ex.account || '', curName = group === 'customer' ? ex.incomeCat : ex.expCategory;
  var label = group === 'customer' ? 'บัญชีรายได้ (หมวดหมู่)' : 'บัญชีค่าใช้จ่าย (หมวดหมู่)';
  if (!list.length) return '<div class="field"><label for="f_acc">' + label + '</label><input id="f_acc" list="dl_expcat" value="' + esc(curName || '') + '" placeholder="พิมพ์หมวดหมู่"><div class="small muted" style="margin-top:4px">ยังไม่มีผังบัญชี เพิ่มที่ การบัญชี → ผังบัญชี เพื่อเลือกเป็นเลขบัญชี</div></div>';
  if (!cur && curName) { var m = list.find(function(a) { return a.name === curName; }); if (m) cur = m.code; }
  var groups = {};
  list.forEach(function(a) { var k = subtypeLabel(accSubtype(a)); (groups[k] = groups[k] || []).push(a); });
  return '<div class="field"><label for="f_acc">' + label + '</label><select id="f_acc"><option value="">— เลือกบัญชี —</option>' +
    Object.keys(groups).map(function(k) { return '<optgroup label="' + esc(k) + '">' + groups[k].map(function(a) { return '<option value="' + esc(a.code) + '"' + (a.code === cur ? ' selected' : '') + '>' + esc(a.code + ' ' + a.name) + '</option>'; }).join('') + '</optgroup>'; }).join('') + '</select></div>';
}
function bankAccounts() { return STORE.accounts.filter(function(a) { return accSubtype(a) === 'bank'; }).sort(function(a, b) { return String(a.code).localeCompare(String(b.code)); }); }
function paymentHistoryHTML(d) {
  window._payDoc = d;
  var pays = d.payments || [], cust = d.group === 'customer';
  var h = '<div class="pay-box"><div class="pay-sum"><div><span>ยอดตามเอกสาร</span><b>' + fmtMoney(docNet(d)) + '</b></div><div><span>' + (cust ? 'รับชำระแล้ว' : 'จ่ายแล้ว') + '</span><b>' + fmtMoney(docPaidAmt(d) || (d.status === 'paid' ? docNet(d) : 0)) + '</b></div><div><span>คงค้าง</span><b class="' + (docBal(d) > 0 ? 'neg-text' : '') + '">' + fmtMoney(docBal(d)) + '</b></div></div>';
  if (pays.length) {
    h += '<div class="items-wrap"><table class="data-table"><thead><tr><th>วันที่</th><th>วิธี</th><th>บัญชี / อ้างอิง</th><th class="r">จำนวนเงิน</th><th class="r">หัก ณ ที่จ่าย</th><th class="r">ค่าธรรมเนียม</th><th></th></tr></thead><tbody>' +
      pays.map(function(p, i) {
        var ref = [p.bankAcc ? p.bankAcc + ' ' + accName(p.bankAcc) : '', p.ref ? 'อ้างอิง ' + p.ref : '', p.chequeBank ? p.chequeBank : '', p.chequeDate ? 'ลงวันที่ ' + fmtDateNum(p.chequeDate) : ''].filter(Boolean).join(' · ');
        return '<tr><td class="num">' + fmtDateNum(p.date) + '</td><td>' + esc(p.method) + '</td><td class="small">' + esc(ref || '-') + (p.note ? '<div class="muted">' + esc(p.note) + '</div>' : '') + '</td><td class="r">' + fmtMoney(p.amount) + '</td><td class="r">' + (p.wht ? fmtMoney(p.wht) : '-') + '</td><td class="r">' + (p.fee ? fmtMoney(p.fee) : '-') + '</td>' +
          '<td style="white-space:nowrap">' + (!cust && Number(p.wht) > 0 ? '<button type="button" class="linkish" data-wtpay="' + i + '">50 ทวิ</button> ' : '') + '<button type="button" class="item-remove" data-delpay="' + i + '" aria-label="ลบรายการชำระ">✕</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  } else if (d.status !== 'paid') h += '<p class="small muted" style="margin:6px 0 0">ยังไม่มีการ' + (cust ? 'รับชำระ' : 'จ่ายชำระ') + '</p>';
  return h + '</div>';
}
document.addEventListener('click', function(e) {
  var wb = e.target.closest('[data-wtpay]'); if (wb && overlay.classList.contains('open') && window._payDoc) { var cc = whtCerts().find(function(x) { return x.d._id === window._payDoc._id && x.idx === Number(wb.dataset.wtpay); }); if (cc) openWhtCert(cc); return; }
  var b = e.target.closest('[data-delpay]'); if (!b || !overlay.classList.contains('open')) return;
  if (!b.classList.contains('arm')) { b.classList.add('arm'); b.textContent = 'ยืนยัน?'; b.style.color = 'var(--danger)'; return; }
  var d = findDoc(window._detailId);
  if (!d) return;
  var pays = d.payments.slice(); var removed = pays.splice(Number(b.dataset.delpay), 1)[0];
  runSave(b, async function() {
    var upd = Object.assign({}, strip(d), { payments: pays, updatedAt: Date.now() });
    upd.status = docBal(Object.assign({}, upd, { status:'unpaid' })) <= 0.009 && pays.length ? 'paid' : 'unpaid';
    await setRec('documents', d._id, upd);
    if (removed && removed.receiptId && findDoc(removed.receiptId)) await delRec('documents', removed.receiptId);
    showToast('ลบรายการชำระแล้ว' + (removed && removed.receiptId ? ' และลบใบเสร็จที่ผูกไว้' : '')); openDocDetail(d._id);
  });
});
function openPayment(d) {
  var cust = d.group === 'customer', bal = docBal(d), banks = bankAccounts();
  var whtAlready = Number(d.wht) || 0, whtDef = whtAlready && docNet(d) ? round2(whtAlready * bal / docNet(d)) : 0;
  var body = '<div class="pay-sum" style="margin-bottom:4px"><div><span>' + esc(d.typeLabel) + ' ' + esc(d.docNo || '') + '</span><b>' + esc(d.party) + '</b></div><div><span>ยอดตามเอกสาร</span><b>' + fmtMoney(docNet(d)) + '</b></div><div><span>คงค้าง</span><b class="neg-text">' + fmtMoney(bal) + '</b></div></div>' +
    '<div class="field-row"><div class="field"><label for="p_date">วันที่' + (cust ? 'รับชำระ' : 'จ่ายชำระ') + '</label><input id="p_date" type="date" value="' + todayStr() + '"></div>' +
    '<div class="field"><label for="p_method">วิธีการชำระเงิน</label><select id="p_method">' + PAYMENT_METHODS.map(function(m) { return '<option>' + m + '</option>'; }).join('') + '</select></div></div>' +
    '<div class="field"><label for="p_bank">' + (cust ? 'ฝากเข้าบัญชี' : 'จ่ายจากบัญชี') + '</label>' + (banks.length ? '<select id="p_bank">' + banks.map(function(a) { return '<option value="' + esc(a.code) + '">' + esc(a.code + ' ' + a.name) + '</option>'; }).join('') + '</select>' : '<input id="p_bank" placeholder="เช่น กสิกรไทย 123-4-56789-0">') + '</div>' +
    '<div class="field-row"><div class="field"><label for="p_amount">จำนวนเงินที่' + (cust ? 'ได้รับ' : 'จ่าย') + '</label><input id="p_amount" type="number" step="any" value="' + round2(bal - whtDef) + '"></div>' +
    '<div class="field"><label for="p_ref">เลขที่อ้างอิง / เลขที่เช็ค</label><input id="p_ref" placeholder="เลขที่โอน, เลขที่เช็ค"></div></div>' +
    '<div class="field-row" id="p_chq" hidden><div class="field"><label for="p_cbank">ธนาคารของเช็ค</label><input id="p_cbank"></div><div class="field"><label for="p_cdate">เช็คลงวันที่</label><input id="p_cdate" type="date"></div></div>' +
    '<div class="field-row"><div class="field"><label for="p_wht">' + (cust ? 'ลูกค้าหัก ณ ที่จ่าย' : 'หัก ณ ที่จ่าย') + (whtAlready ? ' (ตามเอกสาร ' + (Number(d.whtRate) || '') + '% = ' + fmtMoney(whtAlready) + ')' : '') + '</label><div class="pay-wht"><input id="p_wht" type="number" step="any" value="' + whtDef + '">' + [1,2,3,5].map(function(r) { return '<button type="button" class="chip-btn" data-whtr="' + r + '">' + r + '%</button>'; }).join('') + '</div></div>' +
    '<div class="field"><label for="p_fee">ค่าธรรมเนียมธนาคาร</label><input id="p_fee" type="number" step="any" value="0"></div></div>' +
    '<div class="field"><label for="p_note">หมายเหตุ</label><input id="p_note"></div>' +
    (cust ? '<label class="se-chk"><input type="checkbox" id="p_rcpt" checked> ออกใบเสร็จรับเงินให้อัตโนมัติ (เลขที่ ' + esc(nextDocNo('receipt', todayStr())) + ')</label>' : '') +
    '<div class="sum-block" id="p_sum"></div><div class="form-error" id="formError" hidden></div>';
  openModal({ title: (cust ? 'รับชำระเงิน ' : 'บันทึกจ่ายชำระ ') + (d.docNo || ''), body: body, buttons:[CANCEL_BTN, { label:'บันทึก', cls:'btn-dark', onClick: function(btn) {
    var p = { date: byId('p_date').value || todayStr(), method: byId('p_method').value, bankAcc: byId('p_bank').tagName === 'SELECT' ? byId('p_bank').value : '', bankText: byId('p_bank').tagName === 'INPUT' ? byId('p_bank').value.trim() : '',
      amount: round2(byId('p_amount').value), wht: round2(byId('p_wht').value), fee: round2(byId('p_fee').value), ref: byId('p_ref').value.trim(), note: byId('p_note').value.trim(), createdAt: Date.now() };
    if (p.method === 'เช็ค') { p.chequeBank = byId('p_cbank').value.trim(); p.chequeDate = byId('p_cdate').value; }
    if (p.bankText) p.ref = [p.bankText, p.ref].filter(Boolean).join(' · ');
    var err = p.amount <= 0 ? 'ระบุจำนวนเงินมากกว่า 0' : p.amount + p.wht + p.fee > bal + 0.01 ? 'ยอดรวม (เงิน + หัก ณ ที่จ่าย + ค่าธรรมเนียม) เกินยอดคงค้าง ' + fmtMoney(bal) : '';
    if (err) { var e = byId('formError'); e.textContent = err; e.hidden = false; return; }
    var pays = (d.payments || []).concat([p]);
    var upd = Object.assign({}, strip(d), { payments: pays, updatedAt: Date.now() });
    var left = round2(docNet(d) - docPaidAmt(upd));
    upd.status = left <= 0.009 ? 'paid' : 'unpaid'; upd.paidDate = left <= 0.009 ? p.date : null;
    var mkRcpt = cust && byId('p_rcpt') && byId('p_rcpt').checked;
    runSave(btn, async function() {
      if (mkRcpt) {
        var covered = p.amount + p.wht + p.fee, share = covered / (docNet(d) || 1), tot = round2((d.total || 0) * share), vat = round2((d.vat || 0) * share);
        var rno = nextDocNo('receipt', p.date);
        var rid = await addRec('documents', { type:'receipt', typeLabel: DOC_TYPES.receipt.label, group:'customer', party: d.party, contactId: d.contactId || null, date: p.date, docNo: rno, items:null,
          vatMode: d.vat ? 'inclusive' : 'none', base: tot, subtotal: round2(tot - vat), vat: vat, total: tot, whtRate: 0, wht: round2(tot - p.amount - p.fee), net: round2(p.amount + p.fee),
          extra:{ method: p.method, refDoc: d.docNo, invoiceId: d._id, note: p.note || '', account: (d.extra && d.extra.account) || '', incomeCat: (d.extra && d.extra.incomeCat) || '' }, status:'done', createdAt: Date.now() });
        p.receiptId = rid; p.ref = [p.ref, rno].filter(Boolean).join(' · ');
      }
      await setRec('documents', d._id, upd);
      showToast((left <= 0.009 ? (cust ? 'รับชำระครบแล้ว' : 'จ่ายชำระครบแล้ว') : 'บันทึกแล้ว คงค้าง ' + fmtMoney(left)) + (mkRcpt ? ' · ออกใบเสร็จแล้ว' : '')); closeModal();
      if (!cust && Number(p.wht) > 0 && typeof openWhtCert === 'function') { var pi = upd.payments.length - 1, tries = 0; (function look() { var c = whtCerts().find(function(x) { return x.d._id === d._id && x.idx === pi; }); if (c) openWhtCert(c); else if (tries++ < 20) setTimeout(look, 150); })(); }
    });
  } }], onMount: function() {
    function upd() {
      var a = Number(byId('p_amount').value) || 0, w = Number(byId('p_wht').value) || 0, f = Number(byId('p_fee').value) || 0, left = round2(bal - a - w - f);
      byId('p_sum').innerHTML = '<div class="sum-line"><span>ตัดยอดคงค้าง</span><span>' + fmtMoney(a + w + f) + '</span></div><div class="sum-line big"><span>คงค้างหลังบันทึก</span><span>' + fmtMoney(left) + '</span></div>';
      byId('p_chq').hidden = byId('p_method').value !== 'เช็ค';
    }
    ['p_amount','p_wht','p_fee','p_method'].forEach(function(id) { byId(id).addEventListener('input', upd); });
    modalBody.querySelectorAll('[data-whtr]').forEach(function(b) { b.addEventListener('click', function() {
      var base = (d.subtotal != null ? d.subtotal : d.total) * (bal / (docNet(d) || 1));
      var w = round2(base * Number(b.dataset.whtr) / 100); byId('p_wht').value = w; byId('p_amount').value = round2(bal - w - (Number(byId('p_fee').value) || 0)); upd();
    }); });
    upd();
  } });
}

function convMenu(anchor, d, conv) {
  var m = byId('rowMenu');
  if (!m) { m = document.createElement('div'); m.id = 'rowMenu'; m.className = 'drop row-menu'; document.body.appendChild(m); document.addEventListener('click', function() { m.hidden = true; }); }
  m.innerHTML = ''; m.style.zIndex = 90;
  conv.forEach(function(c) { var b = document.createElement('button'); b.type = 'button'; b.textContent = c[1]; b.addEventListener('click', function(e) { e.stopPropagation(); m.hidden = true; convertDoc(d, c[0]); }); m.appendChild(b); });
  setTimeout(function() { m.hidden = false; var r = anchor.getBoundingClientRect(); m.style.position = 'fixed'; m.style.top = Math.max(8, r.top - m.offsetHeight - 6) + 'px'; m.style.left = Math.max(8, r.left) + 'px'; }, 0);
}
function convertDoc(d, to) {
  var pre = { party: d.party, date: todayStr(), vatMode: d.vatMode, whtRate: d.whtRate, extra: { note: d.extra && d.extra.note, account: d.extra && d.extra.account, incomeCat: d.extra && d.extra.incomeCat, refDoc: d.docNo } };
  if (to === 'billingNote') { pre.items = [{ name: d.docNo, date: d.date, due: (d.extra && d.extra.dueDate) || d.date, ref: d._id, qty:1, price: docBal(d) }]; }
  else if (d.items && d.items.length) pre.items = clone(d.items);
  if ((to === 'receipt' || to === 'refundReceipt') && d.vatMode === 'exclusive') pre.vatMode = 'inclusive';
  if (to === 'receipt' || to === 'creditNote' || to === 'refundReceipt') pre.base = to === 'receipt' ? round2(d.type === 'invoice' ? (docBal(d) + (Number(d.wht) || 0)) : d.total) : null;
  closeModal();
  openDocForm(to, null, pre);
}

async function applyPayment(inv, p) {
  var pays = (inv.payments || []).concat([p]);
  var upd = Object.assign({}, strip(inv), { payments: pays, updatedAt: Date.now() });
  var left = round2(docNet(inv) - docPaidAmt(upd));
  upd.status = left <= 0.009 ? 'paid' : 'unpaid'; upd.paidDate = left <= 0.009 ? p.date : null;
  await setRec('documents', inv._id, upd);
}

/* ================= Automatic double-entry posting ================= */
var SYS = { vatOutPend:'2125', vatInPend:'1155', cash:'1110', bank:'1120', ar:'1130', inv:'1140', vatIn:'1150', whtRec:'1160', ap:'2110', vatOut:'2120', whtPay:'2130', sales:'4110', fee:'5290', exp:'5290' };
var SYS_NAMES = { '2125':'ภาษีขายรอเรียกเก็บ', '1155':'ภาษีซื้อรอเรียกเก็บ', '1110':'เงินสด', '1120':'เงินฝากธนาคาร', '1130':'ลูกหนี้การค้า', '1140':'สินค้าคงเหลือ', '1150':'ภาษีซื้อ', '1160':'ภาษีเงินได้ถูกหัก ณ ที่จ่าย', '2110':'เจ้าหนี้การค้า', '2120':'ภาษีขาย', '2130':'ภาษีหัก ณ ที่จ่ายค้างจ่าย', '4110':'รายได้จากการขาย', '5290':'ค่าใช้จ่ายเบ็ดเตล็ด' };
function acctName(code) { var a = STORE.accounts.find(function(x) { return x.code === code; }); return a ? a.name : (SYS_NAMES[code] || ''); }
function cashAcc(method, bankAcc) { if (bankAcc) return bankAcc; return method === 'เงินสด' ? SYS.cash : SYS.bank; }
function catAcc(d, dflt) {
  var ex = d.extra || {};
  if (ex.account) return ex.account;
  var name = d.group === 'customer' ? ex.incomeCat : ex.expCategory;
  var a = name && STORE.accounts.find(function(x) { return x.name === name; });
  return a ? a.code : dflt;
}
function postingsOf(d) {
  if (d.voided) return [];
  var L = [], ex = d.extra || {};
  function add(code, dr, cr, memo, date) { dr = round2(dr); cr = round2(cr); if (dr || cr) L.push({ code: code, dr: dr, cr: cr, memo: memo || '', date: date || d.date, d: d }); }
  var sub = Number(d.subtotal != null ? d.subtotal : d.total) || 0, vat = Number(d.vat) || 0, tot = Number(d.total) || 0, wht = Number(d.wht) || 0;
  switch (d.type) {
    case 'journalEntry':
      (d.items || []).forEach(function(r) { add(String(r.account || '').split(' ')[0], Number(r.debit) || 0, Number(r.credit) || 0); }); break;
    case 'invoice':
      var svc = taxPointOf(d) === 'payment' && vat;
      add(SYS.ar, tot, 0); add(catAcc(d, SYS.sales), 0, sub); add(svc ? SYS.vatOutPend : SYS.vatOut, 0, vat);
      if (svc) vatSlices(d).forEach(function(v) { add(SYS.vatOutPend, v.vat, 0, 'รับรู้ภาษีขายเมื่อรับชำระ', v.date); add(SYS.vatOut, 0, v.vat, 'รับรู้ภาษีขายเมื่อรับชำระ', v.date); });
      (d.payments || []).forEach(function(p) { add(cashAcc(p.method, p.bankAcc), p.amount, 0, 'รับชำระ ' + (p.ref || ''), p.date); add(SYS.whtRec, p.wht || 0, 0, 'ถูกหัก ณ ที่จ่าย', p.date); add(SYS.fee, p.fee || 0, 0, 'ค่าธรรมเนียม', p.date); add(SYS.ar, 0, (p.amount || 0) + (p.wht || 0) + (p.fee || 0), 'รับชำระ', p.date); });
      if (d.status === 'paid' && !(d.payments && d.payments.length)) { add(cashAcc('โอนเงิน'), tot, 0, 'รับชำระ', d.paidDate || d.date); add(SYS.ar, 0, tot, 'รับชำระ', d.paidDate || d.date); }
      break;
    case 'receipt':
      if (ex.invoiceId) break;
      add(cashAcc(ex.method, ex.bankAcc), tot - wht, 0); add(SYS.whtRec, wht, 0); add(catAcc(d, SYS.sales), 0, sub); add(SYS.vatOut, 0, vat); break;
    case 'payment':
      add(cashAcc(ex.method), tot, 0); add(SYS.ar, 0, tot); break;
    case 'creditNote':
      add(catAcc(d, SYS.sales), sub, 0); add(SYS.vatOut, vat, 0); add(SYS.ar, 0, tot); break;
    case 'refundReceipt':
      add(catAcc(d, SYS.sales), sub, 0); add(SYS.vatOut, vat, 0); add(cashAcc(ex.method), 0, tot); break;
    case 'bill':
      var svcB = taxPointOf(d) === 'payment' && vat;
      add(catAcc(d, SYS.exp), sub, 0); add(svcB ? SYS.vatInPend : SYS.vatIn, vat, 0); add(SYS.ap, 0, tot);
      if (svcB) vatSlices(d).forEach(function(v) { add(SYS.vatIn, v.vat, 0, 'รับรู้ภาษีซื้อเมื่อจ่ายชำระ', v.date); add(SYS.vatInPend, 0, v.vat, 'รับรู้ภาษีซื้อเมื่อจ่ายชำระ', v.date); });
      (d.payments || []).forEach(function(p) { add(SYS.ap, (p.amount || 0) + (p.wht || 0) + (p.fee || 0), 0, 'จ่ายชำระ ' + (p.ref || ''), p.date); add(cashAcc(p.method, p.bankAcc), 0, p.amount, 'จ่ายชำระ', p.date); add(SYS.whtPay, 0, p.wht || 0, 'หัก ณ ที่จ่าย', p.date); add(SYS.fee, 0, p.fee || 0, 'ส่วนลด/ค่าธรรมเนียม', p.date); });
      if (d.status === 'paid' && !(d.payments && d.payments.length)) { add(SYS.ap, tot, 0, 'จ่ายชำระ', d.paidDate || d.date); add(SYS.bank, 0, tot, 'จ่ายชำระ', d.paidDate || d.date); }
      break;
    case 'expense': case 'checkPayment':
      add(catAcc(d, SYS.exp), sub, 0); add(SYS.vatIn, vat, 0); add(d.type === 'checkPayment' ? SYS.bank : cashAcc(ex.method, ex.bankAcc), 0, tot - wht); add(SYS.whtPay, 0, wht); break;
    case 'vendorCredit':
      add(SYS.ap, tot, 0); add(catAcc(d, SYS.exp), 0, sub); add(SYS.vatIn, 0, vat); break;
    case 'bankDeposit':
      add(SYS.bank, tot, 0); add(SYS.cash, 0, tot); break;
  }
  return L;
}
function allLines(filterFn) {
  var out = [];
  STORE.documents.forEach(function(d) { if (!filterFn || filterFn(d)) postingsOf(d).forEach(function(l) { out.push(l); }); });
  return out;
}

function isServiceAcc(code) {
  var a = STORE.accounts.find(function(x) { return x.code === code; });
  return code === '4120' || !!(a && /บริการ|ค่าธรรมเนียม|ค่าจ้าง|ค่าเช่า/.test((a.name || '') + ' ' + (a.detailType || '')));
}
// VAT recognised per payment for service (payment-basis) documents
function vatSlices(d) {
  var net = docNet(d) || 1, out = [];
  var pays = (d.payments && d.payments.length) ? d.payments : (d.status === 'paid' ? [{ date: d.paidDate || d.date, amount: net }] : []);
  pays.forEach(function(p) {
    var share = ((Number(p.amount) || 0) + (Number(p.wht) || 0) + (Number(p.fee) || 0)) / net;
    out.push({ date: p.date, share: share, vat: round2((Number(d.vat) || 0) * share), base: round2((Number(d.subtotal) || 0) * share), total: round2((Number(d.total) || 0) * share) });
  });
  var sv = round2(out.reduce(function(a, x) { return a + x.vat; }, 0));
  if (out.length && docBal(d) <= 0.009 && sv !== round2(d.vat)) out[out.length - 1].vat = round2(out[out.length - 1].vat + (Number(d.vat) - sv));
  return out;
}
// documents as seen by VAT reports: payment-basis docs split into one entry per payment
function taxDocs() {
  var out = [];
  STORE.documents.forEach(function(d) {
    if (d.voided) return;
    if (taxPointOf(d) === 'payment' && d.vat && (d.type === 'invoice' || d.type === 'bill')) {
      vatSlices(d).forEach(function(v, i) { out.push(Object.assign({}, d, { date: v.date, subtotal: v.base, vat: v.vat, total: v.total, net: v.total, wht: 0, _slice: true, docNo: d.docNo + (vatSlices(d).length > 1 ? ' (งวด ' + (i + 1) + ')' : '') })); });
    } else out.push(d);
  });
  return out;
}

function taxPointOf(d) {
  if (d.type !== 'invoice' && d.type !== 'bill') return 'invoice';
  if (d.taxPoint) return d.taxPoint;
  return isServiceAcc(catAcc(d, '')) ? 'payment' : 'invoice';
}
// keep the VAT holding accounts present and correctly named in the chart of accounts
var _vatAccFixing = false;
async function ensureVatAccounts() {
  if (_vatAccFixing || !STORE.accounts.length) return;
  _vatAccFixing = true;
  try {
    var want = [['2125','ภาษีขายรอเรียกเก็บ','curLiab','ภาษีขายที่ยังไม่ได้รับชำระ (ค่าบริการ)'],['1155','ภาษีซื้อรอเรียกเก็บ','curAsset','ภาษีซื้อที่ยังไม่ได้จ่ายชำระ (ค่าบริการ)']];
    for (var i = 0; i < want.length; i++) {
      var w = want[i], a = STORE.accounts.find(function(x) { return x.code === w[0]; });
      if (!a) await addRec('accounts', { code: w[0], name: w[1], accType: w[2], type: subtypeBase(w[2]), detailType: w[3], taxCode:'vat7', createdAt: Date.now() });
      else if (/ยังไม่ถึงกำหนด/.test(a.name)) await setRec('accounts', a._id, Object.assign({}, strip(a), { name: w[1], detailType: w[3], updatedAt: Date.now() }));
    }
  } catch (e) {}
}

/* ---- Attachments (assets capability) ---- */
var ASSETS = null;
if (window.claude && window.claude.use) window.claude.use('assets').then(function(a) { ASSETS = a; var m = byId('attMsg'); if (m && !a) m.textContent = 'แนบไฟล์ได้เฉพาะผู้มีสิทธิ์แก้ไข'; }).catch(function() {});
function attUrl(a) { return a.url || ('/_blob/' + a.id); }
function attIcon(a) { return /^image\//.test(a.type || '') ? '🖼' : /pdf/.test(a.type || '') ? '📄' : '📎'; }
function attLinksHTML(list) {
  return '<div class="att-list">' + list.map(function(a) { return '<a class="att-chip" href="#" data-attopen="' + esc(JSON.stringify(a)) + '">' + attIcon(a) + ' ' + esc(a.name) + '</a>'; }).join('') + '</div>';
}
function renderAttList() {
  var box = byId('attList'); if (!box || !form) return;
  box.innerHTML = (form.attachments || []).map(function(a, i) {
    return '<span class="att-chip"><a href="#" data-attopen="' + esc(JSON.stringify(a)) + '">' + attIcon(a) + ' ' + esc(a.name) + '</a> <span class="muted small">' + (a.size ? Math.max(1, Math.round(a.size / 1024)) + ' KB' : '') + '</span><button type="button" class="att-x" data-attx="' + i + '" aria-label="ลบไฟล์แนบ">×</button></span>';
  }).join('') || '<span class="muted small">ยังไม่มีไฟล์แนบ</span>';
  box.querySelectorAll('[data-attx]').forEach(function(b) { b.onclick = function() { form.attachments.splice(Number(b.dataset.attx), 1); renderAttList(); }; });
}
document.addEventListener('change', async function(e) {
  if (!e.target || e.target.id !== 'attInput') return;
  var inp = e.target, msg = byId('attMsg'), files = Array.from(inp.files || []);
  if (!ASSETS) ASSETS = window.claude && window.claude.use ? await window.claude.use('assets') : null;
  if (!ASSETS) { if (msg) msg.textContent = 'ไม่สามารถแนบไฟล์ในมุมมองนี้ได้'; inp.value = ''; return; }
  for (var k = 0; k < files.length; k++) {
    var f = files[k];
    if (msg) msg.textContent = 'กำลังอัปโหลด ' + f.name + ' …';
    try { var r = await ASSETS.upload(f); form.attachments.push({ id: r.id, url: r.url, name: f.name, type: r.contentType || f.type, size: r.sizeBytes || f.size }); renderAttList(); if (msg) msg.textContent = 'อัปโหลดแล้ว — กดบันทึกเอกสารเพื่อเก็บไฟล์แนบ'; }
    catch (err) { if (msg) msg.textContent = 'อัปโหลด ' + f.name + ' ไม่สำเร็จ: ' + ({ too_large:'ไฟล์ใหญ่เกินไป', unsupported_type:'ไม่รองรับชนิดไฟล์นี้', quota_or_state:'พื้นที่เก็บไฟล์เต็ม', not_granted:'ไม่ได้รับอนุญาต' }[err && err.code] || (err && err.message) || 'ข้อผิดพลาด'); }
  }
  inp.value = '';
});

document.addEventListener('click', function(e) {
  var el = e.target.closest && e.target.closest('[data-attopen]'); if (!el) return;
  e.preventDefault(); try { openAttachment(JSON.parse(el.dataset.attopen)); } catch (err) {}
}, true);
async function attBlob(a) {
  var r = await fetch(attUrl(a), { credentials: 'include' });
  if (!r.ok) r = await fetch('/_blob/' + a.id, { credentials: 'include' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return await r.blob();
}
async function openAttachment(a) {
  var ov = document.createElement('div');
  ov.className = 'att-viewer';
  ov.innerHTML = '<div class="att-vbox"><div class="att-vhead"><b>' + esc(a.name) + '</b><span><button type="button" class="btn btn-outline" data-av="dl">ดาวน์โหลด</button> <button type="button" class="btn btn-dark" data-av="close">ปิด</button></span></div><div class="att-vbody">กำลังโหลด…</div></div>';
  document.body.appendChild(ov);
  var blob = null, obj = null;
  function close() { if (obj) URL.revokeObjectURL(obj); ov.remove(); }
  ov.addEventListener('click', async function(ev) {
    if (ev.target === ov || (ev.target.dataset && ev.target.dataset.av === 'close')) return close();
    if (ev.target.dataset && ev.target.dataset.av === 'dl') {
      try { var dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; var b = blob || await attBlob(a);
        if (dl) await dl.save({ filename: a.name, data: b }); else { var u = URL.createObjectURL(b), x = document.createElement('a'); x.href = u; x.download = a.name; x.click(); setTimeout(function() { URL.revokeObjectURL(u); }, 5000); }
      } catch (err) { body.insertAdjacentHTML('afterbegin', '<div class="muted">ดาวน์โหลดไม่สำเร็จ</div>'); }
    }
  });
  var body = ov.querySelector('.att-vbody');
  try {
    blob = await attBlob(a); obj = URL.createObjectURL(blob);
    var t = blob.type || a.type || '';
    if (/^image\//.test(t)) body.innerHTML = '<img src="' + obj + '" alt="' + esc(a.name) + '">';
    else if (/pdf/.test(t) || /\.pdf$/i.test(a.name)) await renderPdfInto(body, blob);
    else { var txt = await blob.text(); body.innerHTML = '<pre></pre>'; body.firstChild.textContent = txt.slice(0, 200000); }
  } catch (err) { body.innerHTML = '<div class="muted">เปิดไฟล์ไม่ได้ (' + esc(err.message || '') + ') ลองกดดาวน์โหลด</div>'; }
}

var PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
var _pdfjsP = null;
function loadPdfJs() {
  if (_pdfjsP) return _pdfjsP;
  _pdfjsP = new Promise(function(res, rej) {
    var s = document.createElement('script'); s.src = PDFJS_BASE + 'pdf.min.js';
    s.onload = async function() {
      var lib = window.pdfjsLib; if (!lib) return rej(new Error('pdf.js'));
      try { var w = await fetch(PDFJS_BASE + 'pdf.worker.min.js'); lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([await w.text()], { type: 'text/javascript' })); }
      catch (e) { lib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + 'pdf.worker.min.js'; }
      res(lib);
    };
    s.onerror = function() { _pdfjsP = null; rej(new Error('โหลดตัวแสดง PDF ไม่ได้')); };
    document.head.appendChild(s);
  });
  return _pdfjsP;
}
async function renderPdfInto(body, blob) {
  body.innerHTML = 'กำลังแสดง PDF…';
  var lib = await loadPdfJs();
  var pdf = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  body.innerHTML = ''; body.style.flexDirection = 'column'; body.style.alignItems = 'center';
  var width = Math.min(body.clientWidth - 16, 900), dpr = window.devicePixelRatio || 1;
  for (var i = 1; i <= Math.min(pdf.numPages, 50); i++) {
    var page = await pdf.getPage(i), v0 = page.getViewport({ scale: 1 }), sc = width / v0.width, vp = page.getViewport({ scale: sc * dpr });
    var c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; c.style.width = (vp.width / dpr) + 'px'; c.style.maxWidth = '100%'; c.style.height = 'auto'; c.style.marginBottom = '8px'; c.style.boxShadow = '0 1px 4px rgba(0,0,0,.2)'; c.style.background = '#fff';
    body.appendChild(c);
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  }
  if (pdf.numPages > 50) body.insertAdjacentHTML('beforeend', '<div class="muted small">แสดง 50 หน้าแรก — กดดาวน์โหลดเพื่อดูทั้งหมด</div>');
}

function openVoidDoc(d) {
  var paid = (d.payments || []).length;
  openModal({ title:'ยกเลิกเอกสาร ' + (d.docNo || ''), body:'<p style="margin:0">เอกสารที่ยกเลิกจะ <b>คงเลขที่เดิมไว้</b> (ไม่ถูกนำไปใช้ซ้ำ) แสดงสถานะ "ยกเลิกแล้ว" และไม่ลงบัญชี/ภาษีอีก ต่างจากการลบที่เลขที่จะถูกนำกลับมาใช้ใหม่</p>' +
    (paid ? '<div class="banner bad" style="margin-top:10px">เอกสารนี้มีการรับ/จ่ายชำระแล้ว ' + paid + ' รายการ ยกเลิกแล้วรายการชำระจะไม่ถูกลงบัญชีด้วย</div>' : '') +
    '<div class="field" style="margin-top:12px"><label for="voidReason">เหตุผลที่ยกเลิก</label><input id="voidReason" placeholder="เช่น ออกผิด ลูกค้ายกเลิกคำสั่งซื้อ"></div>',
    buttons:[CANCEL_BTN, { label:'ยืนยันยกเลิกเอกสาร', cls:'btn-danger', onClick: function(el) { runSave(el, async function() {
      await setRec('documents', d._id, Object.assign({}, strip(d), { voided: true, voidReason: byId('voidReason').value.trim(), voidedAt: Date.now(), updatedAt: Date.now() }));
      showToast('ยกเลิก ' + (d.docNo || 'เอกสาร') + ' แล้ว'); closeModal();
    }); } }] });
}
