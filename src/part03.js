/* ================= Calculations ================= */
function accBaseOf(code) {
  var a = STORE.accounts.find(function(x) { return x.code === code; });
  return a ? subtypeBase(accSubtype(a)) : ({ '1':'asset','2':'liability','3':'equity','4':'income','5':'expense' })[String(code).charAt(0)] || 'expense';
}
// P&L from the ledger: every posting to an income / expense account counts
function plTotals(docs) {
  var rev = 0, exp = 0;
  docs.forEach(function(d) { postingsOf(d).forEach(function(l) { var b = accBaseOf(l.code); if (b === 'income') rev += l.cr - l.dr; else if (b === 'expense') exp += l.dr - l.cr; }); });
  return { rev: round2(rev), exp: round2(exp), profit: round2(rev - exp) };
}
function openItems(type) {
  return STORE.documents.filter(function(d) { return d.type === type && docStatus(d) !== 'paid'; });
}
function sumNet(list) { return round2(list.reduce(function(s, d) { return s + docBal(d); }, 0)); }

function periodRange(p) {
  if (p === 'custom') return [pageState.pFrom || '0000-01-01', pageState.pTo || '9999-12-31'];
  var t = todayStr(), y = t.slice(0,4), m = Number(t.slice(5,7));
  if (p === 'month') return [t.slice(0,7) + '-01', t];
  if (p === 'quarter') { var qm = Math.floor((m - 1) / 3) * 3 + 1; return [y + '-' + String(qm).padStart(2,'0') + '-01', t]; }
  if (p === 'year') return [y + '-01-01', t];
  if (p === 'last12') { var d = new Date(t + 'T00:00:00'); d.setMonth(d.getMonth() - 11); d.setDate(1); return [d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-01', t]; }
  return ['0000-01-01', '9999-12-31'];
}
function customRangeHTML(cur) {
  return '<span class="pr-custom"' + (cur === 'custom' ? '' : ' hidden') + ' style="display:inline-flex;gap:6px;align-items:center;margin-left:8px">จาก <input type="date" class="pr-from" value="' + (pageState.pFrom || '') + '"> ถึง <input type="date" class="pr-to" value="' + (pageState.pTo || '') + '"></span>';
}
document.addEventListener('change', function(e) {
  var t = e.target;
  if (t.classList && (t.classList.contains('pr-from') || t.classList.contains('pr-to'))) {
    pageState[t.classList.contains('pr-from') ? 'pFrom' : 'pTo'] = t.value;
    document.querySelectorAll(t.classList.contains('pr-from') ? '.pr-from' : '.pr-to').forEach(function(x) { x.value = t.value; });
    refreshPageData(); return;
  }
  if (t.tagName === 'SELECT' && t.querySelector('option[value="custom"]') && (t.dataset.tx === 'period' || t.id === 'rp' || t.id === 'repPeriod')) {
    if (t.value === 'custom' && !pageState.pFrom) { pageState.pFrom = todayStr().slice(0, 8) + '01'; pageState.pTo = todayStr(); }
    var box = t.closest('label, .field, div').parentNode.querySelector('.pr-custom');
    if (box) { box.hidden = t.value !== 'custom'; box.querySelector('.pr-from').value = pageState.pFrom || ''; box.querySelector('.pr-to').value = pageState.pTo || ''; }
  }
}, true);
function inRange(date, r) { return date >= r[0] && date <= r[1]; }
function last12Months() {
  var out = [], d = new Date(todayStr() + 'T00:00:00');
  d.setDate(1);
  for (var i = 11; i >= 0; i--) {
    var x = new Date(d); x.setMonth(d.getMonth() - i);
    out.push(x.getFullYear() + '-' + String(x.getMonth()+1).padStart(2,'0'));
  }
  return out;
}

function agingBuckets(list) {
  var b = [{ label:'ยังไม่ครบกำหนด', n:0, amt:0 }, { label:'1–30 วัน', n:0, amt:0 }, { label:'31–60 วัน', n:0, amt:0 }, { label:'61–90 วัน', n:0, amt:0 }, { label:'เกิน 90 วัน', n:0, amt:0 }];
  var t = todayStr();
  list.forEach(function(d) {
    var due = (d.extra && d.extra.dueDate) || d.date;
    var late = daysBetween(due, t);
    var i = late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : late <= 90 ? 3 : 4;
    b[i].n++; b[i].amt += docBal(d);
  });
  return b;
}

function accountBalances() {
  var bal = {};
  allLines().forEach(function(l) { var b = bal[l.code] = bal[l.code] || { dr:0, cr:0 }; b.dr += l.dr; b.cr += l.cr; });
  return bal;
}

function productStock(p) {
  var q = Number(p.openingQty) || 0;
  STORE.documents.forEach(function(d) {
    if (d.type === 'inventoryAdjust' && d.party === p.name) q += Number(d.extra && d.extra.qtyChange) || 0;
    if ((d.type === 'invoice' || d.type === 'bill') && d.items) {
      d.items.forEach(function(r) { if (r.name === p.name) q += (d.type === 'bill' ? 1 : -1) * (Number(r.qty) || 0); });
    }
  });
  return q;
}

/* ================= Dashboard ================= */
function renderDashboard() {
  var docs = STORE.documents;
  var pl = plTotals(docs);
  var ar = openItems('invoice'), ap = openItems('bill');
  var arOver = ar.filter(function(d) { return docStatus(d) === 'overdue'; }).length;
  var apOver = ap.filter(function(d) { return docStatus(d) === 'overdue'; }).length;
  var monthPl = plTotals(docs.filter(function(d) { return inRange(d.date || '', periodRange('month')); }));
  var cards = [
    { label:'รายได้สะสม (ไม่รวม VAT)', value: fmtMoney(pl.rev, 0), sub:'เดือนนี้ ' + fmtMoney(monthPl.rev, 0), go:'reports:performance' },
    { label:'ค่าใช้จ่ายสะสม (ไม่รวม VAT)', value: fmtMoney(pl.exp, 0), sub:'เดือนนี้ ' + fmtMoney(monthPl.exp, 0), go:'reports:performance' },
    { label:'กำไรสุทธิโดยประมาณ', value: fmtMoney(pl.profit, 0), neg: pl.profit < 0, sub:'รายได้ − ค่าใช้จ่าย', go:'reports:performance' },
    { label:'ลูกหนี้ค้างรับ', value: fmtMoney(sumNet(ar), 0), sub: ar.length + ' ใบแจ้งหนี้' + (arOver ? ' · เกินกำหนด ' + arOver : ''), go:'sales' },
    { label:'เจ้าหนี้ค้างจ่าย', value: fmtMoney(sumNet(ap), 0), sub: ap.length + ' บิล' + (apOver ? ' · เกินกำหนด ' + apOver : ''), go:'billing' }
  ];
  byId('glanceGrid').innerHTML = cards.map(function(c) {
    return '<div class="glance-card clickable" tabindex="0" role="button" data-go="' + c.go + '"><div class="glance-label">' + c.label + '</div><div class="glance-value' + (c.neg ? ' neg' : '') + '">' + c.value + '</div><div class="glance-sub">' + c.sub + '</div></div>';
  }).join('');
  renderBackupNag();
  var body = byId('recentBody');
  if (!docs.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty-hint">' + (dbReady ? 'ยังไม่มีเอกสาร เริ่มสร้างจาก "สร้างการดำเนินการ" ด้านบน' : 'กำลังโหลดข้อมูล…') + '</td></tr>';
    return;
  }
  body.innerHTML = docs.slice(0, 8).map(docRow).join('');
}

function docRow(d) {
  return '<tr class="row-link" tabindex="0" data-doc="' + esc(d._id) + '"><td class="docno">' + esc(d.docNo || '-') + '</td><td>' + esc(d.typeLabel || '') + '</td><td>' + esc(d.party || '-') +
    '</td><td style="white-space:nowrap">' + fmtDate(d.date) + '</td><td>' + statusPill(d) + '</td><td class="r">' + (d.total ? fmtMoney(d.total) : '<span class="muted">-</span>') + '</td></tr>';
}

/* ================= Navigation ================= */
var SUBNAV_ITEMS = [
  { key:'accounting', label:'การบัญชี', color:'#3A6B8A', icon:'📗', children: [
      { key:'bankTx', label:'ธุรกรรมธนาคาร' },
      { key:'batchTx', label:'ธุรกรรมการรวม' },
      { key:'reconcile', label:'กระทบยอด' },
      { key:'monthClose', label:'ปิดงบรายเดือน' },
      { key:'rules', label:'กฎ' },
      { key:'coa', label:'ผังบัญชี' },
      { key:'opening', label:'ยอดยกมา (งบปีก่อน)' },
      { key:'recurring', label:'รายการเกิดซ้ำ' },
      { key:'receiptCapture', label:'อ่านเอกสาร (OCR)' }
    ] },
  { key:'alldocs',    label:'เอกสารทั้งหมด', color:'#4C5E76', icon:'🗂️', children: [
      { key:'list', label:'รายการเอกสาร' },
      { key:'batch', label:'บันทึกหลายรายการ' }
    ] },
  { key:'billing',    label:'ค่าใช้จ่ายและบิล', color:'#2E8B6F', icon:'💳', children: [
      { key:'expenseTx', label:'ธุรกรรมค่าใช้จ่าย' },
      { key:'suppliers', label:'ซัพพลายเออร์' },
      { key:'bill', label:'บิล' },
      { key:'prepaid', label:'ค่าใช้จ่ายชำระล่วงหน้า' }
    ] },
  { key:'sales',      label:'การขายและรับเงิน', color:'#1B2E3A', icon:'📈', children: [
      { key:'overview', label:'ภาพรวม' },
      { key:'salesTx', label:'ธุรกรรมการขาย' },
      { key:'invoice', label:'ใบแจ้งหนี้' },
      { key:'salesOrder', label:'ใบสั่งขาย' },
      { key:'products', label:'ผลิตภัณฑ์และบริการ' }
    ] },
  { key:'customers',  label:'ศูนย์กลางลูกค้า', color:'#2E8B6F', icon:'👥' },
  { key:'inventory',  label:'สินค้าคงคลัง', color:'#1B2E3A', icon:'📦', children: [
      { key:'overview', label:'ภาพรวม' },
      { key:'stock', label:'สินค้าคงคลัง' },
      { key:'purchaseOrder', label:'ใบสั่งซื้อ' },
      { key:'fixedAssets', label:'ทรัพย์สินถาวร' },
      { key:'receipt', label:'ใบเสร็จรายการ' },
      { key:'salesOrder', label:'ใบสั่งขาย' }
    ] },
  { key:'tax',        label:'ภาษี', color:'#B3402A', icon:'🧾', children: [
      { key:'overview', label:'ภาพรวม' },
      { key:'monthly', label:'รายงานภาษีรายเดือน' },
      { key:'wht', label:'หนังสือรับรอง 50 ทวิ' }
    ] },
  { key:'reports',    label:'รายงาน', color:'#5B4B8A', icon:'📊', children: [
      { key:'standard', label:'รายงานมาตรฐาน' },
      { key:'custom', label:'รายงานที่กำหนดเอง' },
      { key:'management', label:'รายงานการจัดการ' },
      { key:'performance', label:'ศูนย์ประสิทธิภาพ' },
      { key:'cashflow', label:'ภาพรวมกระแสเงินสด' },
      { key:'budget', label:'งบประมาณ' },
      { key:'forecast', label:'การคาดการณ์' }
    ] },
  { key:'team',       label:'ทีมงาน', color:'#3A6B8A', icon:'🧑‍🤝‍🧑', children: [
      { key:'employees', label:'พนักงาน' }
    ] },
  { key:'project',    label:'โครงการและแผนก', color:'#1B2E3A', icon:'📁', children: [
      { key:'list', label:'โครงการ' },
      { key:'dept', label:'แผนก' }
    ] }
];
var CHILD_CONTENT = {
  bankTx:        { title:'มาเชื่อมต่อบัญชีธนาคารของคุณกัน', desc:'ระหว่างนี้บันทึกการฝากและโอนเงินได้จากเมนู สร้าง → ฝากเงินธนาคาร / โอนเงิน', open:'bankDeposit' },
  reconcile:     { title:'มากระทบยอดบัญชีของคุณกัน', desc:'เปรียบเทียบยอดในระบบกับใบแจ้งยอดธนาคาร ฟีเจอร์นี้จะเปิดให้ใช้ในเวอร์ชันถัดไป' },
  batchTx:       { title:'จัดกลุ่มธุรกรรมที่คล้ายกัน', desc:'รวมรายการที่เกิดบ่อยไว้ในที่เดียวเพื่อจัดการได้เร็วขึ้น ฟีเจอร์นี้จะเปิดให้ใช้ในเวอร์ชันถัดไป' },
  receiptCapture:{ title:'ให้ระบบจดจำใบเสร็จให้คุณ', desc:'อัปโหลดใบเสร็จแล้วให้ระบบอ่านข้อมูลให้อัตโนมัติ ระหว่างนี้บันทึกเป็นค่าใช้จ่ายได้', open:'expense' },
  rules:         { title:'ตั้งกฎจัดหมวดหมู่อัตโนมัติ', desc:'สร้างกฎเพื่อจัดหมวดหมู่ธุรกรรมที่เข้ามาโดยไม่ต้องทำเอง ฟีเจอร์นี้จะเปิดให้ใช้ในเวอร์ชันถัดไป' },
  recurring:     { title:'มาตั้งเวลารายการที่เกิดซ้ำกัน', desc:'สร้างใบแจ้งหนี้หรือบิลที่เกิดขึ้นประจำให้ทำงานอัตโนมัติ ฟีเจอร์นี้จะเปิดให้ใช้ในเวอร์ชันถัดไป' },
  fixedAssets:   { title:'จัดการทะเบียนทรัพย์สินถาวร', desc:'ระหว่างนี้บันทึกค่าเสื่อมราคาผ่านสมุดรายวันทั่วไป (เดบิต 5250 ค่าเสื่อมราคา / เครดิต 1220 ค่าเสื่อมราคาสะสม)', open:'journalEntry' },
  prepaid:       { title:'ค่าใช้จ่ายชำระล่วงหน้า', desc:'ระหว่างนี้ตัดจำหน่ายรายเดือนผ่านสมุดรายวันทั่วไปได้', open:'journalEntry' },
  myAccountant:  { title:'เชิญนักบัญชีของคุณเข้าร่วม', desc:'แชร์ลิงก์หน้านี้ให้นักบัญชีด้วยสิทธิ์ Contributor เพื่อให้บันทึกและแก้ไขเอกสารร่วมกันได้' }
};
var EMPTY_STATE_SVG =
  '<svg viewBox="0 0 300 240" width="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  '<circle cx="165" cy="120" r="100" fill="var(--bg-accent-soft)"/>' +
  '<rect x="70" y="150" width="150" height="8" rx="4" fill="var(--border-strong)"/>' +
  '<rect x="90" y="90" width="60" height="46" rx="3" fill="var(--bg-panel)" stroke="var(--border-strong)" stroke-width="2"/>' +
  '<rect x="160" y="80" width="60" height="52" rx="3" fill="var(--bg-panel)" stroke="var(--border-strong)" stroke-width="2"/>' +
  '<circle cx="185" cy="55" r="18" fill="#E8C79A"/>' +
  '<rect x="168" y="70" width="34" height="42" rx="10" fill="var(--accent)"/>' +
  '</svg>';
var SALES_CHANNELS = [
  { name:'Shopee', initials:'S', color:'#D2461E' }, { name:'Lazada', initials:'L', color:'#1A2D8C' },
  { name:'LINE MAN / LINE SHOPPING', initials:'LN', color:'#06803A' }, { name:'Shopify', initials:'Sh', color:'#5A8A3A' },
  { name:'WooCommerce', initials:'Wo', color:'#7F54B3' }, { name:'TikTok Shop', initials:'T', color:'#1B1B1B' }
];

var route = { key:'accounting', child:null };
var listState = {};
var pageState = { coaQ:'', coaFilter:'', coaSort:'type', coaDir:1, contactTab:'all', contactQ:'', productQ:'', reportPeriod:'year', taxMonth: todayStr().slice(0,7) };

function buildSubnav() {
  var nav = byId('subnav');
  var mob = byId('mobileNav');
  var mhtml = '';
  SUBNAV_ITEMS.forEach(function(item) {
    var group = document.createElement('div');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'subnav-item';
    btn.dataset.key = item.key;
    btn.innerHTML = '<span class="sn-dot" style="background:' + item.color + '">' + item.icon + '</span>' + item.label + (item.children ? '<span class="sn-chev"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>' : '');
    group.appendChild(btn);
    mhtml += '<option value="' + item.key + '">' + item.label + '</option>';
    if (item.children) {
      var wrap = document.createElement('div');
      wrap.className = 'subnav-children';
      wrap.id = 'children-' + item.key;
      item.children.forEach(function(child) {
        var c = document.createElement('button');
        c.type = 'button';
        c.className = 'subnav-child';
        c.dataset.childKey = child.key;
        c.textContent = child.label;
        c.addEventListener('click', function() { go(item.key, child.key); });
        wrap.appendChild(c);
        mhtml += '<option value="' + item.key + ':' + child.key + '">  └ ' + child.label + '</option>';
      });
      group.appendChild(wrap);
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function() {
        if (wrap.classList.contains('open')) { setExpanded(item.key, false); return; }
        go(item.key);
      });
    } else btn.addEventListener('click', function() { go(item.key); });
    nav.appendChild(group);
  });
  mob.innerHTML = mhtml;
  mob.addEventListener('change', function() { var p = mob.value.split(':'); go(p[0], p[1] || null); });
}

function go(key, child) {
  byId('homeView').hidden = true;
  byId('sectionView').hidden = false;
  byId('sidebarHomeBtn').classList.remove('active');
  byId('sidebarAccountingBtn').classList.toggle('active', key === 'accounting');
  byId('sidebarReportsBtn').classList.toggle('active', key === 'reports');
  byId('sidebarFeedBtn').classList.toggle('active', key === 'alldocs');
  var navItem = SUBNAV_ITEMS.find(function(i) { return i.key === key; });
  if (navItem && navItem.children && !child && key !== 'accounting') child = navItem.children[0].key;
  route = { key: key, child: child || null };
  document.querySelectorAll('.subnav-item').forEach(function(b) { b.classList.toggle('active', b.dataset.key === key && !child); });
  document.querySelectorAll('.subnav-child').forEach(function(b) { b.classList.toggle('active', !!child && b.dataset.childKey === (child === 'view' ? 'standard' : child)); });
  if (navItem && navItem.children) setExpanded(key, true);
  byId('mobileNav').value = child ? key + ':' + child : key;
  renderPage();
  window.scrollTo(0, 0);
}
function setExpanded(key, open) {
  var w = byId('children-' + key), b = document.querySelector('.subnav-item[data-key="' + key + '"]');
  if (w) w.classList.toggle('open', open);
  if (b) { b.classList.toggle('expanded', open); b.setAttribute('aria-expanded', String(open)); }
}
function showHome() {
  byId('sectionView').hidden = true;
  byId('homeView').hidden = false;
  ['sidebarAccountingBtn','sidebarReportsBtn','sidebarFeedBtn'].forEach(function(id) { byId(id).classList.remove('active'); });
  byId('sidebarHomeBtn').classList.add('active');
}

/* ================= Pages ================= */
var DOC_GROUP_PAGES = {
  alldocs:  { group:'all', title:'เอกสารทั้งหมด', sub:'ทุกเอกสารในระบบ ค้นหาและกรองตามประเภท สถานะ และช่วงวันที่' },
  sales:    { group:'customer', title:'การขายและรับเงิน', sub:'ใบแจ้งหนี้ ใบเสร็จ ใบเสนอราคา และเอกสารฝั่งลูกค้าทั้งหมด' },
  billing:  { group:'supplier', title:'ค่าใช้จ่ายและบิล', sub:'บิลซื้อ ค่าใช้จ่าย เช็คจ่าย และเอกสารฝั่งซัพพลายเออร์' },
  team:     { group:'team', title:'ทีมงาน', sub:'บันทึกกิจกรรมและชั่วโมงทำงานของพนักงาน' },
  project:  { group:'project', title:'โครงการ', sub:'รายการโปรเจกต์ งบประมาณ และกำหนดเสร็จ' }
};

function pageId() { return route.child ? route.key + ':' + route.child : route.key; }

function renderPage() {
  var c = byId('sectionContent');
  var k = route.key, ch = route.child;
  var shell = '';
  var pid = k + ':' + ch;
  if (pid === 'accounting:bankTx') shell = bankShell();
  else if (pid === 'alldocs:batch') shell = batchShell();
  else if (pid === 'accounting:receiptCapture') shell = ocrShell();
  else if (pid === 'accounting:opening') shell = obShell();
  else if (pid === 'accounting:reconcile') shell = reconShell();
  else if (pid === 'accounting:monthClose') shell = monthCloseShell();
  else if (pid === 'tax:wht') shell = whtListShell();
  else if (TX_PAGES[pid]) shell = txShell(pid);
  else if (pid === 'billing:suppliers') { pageState.contactTab = 'supplier'; shell = contactsShell('ซัพพลายเออร์'); }
  else if (pid === 'sales:products') shell = productsShell('ผลิตภัณฑ์และบริการ');
  else if (pid === 'sales:overview') shell = salesOverviewShell();
  else if (pid === 'inventory:overview') shell = invOverviewShell();
  else if (pid === 'tax:overview') shell = taxOvShell();
  else if (pid === 'settings:forms') shell = formsShell();
  else if (pid === 'settings:company') shell = companyPageShell();
  else if (pid === 'settings:import') shell = importShell();
  else if (pid === 'reports:standard') shell = stdReportsShell();
  else if (pid === 'reports:view') shell = reportViewShell();
  else if (pid === 'reports:cashflow') shell = cashOverviewShell();
  else if (pid === 'reports:custom') shell = reportsPlaceholder('รายงานที่กำหนดเอง', 'รายงานที่คุณปรับแต่งและบันทึกไว้จะแสดงที่นี่ ระหว่างนี้เลือกรายงานมาตรฐาน แล้วปรับช่วงเวลาและส่งออกเป็น Excel ได้', '<button class="btn btn-dark" type="button" onclick="go(\'reports\',\'standard\')">ไปที่รายงานมาตรฐาน</button>');
  else if (pid === 'reports:management') shell = reportsPlaceholder('รายงานการจัดการ', 'รวมรายงานหลายฉบับเป็นชุดสำหรับผู้บริหาร ระหว่างนี้ใช้ศูนย์ประสิทธิภาพซึ่งสรุปกำไรขาดทุน ลูกหนี้ และเจ้าหนี้ไว้ในหน้าเดียว', '<button class="btn btn-dark" type="button" onclick="go(\'reports\',\'performance\')">เปิดศูนย์ประสิทธิภาพ</button>');
  else if (pid === 'reports:budget') shell = reportsPlaceholder('งบประมาณ', 'ตั้งงบประมาณรายเดือนต่อบัญชีแล้วเทียบกับยอดจริง ฟีเจอร์นี้จะเปิดให้ใช้ในเวอร์ชันถัดไป ระหว่างนี้ดูงบของแต่ละโครงการได้ในเมนูโครงการ', '<button class="btn btn-dark" type="button" onclick="go(\'project\')">ไปที่โครงการ</button>');
  else if (pid === 'reports:forecast') shell = reportsPlaceholder('การคาดการณ์', 'คาดการณ์รายได้และกระแสเงินสดล่วงหน้าจากข้อมูลย้อนหลัง ฟีเจอร์นี้จะเปิดให้ใช้ในเวอร์ชันถัดไป', '<button class="btn btn-dark" type="button" onclick="go(\'reports\',\'cashflow\')">ดูภาพรวมกระแสเงินสด</button>');
  else if (pid === 'team:employees') shell = empShell();
  else if (pid === 'project:overview') shell = projOvShell();
  else if (pid === 'project:list') shell = dimShell('projects');
  else if (pid === 'project:dept') shell = dimShell('departments');
  else if (pid === 'inventory:stock') shell = productsShell();
  else if (k === 'accounting' && ch === 'coa') shell = coaShell();
  else if (k === 'accounting' && ch === 'journal') shell = journalShell();
  else if (k === 'accounting' && ch) shell = emptyChildShell(ch);
  else if ((k === 'billing' && ch === 'prepaid') || (k === 'inventory' && ch === 'fixedAssets')) shell = emptyChildShell(ch, k);
  else if (k === 'accounting') shell = connectorShell();
  else if (DOC_GROUP_PAGES[k]) shell = docListShell(k);
  else if (k === 'customers') shell = contactsShell();
  else if (k === 'inventory') shell = productsShell();
  else if (k === 'tax') shell = taxShell();
  else if (k === 'reports') shell = reportsShell();
  c.innerHTML = shell + '<div id="pageData"></div>';
  bindShell();
  bindTxShell();
  if (pid === 'reports:standard') bindStdShell();
  refreshPageData();
}

function refreshPageData() {
  var el = byId('pageData');
  if (!el) return;
  var k = route.key, ch = route.child, html = '';
  var pid = k + ':' + ch;
  if (pid === 'accounting:bankTx') html = '<div id="bankBody">' + bankData() + '</div>';
  else if (pid === 'alldocs:batch') html = batchData();
  else if (pid === 'accounting:receiptCapture') html = ocrData();
  else if (pid === 'accounting:opening') html = obData();
  else if (pid === 'accounting:reconcile') html = reconData();
  else if (pid === 'accounting:monthClose') html = monthCloseData();
  else if (pid === 'tax:wht') html = whtListData();
  else if (TX_PAGES[pid]) html = txData(pid);
  else if (pid === 'billing:suppliers') html = contactsData();
  else if (pid === 'sales:products') html = productsData();
  else if (pid === 'sales:overview') html = salesOverviewData();
  else if (pid === 'inventory:overview') html = invOverviewData();
  else if (pid === 'tax:overview') html = taxOvData();
  else if (pid === 'settings:forms') html = formsData();
  else if (pid === 'settings:company') html = companyPageData();
  else if (pid === 'reports:standard') html = stdReportsData();
  else if (pid === 'reports:view') html = reportViewData();
  else if (pid === 'reports:cashflow') html = cashOverviewData();
  else if (k === 'reports' && ch !== 'performance') html = '';
  else if (pid === 'team:employees') html = empData();
  else if (pid === 'project:overview') html = projOvData();
  else if (pid === 'project:list') html = dimData('projects');
  else if (pid === 'project:dept') html = dimData('departments');
  else if (pid === 'inventory:stock') html = productsData();
  else if (k === 'accounting' && ch === 'coa') html = coaData();
  else if (k === 'accounting' && ch === 'journal') html = journalData();
  else if ((k === 'billing' && ch === 'prepaid') || (k === 'inventory' && ch === 'fixedAssets')) html = '';
  else if (DOC_GROUP_PAGES[k]) html = docListData(k);
  else if (k === 'customers') html = contactsData();
  else if (k === 'inventory') html = productsData();
  else if (k === 'tax') html = taxData();
  else if (k === 'reports') html = reportsData();
  el.innerHTML = html;
  if (pid === 'reports:performance' || pid === 'reports:cashflow' || pid === 'sales:overview') bindChart();
  if (pid === 'reports:standard') bindStdReports();
  if (pid === 'reports:view') bindReportView();
  if (pid === 'settings:forms') bindForms();
  if (pid === 'settings:company') bindCompanyPage();
  if (pid === 'settings:import') bindImportPage();
  if (pid === 'accounting:bankTx') bindBank();
  if (pid === 'alldocs:batch') bindBatch();
  if (pid === 'accounting:receiptCapture') bindOcr();
  if (pid === 'accounting:opening') bindOb();
  if (pid === 'accounting:reconcile') bindRecon();
  if (pid === 'accounting:monthClose') bindMonthClose();
  if (pid === 'tax:wht') bindWhtList();
  if (TX_PAGES[pid]) bindTx(pid);
  if (pid === 'inventory:overview') bindInvOverview();
  if (pid === 'tax:overview') bindTaxOv();
  if (pid === 'project:list' || pid === 'project:dept') bindDims();
  if (false) byId('pageData').querySelectorAll('[data-pay]').forEach(function(b) { b.addEventListener('click', async function() {
    var d = findDoc(b.dataset.pay); if (!d) return; b.disabled = true;
    try { await setRec('documents', d._id, Object.assign({}, strip(d), { status:'paid', paidDate: todayStr(), updatedAt: Date.now() })); showToast(d.party + ' เสร็จแล้ว'); } catch (e) { showToast(writeError(e)); b.disabled = false; }
  }); });
  if (k === 'accounting' && ch === 'coa') bindCoa();
}

function bindShell() {
  var c = byId('sectionContent');
  c.querySelectorAll('[data-open]').forEach(function(b) { b.addEventListener('click', function() { openDocForm(b.dataset.open); }); });
  c.querySelectorAll('[data-new]').forEach(function(b) { b.addEventListener('click', function() {
    var coll = b.dataset.new;
    if (coll === 'employees') return openRecordForm('employees', null, { empType:'full', active:'yes', startDate: todayStr() });
    var def = coll === 'contacts' ? { kind: pageState.contactTab === 'supplier' ? 'supplier' : 'customer', entity:'company' } : coll === 'products' ? { kind:'goods' } : { accType:'expense' };
    openRecordForm(coll, null, def);
  }); });
  c.querySelectorAll('[data-state]').forEach(function(inp) {
    var ev = inp.tagName === 'SELECT' || inp.type === 'date' || inp.type === 'month' ? 'change' : 'input';
    inp.addEventListener(ev, function() {
      var p = inp.dataset.state.split('.');
      if (p[0] === 'list') { listState[route.key] = listState[route.key] || {}; listState[route.key][p[1]] = inp.value; }
      else pageState[p[1]] = inp.value;
      refreshPageData();
    });
  });
  c.querySelectorAll('[data-tab]').forEach(function(b) { b.addEventListener('click', function() {
    pageState.contactTab = b.dataset.tab;
    c.querySelectorAll('[data-tab]').forEach(function(x) { x.classList.toggle('on', x === b); });
    refreshPageData();
  }); });
  var caret = byId('coaCaret'), drop = byId('coaDrop');
  if (caret) {
    caret.addEventListener('click', function(e) { e.stopPropagation(); drop.hidden = !drop.hidden; });
    document.addEventListener('click', function() { if (drop) drop.hidden = true; });
  }
  var std = byId('loadStdCoa');
  if (std) std.addEventListener('click', loadStandardCoa);
}

async function loadStandardCoa() {
  var btn = byId('loadStdCoa') || { };
  var have = {};
  STORE.accounts.forEach(function(a) { have[a.code] = 1; });
  var todo = STANDARD_COA.filter(function(r) { return !have[r[0]]; });
  if (!todo.length) { showToast('มีผังบัญชีมาตรฐานครบแล้ว'); return; }
  btn.disabled = true; showToast('กำลังเพิ่ม ' + todo.length + ' บัญชี…');
  try {
    for (var i = 0; i < todo.length; i++) await addRec('accounts', { code: todo[i][0], name: todo[i][1], type: subtypeBase(todo[i][2]), accType: todo[i][2], detailType: todo[i][3], taxCode: todo[i][4], createdAt: Date.now() });
    showToast('เพิ่มผังบัญชีมาตรฐาน ' + todo.length + ' บัญชีแล้ว');
  } catch (e) { showToast(writeError(e)); }
  renderPage();
}

function pageHead(title, sub, actions) {
  return '<div class="page-head"><div><h1 class="section-title">' + title + '</h1>' + (sub ? '<p class="section-sub">' + sub + '</p>' : '') + '</div>' +
    (actions ? '<div class="toolbar" style="margin:0">' + actions + '</div>' : '') + '</div>';
}
function tableOrEmpty(head, rows, emptyMsg, foot) {
  return '<div class="table-wrap"><table class="data-table"><thead><tr>' + head + '</tr></thead><tbody>' +
    (rows || '<tr><td colspan="12" class="empty-hint">' + emptyMsg + '</td></tr>') + '</tbody>' + (foot && rows ? '<tfoot>' + foot + '</tfoot>' : '') + '</table></div>';
}

/* ---- Connectors & empty children ---- */
function connectorShell() {
  var cards = SALES_CHANNELS.map(function(c) {
    return '<div class="connector-card"><div class="connector-badge" style="background:' + c.color + '">' + c.initials + '</div>' +
      '<div class="connector-name">' + c.name + '</div><div class="connector-desc">นำเข้ายอดขายจาก ' + c.name + ' อัตโนมัติ ลดการคีย์ข้อมูลด้วยมือ</div>' +
      '<button class="connector-connect" type="button" data-soon="1">เชื่อมต่อ (เร็ว ๆ นี้)</button></div>';
  }).join('');
  return '<h1 class="section-title">การบัญชี</h1><p class="section-sub">เลือกเมนูย่อยทางซ้ายเพื่อจัดการผังบัญชี สมุดรายวัน และงบทดลอง</p>' +
    '<div class="toolbar"><button class="chip-btn" type="button" onclick="go(\'accounting\',\'coa\')">ผังบัญชี →</button><button class="chip-btn" type="button" onclick="go(\'reports\',\'standard\')">รายงาน (สมุดรายวัน / งบทดลอง) →</button></div>' +
    '<div class="page-block"><h2>ซิงค์ช่องทางการขาย</h2><p class="hint">การเชื่อมต่ออัตโนมัติยังไม่เปิดให้ใช้ ระหว่างนี้บันทึกยอดขายเป็นใบเสร็จรับเงิน</p><div class="connector-grid">' + cards + '</div></div>';
}
function emptyChildShell(ch, k) {
  var parent = SUBNAV_ITEMS.find(function(s) { return s.key === (k || 'accounting'); }) || SUBNAV_ITEMS[0];
  var child = (parent.children || []).find(function(c) { return c.key === ch; }) || { label: ch };
  var info = CHILD_CONTENT[ch] || { title: child.label, desc: 'หน้านี้กำลังอยู่ระหว่างจัดทำ' };
  return '<div class="breadcrumb-bar"><span>' + parent.label + ' / ' + child.label + '</span></div><h1 class="section-title">' + child.label + '</h1>' +
    '<div class="empty-state"><div class="empty-state-text"><h3>' + info.title + '</h3><p>' + info.desc + '</p>' +
    (info.open ? '<button class="btn btn-primary" type="button" data-open="' + info.open + '">สร้าง' + DOC_TYPES[info.open].label + '</button>' : '') +
    '</div><div class="empty-state-illo">' + EMPTY_STATE_SVG + '</div></div>';
}

/* ---- Document lists ---- */
function docListShell(k) {
  var cfg = DOC_GROUP_PAGES[k];
  var st = listState[k] = listState[k] || {};
  var types = Object.keys(DOC_TYPES).filter(function(t) { return !DOC_TYPES[t].action && (cfg.group === 'all' || DOC_TYPES[t].group === cfg.group); });
  var create = cfg.group === 'all'
    ? '<button class="btn btn-primary btn-sm" type="button" onclick="openMenu()">+ สร้างเอกสาร</button>'
    : types.map(function(t) { return '<button class="chip-btn" type="button" data-open="' + t + '">+ ' + DOC_TYPES[t].label + '</button>'; }).join('');
  var hasStatus = types.some(function(t) { return DOC_TYPES[t].status; });
  var h = pageHead(cfg.title, cfg.sub) + '<div class="toolbar">' + create + '</div>';
  h += '<div class="toolbar">' +
    '<div class="field grow"><label for="lq">ค้นหา</label><input id="lq" type="search" data-state="list.q" value="' + esc(st.q || '') + '" placeholder="เลขที่ คู่ค้า หรือรายการ"></div>' +
    '<div class="field"><label for="lt">ประเภท</label><select id="lt" data-state="list.type"><option value="">ทุกประเภท</option>' +
      types.map(function(t) { return '<option value="' + t + '"' + (st.type === t ? ' selected' : '') + '>' + DOC_TYPES[t].label + '</option>'; }).join('') + '</select></div>' +
    (hasStatus ? '<div class="field"><label for="ls">สถานะ</label><select id="ls" data-state="list.status">' +
      [['','ทุกสถานะ'],['open','ค้างชำระทั้งหมด'],['overdue','เกินกำหนด'],['paid','ชำระแล้ว']].map(function(o) { return '<option value="' + o[0] + '"' + ((st.status || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' : '') +
    '<div class="field"><label for="lf">ตั้งแต่วันที่</label><input id="lf" type="date" data-state="list.from" value="' + esc(st.from || '') + '"></div>' +
    '<div class="field"><label for="lto">ถึงวันที่</label><input id="lto" type="date" data-state="list.to" value="' + esc(st.to || '') + '"></div>' +
    '</div>';
  return h;
}
function matchQ(d, q) {
  if (!q) return true;
  q = q.toLowerCase();
  var hay = [d.docNo, d.party, d.typeLabel, d.extra && d.extra.expCategory].concat((d.items || []).map(function(r) { return r.name || r.account || ''; })).join(' ').toLowerCase();
  return hay.indexOf(q) >= 0;
}
function docListData(k) {
  var cfg = DOC_GROUP_PAGES[k], st = listState[k] || {};
  var list = STORE.documents.filter(function(d) {
    if (cfg.group !== 'all' && d.group !== cfg.group) return false;
    if (st.type && d.type !== st.type) return false;
    if (st.status) { var s = docStatus(d); if (st.status === 'open' ? !(s === 'unpaid' || s === 'overdue') : s !== st.status) return false; }
    if (st.from && (d.date || '') < st.from) return false;
    if (st.to && (d.date || '') > st.to) return false;
    return matchQ(d, st.q);
  });
  var h = '';
  if (cfg.group === 'customer' || cfg.group === 'supplier') {
    var type = cfg.group === 'customer' ? 'invoice' : 'bill';
    var open = openItems(type), over = open.filter(function(d) { return docStatus(d) === 'overdue'; });
    var pl = plTotals(STORE.documents.filter(function(d) { return d.group === cfg.group && inRange(d.date || '', periodRange('month')); }));
    h += '<div class="kpi-row">' +
      kpi(cfg.group === 'customer' ? 'รายได้เดือนนี้ (ไม่รวม VAT)' : 'ค่าใช้จ่ายเดือนนี้ (ไม่รวม VAT)', fmtMoney(cfg.group === 'customer' ? pl.rev : pl.exp, 0)) +
      kpi(cfg.group === 'customer' ? 'ค้างรับทั้งหมด' : 'ค้างจ่ายทั้งหมด', fmtMoney(sumNet(open), 0), open.length + ' ใบ') +
      kpi('เกินกำหนด', fmtMoney(sumNet(over), 0), over.length + ' ใบ', over.length ? 'neg' : '') + '</div><div style="height:14px"></div>';
  }
  var total = round2(list.reduce(function(s, d) { return s + (Number(d.total) || 0); }, 0));
  h += tableOrEmpty('<th>เลขที่</th><th>ประเภท</th><th>คู่ค้า/รายละเอียด</th><th>วันที่</th><th>สถานะ</th><th class="r">จำนวนเงิน</th>',
    list.map(docRow).join(''),
    STORE.documents.length ? 'ไม่พบเอกสารที่ตรงกับตัวกรอง' : 'ยังไม่มีเอกสาร กดปุ่ม + ด้านบนเพื่อเริ่มสร้าง',
    '<tr><td colspan="5">' + list.length + ' รายการ</td><td class="r">' + fmtMoney(total) + '</td></tr>');
  return h;
}
function kpi(label, value, sub, cls) {
  return '<div class="glance-card"><div class="glance-label">' + label + '</div><div class="glance-value ' + (cls || '') + '">' + value + '</div>' + (sub ? '<div class="glance-sub">' + sub + '</div>' : '') + '</div>';
}

/* ---- Transaction tables (ค่าใช้จ่าย / การขาย) ---- */
var TX_PAGES = {
  'billing:expenseTx': { title:'ค่าใช้จ่าย', group:'supplier', partyHead:'ผู้รับเงิน', cat:true, status:true, action:['ชำระใบเรียกเก็บเงิน', "go('billing','bill'); listTxOpen('billing:bill')"] },
  'billing:bill':      { title:'บิล', group:'supplier', type:'bill', partyHead:'ผู้ขาย', cat:true, status:true, action:['ชำระใบเรียกเก็บเงิน', "txState['billing:bill'].status='open'; refreshPageData()"] },
  'sales:salesTx':     { cat:true, title:'ธุรกรรมการขาย', group:'customer', partyHead:'ลูกค้า', status:true, action:['รับชำระเงิน', "openDocForm('payment')"] },
  'sales:invoice':     { cat:true, title:'ใบแจ้งหนี้', group:'customer', type:'invoice', partyHead:'ลูกค้า', status:true, action:['รับชำระเงิน', "openDocForm('payment')"] },
  'sales:salesOrder':  { title:'ใบสั่งขาย', group:'customer', type:'salesOrder', partyHead:'ลูกค้า', status:true },
  'inventory:purchaseOrder': { title:'ใบสั่งซื้อ', group:'supplier', type:'purchaseOrder', partyHead:'ซัพพลายเออร์', status:true },
  'inventory:receipt': { cat:true, title:'ใบเสร็จรายการ', group:'customer', type:'receipt', partyHead:'ลูกค้า' },
  'inventory:salesOrder': { title:'ใบสั่งขาย', group:'customer', type:'salesOrder', partyHead:'ลูกค้า', status:true }
};
var txState = {};
var TX_PAGE_SIZE = 25;
var UNCATEGORIZED = 'ค่าใช้จ่ายที่ยังไม่ได้จัดประเภท';
function listTxOpen(pid) { txState[pid] = Object.assign(txState[pid] || {}, { status:'open' }); refreshPageData(); }
// status for transaction lists: cash documents are paid on the spot
function txStatus(d) {
  if (d.voided) return 'void';
  if (['expense','checkPayment','receipt','refundReceipt','payment'].indexOf(d.type) >= 0) return 'paid';
  return docStatus(d);
}
function txStatusPill(d) { var s = txStatus(d); var lbl = s === 'paid' && !(DOC_TYPES[d.type] || {}).status ? 'ชำระแล้ว' : (STATUS_LABEL[s] || statusText(d)); return '<span class="status st-' + s + '">' + lbl + '</span>'; }
function txSt(pid) { return txState[pid] = txState[pid] || { type:'', period:'last12', status:'', page:0 }; }
function txShell(pid) {
  var cfg = TX_PAGES[pid], st = txSt(pid);
  var types = Object.keys(DOC_TYPES).filter(function(t) { return !DOC_TYPES[t].action && DOC_TYPES[t].group === cfg.group; });
  var newTypes = cfg.type ? [cfg.type].concat(types.filter(function(t) { return t !== cfg.type; })) : types;
  var h = '<div class="tx-head"><h1 class="section-title">' + cfg.title + '</h1><div class="coa-actions">' +
    (cfg.action ? '<button class="btn btn-outline" type="button" onclick="' + cfg.action[1] + '">' + cfg.action[0] + '</button>' : '') +
    '<div class="split"><button class="btn btn-dark" type="button" id="txNewBtn">' + (cfg.type ? 'สร้าง' + DOC_TYPES[cfg.type].label : 'ธุรกรรมใหม่') + ' <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px"><path d="M6 9l6 6 6-6"/></svg></button>' +
    '<div class="drop" id="txDrop" hidden>' + newTypes.map(function(t) { return '<button type="button" data-open="' + t + '">' + DOC_TYPES[t].label + '</button>'; }).join('') + '</div></div></div></div>';
  h += '<div class="coa-filters">';
  if (!cfg.type) h += '<select class="coa-select" data-tx="type" aria-label="ชนิดธุรกรรม"><option value="">ธุรกรรมทั้งหมด</option>' + types.map(function(t) { return '<option value="' + t + '"' + (st.type === t ? ' selected' : '') + '>' + DOC_TYPES[t].label + '</option>'; }).join('') + '</select>';
  if (cfg.status) h += '<select class="coa-select" data-tx="status" aria-label="สถานะ">' + [['','ทุกสถานะ'],['open','ค้างชำระ'],['overdue','เกินกำหนด'],['paid','ชำระแล้ว']].map(function(o) { return '<option value="' + o[0] + '"' + (st.status === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
  h += '<label class="date-chip">วันที่: <select data-tx="period" aria-label="ช่วงวันที่">' + [['month','เดือนนี้'],['quarter','ไตรมาสนี้'],['year','ปีนี้'],['last12','12 เดือนที่ผ่านมา'],['all','ทั้งหมด'],['custom','กำหนดวันที่เอง']].map(function(o) { return '<option value="' + o[0] + '"' + (st.period === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' + customRangeHTML(st.period);
  h += '<label class="coa-search" style="margin-left:auto"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input type="search" data-tx="q" value="' + esc(st.q || '') + '" placeholder="ค้นหาหมายเลขหรือชื่อ" aria-label="ค้นหา"></label></div>';
  return h;
}
function expenseCategories() {
  var cats = {}; cats[UNCATEGORIZED] = 1;
  if (accountsFor('supplier').length) { var r = [UNCATEGORIZED]; accountsFor('supplier').forEach(function(a) { r.push(a.name); }); STORE.documents.forEach(function(d) { var c = d.extra && d.extra.expCategory; if (c && r.indexOf(c) < 0) r.push(c); }); return r; }
  STORE.accounts.forEach(function(a) { var b = subtypeBase(accSubtype(a)); if (b === 'expense') cats[a.name] = 1; });
  STORE.documents.forEach(function(d) { if (d.extra && d.extra.expCategory) cats[d.extra.expCategory] = 1; });
  if (Object.keys(cats).length < 3) ['ค่าเช่า','ค่าสาธารณูปโภค','ค่าโฆษณา','การซื้อ','เงินเดือนและค่าจ้าง'].forEach(function(c) { cats[c] = 1; });
  return Object.keys(cats);
}
function txList(pid) {
  var cfg = TX_PAGES[pid], st = txSt(pid), r = periodRange(st.period), q = (st.q || '').toLowerCase();
  return STORE.documents.filter(function(d) {
    if (d.group !== cfg.group) return false;
    if (cfg.type && d.type !== cfg.type) return false;
    if (st.type && d.type !== st.type) return false;
    if (st.status) { var s = txStatus(d); if (st.status === 'open' ? !(s === 'unpaid' || s === 'overdue' || s === 'partial') : s !== st.status) return false; }
    if (!inRange(d.date || '', r)) return false;
    return !q || matchQ(d, q);
  }).sort(function(a, b) { return (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0); });
}
function txData(pid) {
  var cfg = TX_PAGES[pid], st = txSt(pid);
  var list = txList(pid);
  var pages = Math.max(1, Math.ceil(list.length / TX_PAGE_SIZE));
  if (st.page >= pages) st.page = pages - 1;
  var slice = list.slice(st.page * TX_PAGE_SIZE, (st.page + 1) * TX_PAGE_SIZE);
  var INC_NONE = 'รายได้ที่ยังไม่ได้จัดประเภท';
  var cats = !cfg.cat ? [] : cfg.group === 'customer' ? [INC_NONE].concat(accountsFor('customer').map(function(a) { return a.name; })) : expenseCategories();
  var chev = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
  var sub = 0, vat = 0, tot = 0;
  var rows = slice.map(function(d) {
    var def = DOC_TYPES[d.type] || {};
    var s = docSign(d), pre = (d.subtotal != null ? d.subtotal : d.total || 0) * s, v = (d.vat || 0) * s, t = (d.total || 0) * s;
    sub += pre; vat += v; tot += t;
    var cell = '';
    if (cfg.cat) {
      var cur = cfg.group === 'customer' ? ((d.extra && d.extra.incomeCat) || INC_NONE) : ((d.extra && d.extra.expCategory) || UNCATEGORIZED);
      if (!DOC_TYPES[d.type] || (!DOC_TYPES[d.type].flow && ['estimate','salesOrder','purchaseOrder'].indexOf(d.type) < 0)) { cell = '<td class="muted">–</td>'; } else {
      var opts = cats.indexOf(cur) < 0 ? cats.concat([cur]) : cats;
      cell = '<td><select class="cat-select" data-cat="' + esc(d._id) + '" aria-label="หมวดหมู่">' + opts.map(function(c) { var a = STORE.accounts.find(function(x) { return x.name === c; }); return '<option value="' + esc(c) + '"' + (c === cur ? ' selected' : '') + '>' + esc(a ? a.code + ' ' + c : c) + '</option>'; }).join('') + '</select></td>';
    } }
    var stCell = cfg.status ? '<td>' + txStatusPill(d) + '</td>' : '';
    var open = def.status && docStatus(d) !== 'paid';
    var act = open ? '<button type="button" class="act-btn" data-pay="' + esc(d._id) + '">' + (def.proj ? 'ทำเครื่องหมายว่าเสร็จแล้ว' : def.order ? 'ปิดคำสั่ง' : d.group === 'customer' ? 'รับชำระเงิน' : 'จ่ายชำระ') + '</button>' : '<button type="button" class="act-btn" data-doc="' + esc(d._id) + '">ดู/แก้ไข</button>';
    return '<tr class="' + (st.sel && st.sel[d._id] ? 'sel' : '') + '"><td class="cb"><input type="checkbox" data-txsel="' + esc(d._id) + '"' + (st.sel && st.sel[d._id] ? ' checked' : '') + ' aria-label="เลือก"></td>' +
      '<td class="num" style="white-space:nowrap">' + fmtDateNum(d.date) + '</td><td>' + esc(d.typeLabel || '') + '</td><td class="num">' + esc(d.docNo || '') + '</td><td>' + esc(d.party || '') + '</td>' + cell +
      '<td class="r">' + fmtMoney(pre) + '</td><td class="r">' + fmtMoney(v) + '</td><td class="r">' + fmtMoney(t) + '</td>' + stCell +
      '<td class="act">' + act + '<button type="button" class="act-caret" data-doc="' + esc(d._id) + '" aria-label="ตัวเลือกเพิ่มเติม">' + chev + '</button></td></tr>';
  }).join('');
  var cols = 9 + (cfg.cat ? 1 : 0) + (cfg.status ? 1 : 0);
  var head = '<th class="cb"><input type="checkbox" id="txAll" aria-label="เลือกทั้งหมด"></th><th>วันที่</th><th>ชนิด</th><th>หมายเลข</th><th>' + cfg.partyHead + '</th>' + (cfg.cat ? '<th>' + (cfg.group === 'customer' ? 'บัญชีรายได้' : 'หมวดหมู่') + '</th>' : '') +
    '<th class="r">ยอดรวมก่อนภาษี</th><th class="r">ภาษีมูลค่าเพิ่ม</th><th class="r">ยอดรวม</th>' + (cfg.status ? '<th>สถานะ</th>' : '') + '<th>การกระทำ</th>';
  var foot = rows ? '<tfoot><tr><td></td><td colspan="' + (4 + (cfg.cat ? 1 : 0)) + '" class="muted">ยอดรวม (หน้านี้)</td><td class="r">' + fmtMoney(sub) + '</td><td class="r">' + fmtMoney(vat) + '</td><td class="r">' + fmtMoney(tot) + '</td><td colspan="' + (cfg.status ? 2 : 1) + '"></td></tr></tfoot>' : '';
  var from = list.length ? st.page * TX_PAGE_SIZE + 1 : 0, to = Math.min(list.length, (st.page + 1) * TX_PAGE_SIZE);
  function pg(label, p, on) { return '<button type="button" class="pg" data-page="' + p + '"' + (on ? '' : ' disabled') + '>' + label + '</button>'; }
  return '<div class="table-wrap coa-table tx-table"><table class="data-table"><thead><tr>' + head + '</tr></thead><tbody>' +
    (rows || '<tr><td colspan="' + cols + '" class="empty-hint">' + (STORE.documents.some(function(d) { return d.group === cfg.group; }) ? 'ไม่พบธุรกรรมในช่วงเวลาหรือตัวกรองนี้' : 'ยังไม่มีธุรกรรม กด "' + (cfg.type ? 'สร้าง' + DOC_TYPES[cfg.type].label : 'ธุรกรรมใหม่') + '" เพื่อเริ่ม') + '</td></tr>') +
    '</tbody>' + foot + '</table></div>' +
    '<div class="pager">' + pg('อันดับแรก', 0, st.page > 0) + pg('ก่อนหน้า', st.page - 1, st.page > 0) + '<span class="num"><b>' + from + ' - ' + to + '</b> จาก ' + list.length + '</span>' + pg('ถัดไป', st.page + 1, st.page < pages - 1) + pg('อันดับสุดท้าย', pages - 1, st.page < pages - 1) + '</div>';
}
function fmtDateNum(s) { if (!s) return '-'; var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
function bindTx(pid) {
  var st = txSt(pid), c = byId('pageData');
  st.sel = st.sel || {};
  c.querySelectorAll('[data-cat]').forEach(function(sel) { sel.addEventListener('change', async function() {
    var d = findDoc(sel.dataset.cat); if (!d) return;
    sel.disabled = true;
    try {
      var ac = STORE.accounts.find(function(x) { return x.name === sel.value; }); var none = sel.value === UNCATEGORIZED || sel.value === 'รายได้ที่ยังไม่ได้จัดประเภท'; var patch = { account: ac ? ac.code : '' }; patch[d.group === 'customer' ? 'incomeCat' : 'expCategory'] = none ? '' : sel.value; var extra = Object.assign({}, d.extra || {}, patch);
      await setRec('documents', d._id, Object.assign({}, strip(d), { extra: extra, updatedAt: Date.now() }));
      showToast('เปลี่ยนหมวดหมู่เป็น ' + sel.value);
    } catch (e) { showToast(writeError(e)); sel.disabled = false; }
  }); });
  c.querySelectorAll('[data-pay]').forEach(function(b) { b.addEventListener('click', async function() {
    var d = findDoc(b.dataset.pay); if (!d) return;
    if (DOC_TYPES[d.type].flow) { openPayment(d); return; }
    b.disabled = true;
    try { await setRec('documents', d._id, Object.assign({}, strip(d), { status:'paid', paidDate: todayStr(), updatedAt: Date.now() })); showToast((d.docNo || '') + (DOC_TYPES[d.type].order ? ' ปิดแล้ว' : ' ชำระแล้ว')); }
    catch (e) { showToast(writeError(e)); b.disabled = false; }
  }); });
  c.querySelectorAll('[data-page]').forEach(function(b) { b.addEventListener('click', function() { st.page = Number(b.dataset.page); refreshPageData(); }); });
  c.querySelectorAll('[data-txsel]').forEach(function(cb) { cb.addEventListener('change', function() { st.sel[cb.dataset.txsel] = cb.checked; cb.closest('tr').classList.toggle('sel', cb.checked); }); });
  var all = byId('txAll');
  if (all) all.addEventListener('change', function() { c.querySelectorAll('[data-txsel]').forEach(function(cb) { cb.checked = all.checked; st.sel[cb.dataset.txsel] = all.checked; cb.closest('tr').classList.toggle('sel', all.checked); }); });
}
function bindTxShell() {
  var sc = byId('sectionContent'), pid = route.key + ':' + route.child;
  if (!TX_PAGES[pid]) return;
  sc.querySelectorAll('[data-tx]').forEach(function(el) {
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function() { var st = txSt(pid); st[el.dataset.tx] = el.value; st.page = 0; refreshPageData(); });
  });
  var nb = byId('txNewBtn'), dr = byId('txDrop');
  if (nb) {
    nb.addEventListener('click', function(e) { e.stopPropagation(); dr.hidden = !dr.hidden; });
    document.addEventListener('click', function() { dr.hidden = true; });
  }
}

/* ---- Sales overview ---- */
function salesOverviewShell() {
  return '<div class="tx-head"><h1 class="section-title">ภาพรวมการขาย</h1><div class="coa-actions"><button class="btn btn-outline" type="button" onclick="openDocForm(\'payment\')">รับชำระเงิน</button><button class="btn btn-dark" type="button" data-open="invoice">สร้างใบแจ้งหนี้</button></div></div>';
}
function salesOverviewData() {
  var ar = openItems('invoice'), over = ar.filter(function(d) { return docStatus(d) === 'overdue'; });
  var t = todayStr(), paid30 = STORE.documents.filter(function(d) { return d.type === 'invoice' && d.status === 'paid' && d.paidDate && daysBetween(d.paidDate, t) <= 30; });
  var m = plTotals(STORE.documents.filter(function(d) { return inRange(d.date || '', periodRange('month')); }));
  var y = plTotals(STORE.documents.filter(function(d) { return inRange(d.date || '', periodRange('year')); }));
  var h = '<div class="kpi-row">' + kpi('รายได้เดือนนี้', fmtMoney(m.rev, 0), 'ปีนี้ ' + fmtMoney(y.rev, 0)) +
    kpi('ยังไม่ชำระ', fmtMoney(sumNet(ar), 0), ar.length + ' ใบแจ้งหนี้') +
    kpi('เกินกำหนด', fmtMoney(sumNet(over), 0), over.length + ' ใบแจ้งหนี้', over.length ? 'neg' : '') +
    kpi('ชำระแล้ว 30 วันล่าสุด', fmtMoney(round2(paid30.reduce(function(a, d) { return a + docNet(d); }, 0)), 0), paid30.length + ' ใบแจ้งหนี้') + '</div>';
  var months = last12Months();
  h += '<div class="page-block"><h2>รายได้และค่าใช้จ่ายรายเดือน</h2>' + barChart(months, months.map(function(mm) { return plTotals(STORE.documents.filter(function(d) { return (d.date || '').slice(0,7) === mm; })); })) + '</div>';
  var due = ar.slice().sort(function(a, b) { return ((a.extra && a.extra.dueDate) || a.date || '').localeCompare((b.extra && b.extra.dueDate) || b.date || ''); }).slice(0, 8);
  h += '<div class="page-block"><h2>ใบแจ้งหนี้ที่ต้องติดตาม</h2>' + tableOrEmpty('<th>หมายเลข</th><th>ลูกค้า</th><th>ครบกำหนด</th><th>สถานะ</th><th class="r">ยอดค้าง</th>',
    due.map(function(d) { return '<tr class="row-link" tabindex="0" data-doc="' + esc(d._id) + '"><td class="docno">' + esc(d.docNo) + '</td><td>' + esc(d.party) + '</td><td>' + fmtDate((d.extra && d.extra.dueDate) || d.date) + '</td><td>' + statusPill(d) + '</td><td class="r">' + fmtMoney(docNet(d)) + '</td></tr>'; }).join(''),
    'ไม่มีใบแจ้งหนี้ค้างชำระ') + '</div>';
  return h;
}

/* ---- Inventory overview ---- */
pageState.bestDays = 30;
function stockRows() {
  return STORE.products.filter(function(p) { return p.kind !== 'service'; }).map(function(p) {
    var rp = p.reorderPoint != null && p.reorderPoint !== '' ? Number(p.reorderPoint) : 5;
    return { p: p, stock: productStock(p), rp: rp };
  });
}
function invOverviewShell() {
  var chips = [['addProduct','เพิ่มผลิตภัณฑ์หรือบริการ'],['salesOrder','สร้างใบสั่งขาย'],['purchaseOrder','สร้างใบสั่งซื้อ'],['inventoryAdjust','ปรับสินค้าคงคลัง']];
  return '<h1 class="section-title" style="margin-bottom:18px">ภาพรวมสินค้าคงคลัง</h1>' +
    '<div class="quick-row" style="margin-bottom:24px"><span class="ql">สร้างการดำเนินการ</span>' + chips.map(function(c) { return '<button class="chip-btn" type="button" data-open="' + c[0] + '">' + c[1] + '</button>'; }).join('') +
    '<button class="chip-link" type="button" onclick="openMenu()">แสดงทั้งหมด</button></div><h2 class="glance-title">สรุปสินค้าคงคลัง</h2>';
}
function invCard(o) {
  return '<div class="inv-card"><div class="inv-card-head"><span>' + o.title + '</span><span class="small muted">' + (o.right || 'ในวันนี้') + '</span></div>' +
    (o.value != null ? '<div class="inv-value num">' + o.value + '</div><div class="inv-sub">' + (o.sub || '') + '</div>' : '') +
    '<div class="inv-table">' + o.table + '</div>' +
    '<div class="inv-foot">' + (o.link ? '<button type="button" class="chip-link" style="padding:0" onclick="' + o.link[1] + '">' + o.link[0] + '</button>' : '') + '</div></div>';
}
function miniTable(head, rows, empty) {
  return '<table class="data-table"><thead><tr>' + head.map(function(h, i) { return '<th' + (i ? ' class="r"' : '') + '>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
    (rows.length ? rows.map(function(r) { return '<tr' + (r.id ? ' class="row-link" tabindex="0" data-' + r.kind + '="' + esc(r.id) + '"' : '') + '>' + r.cells.map(function(c, i) { return '<td' + (i ? ' class="r"' : '') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('')
      : '<tr><td colspan="' + head.length + '" class="inv-empty">' + (empty || 'ข้อมูลจะปรากฏเมื่อพร้อมใช้งาน') + '</td></tr>') + '</tbody></table>';
}
function invOverviewData() {
  var sr = stockRows();
  var low = sr.filter(function(r) { return r.stock > 0 && r.stock <= r.rp; });
  var out = sr.filter(function(r) { return r.stock <= 0; });
  var adj = function(r) { return '<button type="button" class="act-btn small" data-adjust="' + esc(r.p.name) + '">ปรับสต็อก</button>'; };
  var days = Number(pageState.bestDays) || 30, t = todayStr();
  var best = {};
  STORE.documents.forEach(function(d) {
    if ((d.type !== 'invoice' && d.type !== 'salesOrder') || !d.items || d.type === 'salesOrder') return;
    if (daysBetween(d.date || t, t) > days) return;
    d.items.forEach(function(it) { var b = best[it.name] = best[it.name] || { q:0, amt:0 }; b.q += Number(it.qty) || 0; b.amt += (Number(it.qty) || 0) * (Number(it.price) || 0); });
  });
  var bestRows = Object.keys(best).sort(function(a, b) { return best[b].amt - best[a].amt; }).slice(0, 6).map(function(k) { return { cells:[esc(k), fmtNum(best[k].q), fmtMoney(best[k].amt)] }; });
  var so = STORE.documents.filter(function(d) { return d.type === 'salesOrder' && d.status !== 'paid'; });
  var po = STORE.documents.filter(function(d) { return d.type === 'purchaseOrder' && d.status !== 'paid'; });
  var docRows = function(list) { return list.slice(0, 6).map(function(d) { return { id:d._id, kind:'doc', cells:['<span class="docno">' + esc(d.docNo) + '</span>', esc(d.party), fmtMoney(d.total)] }; }); };
  var h = '<div class="inv-grid">';
  h += invCard({ title:'สินค้าเหลือน้อย', value: low.length, sub:'<span class="ic-warn">!</span> สินค้าเหลือน้อย', table: miniTable(['ผลิตภัณฑ์','ปริมาณ','การดำเนินการ'], low.map(function(r) { return { cells:[esc(r.p.name), fmtNum(r.stock), adj(r)] }; })), link:['ดูผลิตภัณฑ์ทั้งหมด', "go('inventory','stock')"] });
  h += invCard({ title:'สินค้าหมด', value: out.length, sub:'<span class="ic-bad">▲</span> สินค้าหมด', table: miniTable(['ผลิตภัณฑ์','ปริมาณ','การดำเนินการ'], out.map(function(r) { return { cells:[esc(r.p.name), fmtNum(r.stock), adj(r)] }; })), link:['ดูผลิตภัณฑ์ทั้งหมด', "go('inventory','stock')"] });
  h += invCard({ title:'ผลิตภัณฑ์ขายดี', right:'<select class="inv-days" id="bestDays" aria-label="ช่วงเวลา">' + [[7,'7 วันที่ผ่านมา'],[30,'30 วันที่ผ่านมา'],[90,'90 วันที่ผ่านมา'],[365,'365 วันที่ผ่านมา']].map(function(o) { return '<option value="' + o[0] + '"' + (days === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>',
    table: miniTable(['ชื่อผลิตภัณฑ์','ปริมาณที่ขาย','การขาย'], bestRows, 'ยังไม่มียอดขายจากใบแจ้งหนี้ในช่วงนี้'), link:['ดูยอดขายตามรายงานผลิตภัณฑ์', 'openSalesByProduct()'] });
  h += invCard({ title:'คำสั่งขายที่เปิดอยู่', value: fmtMoney(sumBy(so, 'total')), sub: so.length + ' คำสั่งขายที่เปิดอยู่', table: miniTable(['หมายเลขคำสั่ง','ลูกค้า','จำนวน'], docRows(so)), link:['สร้างใบสั่งขาย', "openDocForm('salesOrder')"] });
  h += invCard({ title:'ใบสั่งซื้อที่เปิดอยู่', value: fmtMoney(sumBy(po, 'total')), sub: po.length + ' เปิดใบสั่งซื้อ', table: miniTable(['หมายเลข PO','ซัพพลายเออร์','จำนวน'], docRows(po)), link:['สร้างใบสั่งซื้อ', "openDocForm('purchaseOrder')"] });
  var reports = [['สรุปการประเมินมูลค่าสินค้าคงคลัง', "go('inventory','stock')"], ['ใบงานตรวจนับสต็อก', 'openStockCount()'], ['รายการผลิตภัณฑ์และบริการ', "go('sales','products')"], ['ยอดขายตามผลิตภัณฑ์ - สรุป', 'openSalesByProduct()'], ['ใบสั่งขายที่เปิดอยู่', "go('inventory','salesOrder')"], ['ใบสั่งซื้อที่เปิดอยู่', "go('inventory','purchaseOrder')"]];
  h += '<div class="inv-card"><div class="inv-card-head"><span>รายงานสินค้าคงคลัง</span></div><div class="inv-reports">' + reports.map(function(r) { return '<button type="button" onclick="' + r[1] + '"><span>' + r[0] + '</span><span class="chip-link">ดู</span></button>'; }).join('') + '</div></div>';
  return h + '</div>';
}
function bindInvOverview() {
  var s = byId('bestDays'); if (s) s.addEventListener('change', function() { pageState.bestDays = Number(s.value); refreshPageData(); });
  byId('pageData').querySelectorAll('[data-adjust]').forEach(function(b) { b.addEventListener('click', function() {
    openDocForm('inventoryAdjust'); byId('f_party').value = b.dataset.adjust;
  }); });
}
function openSalesByProduct() {
  var by = {};
  STORE.documents.forEach(function(d) { if (d.type === 'invoice' && d.items) d.items.forEach(function(it) { var b = by[it.name] = by[it.name] || { q:0, amt:0, n:0 }; b.q += Number(it.qty) || 0; b.amt += (Number(it.qty) || 0) * (Number(it.price) || 0); b.n++; }); });
  var keys = Object.keys(by).sort(function(a, b) { return by[b].amt - by[a].amt; }), tot = 0;
  openModal({ title:'ยอดขายตามผลิตภัณฑ์ - สรุป', focus:false, body: '<div class="items-wrap"><table class="data-table"><thead><tr><th>ผลิตภัณฑ์/บริการ</th><th class="r">ปริมาณ</th><th class="r">ยอดขาย</th><th class="r">ราคาเฉลี่ย</th></tr></thead><tbody>' +
    (keys.map(function(k) { tot += by[k].amt; return '<tr><td>' + esc(k) + '</td><td class="r">' + fmtNum(by[k].q) + '</td><td class="r">' + fmtMoney(by[k].amt) + '</td><td class="r">' + fmtMoney(by[k].q ? by[k].amt / by[k].q : 0) + '</td></tr>'; }).join('') || '<tr><td colspan="4" class="empty-hint">ยังไม่มีรายการขายในใบแจ้งหนี้</td></tr>') +
    '</tbody>' + (keys.length ? '<tfoot><tr><td colspan="2">รวม (ไม่รวม VAT)</td><td class="r">' + fmtMoney(tot) + '</td><td></td></tr></tfoot>' : '') + '</table></div>', buttons:[{ label:'ปิด', cls:'btn-primary', onClick: closeModal }] });
}
function openStockCount() {
  var sr = stockRows();
  openModal({ title:'ใบงานตรวจนับสต็อก ' + fmtDate(todayStr()), focus:false, body: '<p class="small muted" style="margin:0">กรอกจำนวนที่นับได้จริง ระบบจะสร้างรายการปรับสินค้าคงคลังให้เฉพาะรายการที่ต่างจากในระบบ</p><div class="items-wrap"><table class="data-table"><thead><tr><th>ผลิตภัณฑ์</th><th class="r">ในระบบ</th><th style="width:120px">นับได้</th><th class="r">ผลต่าง</th></tr></thead><tbody>' +
    (sr.map(function(r, i) { return '<tr><td>' + esc(r.p.name) + ' <span class="small muted">' + esc(r.p.unit || '') + '</span></td><td class="r">' + fmtNum(r.stock) + '</td><td><input type="number" step="any" class="cnt-in" data-i="' + i + '" aria-label="จำนวนที่นับได้"></td><td class="r" id="cntd' + i + '"></td></tr>'; }).join('') || '<tr><td colspan="4" class="empty-hint">ยังไม่มีสินค้าที่นับสต็อก</td></tr>') + '</tbody></table></div>',
    buttons:[CANCEL_BTN, { label:'บันทึกผลตรวจนับ', cls:'btn-dark', onClick: function(btn) {
      var adj = [];
      document.querySelectorAll('.cnt-in').forEach(function(inp) { if (inp.value === '') return; var r = sr[Number(inp.dataset.i)], diff = round2(Number(inp.value) - r.stock); if (diff) adj.push({ r: r, diff: diff }); });
      if (!adj.length) { showToast('ไม่มีรายการที่ต้องปรับ'); return; }
      runSave(btn, async function() {
        for (var i = 0; i < adj.length; i++) {
          await addRec('documents', { type:'inventoryAdjust', typeLabel: DOC_TYPES.inventoryAdjust.label, group:'other', party: adj[i].r.p.name, date: todayStr(), docNo: nextDocNo('inventoryAdjust', todayStr()), extra:{ qtyChange: adj[i].diff, reason:'ตรวจนับสต็อก' }, items:null, total:0, status:'done', createdAt: Date.now() });
        }
        showToast('ปรับสต็อก ' + adj.length + ' รายการแล้ว'); closeModal();
      });
    } }],
    onMount: function() { document.querySelectorAll('.cnt-in').forEach(function(inp) { inp.addEventListener('input', function() { var r = sr[Number(inp.dataset.i)]; byId('cntd' + inp.dataset.i).textContent = inp.value === '' ? '' : fmtNum(Number(inp.value) - r.stock); }); }); } });
}

/* ---- Team: employees ---- */
pageState.empQ = ''; pageState.empShow = 'yes';
function empHours(name, ym) {
  return round2(STORE.documents.filter(function(d) {
    if (d.group !== 'team') return false;
    if (ym && (d.date || '').slice(0,7) !== ym) return false;
    var who = d.type === 'weeklyTimesheet' ? d.party : (d.extra && d.extra.employee);
    return who === name;
  }).reduce(function(s, d) { return s + (Number(d.extra && d.extra.hours) || 0); }, 0));
}
function empShell() {
  return '<div class="tx-head"><h1 class="section-title">พนักงาน</h1><div class="coa-actions"><button class="btn btn-outline" type="button" data-open="weeklyTimesheet">บันทึกเวลาทำงาน</button><button class="btn btn-dark" type="button" data-new="employees">เพิ่มพนักงาน</button></div></div>' +
    '<div class="coa-filters"><label class="coa-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input type="search" data-state="page.empQ" value="' + esc(pageState.empQ) + '" placeholder="ค้นหาชื่อหรือตำแหน่ง" aria-label="ค้นหาพนักงาน"></label>' +
    '<select class="coa-select" data-state="page.empShow" aria-label="สถานะ">' + [['yes','ทำงานอยู่'],['no','ลาออกแล้ว'],['','ทั้งหมด']].map(function(o) { return '<option value="' + o[0] + '"' + (pageState.empShow === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>';
}
function empData() {
  var q = (pageState.empQ || '').toLowerCase(), ym = todayStr().slice(0,7);
  var TYPE = { full:'พนักงานประจำ', part:'พาร์ทไทม์', contract:'ฟรีแลนซ์/สัญญาจ้าง' };
  var list = STORE.employees.filter(function(e) { return (!pageState.empShow || (e.active || 'yes') === pageState.empShow) && (!q || [e.name, e.position].join(' ').toLowerCase().indexOf(q) >= 0); });
  var totH = 0, totPay = 0;
  var rows = list.map(function(e) {
    var h = empHours(e.name, ym); totH += h;
    var pay = e.salary ? Number(e.salary) : (Number(e.hourlyRate) || 0) * h; totPay += pay;
    return '<tr class="row-link" tabindex="0" data-emp="' + esc(e._id) + '"><td><b>' + esc(e.name) + '</b><div class="small muted">' + esc(e.position || '') + '</div></td><td>' + (TYPE[e.empType] || '-') + '</td>' +
      '<td class="num">' + (e.startDate ? fmtDateNum(e.startDate) : '-') + '</td><td>' + esc([e.phone, e.email].filter(Boolean).join(' · ') || '-') + '</td>' +
      '<td class="r">' + fmtNum(h) + '</td><td class="r">' + (pay ? fmtMoney(pay) : '<span class="muted">–</span>') + '</td>' +
      '<td>' + ((e.active || 'yes') === 'yes' ? '<span class="status st-paid">ทำงานอยู่</span>' : '<span class="status st-done">ลาออกแล้ว</span>') + '</td></tr>';
  }).join('');
  return '<div class="table-wrap coa-table"><table class="data-table"><thead><tr><th>ชื่อ</th><th>ประเภท</th><th>เริ่มงาน</th><th>ติดต่อ</th><th class="r">ชั่วโมงเดือนนี้</th><th class="r">ค่าจ้างโดยประมาณ</th><th>สถานะ</th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="7" class="empty-hint">' + (STORE.employees.length ? 'ไม่พบพนักงานที่ค้นหา' : 'ยังไม่มีพนักงาน กด "เพิ่มพนักงาน" แล้วชื่อจะขึ้นให้เลือกในบันทึกเวลาทำงานและโครงการ') + '</td></tr>') + '</tbody>' +
    (rows ? '<tfoot><tr><td colspan="4">' + list.length + ' คน</td><td class="r">' + fmtNum(totH) + '</td><td class="r">' + fmtMoney(totPay) + '</td><td></td></tr></tfoot>' : '') + '</table></div>' +
    '<p class="small muted" style="margin-top:10px">ชั่วโมงนับจากบันทึกงานรายสัปดาห์และกิจกรรมครั้งเดียวของเดือน ' + monthLabel(ym, true) + ' · ค่าจ้างใช้เงินเดือน หรือค่าแรงต่อชั่วโมง × ชั่วโมง</p>';
}

/* ---- Projects ---- */
pageState.projQ = ''; pageState.projSt = '';
function projects() { return STORE.documents.filter(function(d) { return d.type === 'project'; }); }
function projFinance(p) {
  var client = p.extra && p.extra.client;
  var rev = 0;
  if (client) STORE.documents.forEach(function(d) { if (docFlow(d) === 'rev' && d.party === client && (d.date || '') >= (p.date || '')) rev += docAmountExVat(d) * docSign(d); });
  var budget = Number(p.extra && p.extra.budget) || 0;
  return { budget: budget, rev: round2(rev), pct: budget ? Math.min(100, Math.round(rev / budget * 100)) : 0 };
}
function projOvShell() {
  return '<div class="tx-head"><h1 class="section-title">ภาพรวมโครงการ</h1><div class="coa-actions"><button class="btn btn-dark" type="button" data-open="project">โครงการใหม่</button></div></div>';
}
function projOvData() {
  var ps = projects(), active = ps.filter(function(p) { return docStatus(p) !== 'paid'; }), late = ps.filter(function(p) { return docStatus(p) === 'overdue'; }), doneP = ps.filter(function(p) { return docStatus(p) === 'paid'; });
  var budget = active.reduce(function(s, p) { return s + (Number(p.extra && p.extra.budget) || 0); }, 0);
  var h = '<div class="kpi-row">' + kpi('โครงการที่กำลังดำเนินการ', active.length, 'จากทั้งหมด ' + ps.length + ' โครงการ') + kpi('งบประมาณรวม (ที่เปิดอยู่)', fmtMoney(budget, 0)) +
    kpi('เลยกำหนด', late.length, 'โครงการ', late.length ? 'neg' : '') + kpi('เสร็จแล้ว', doneP.length, 'โครงการ') + '</div>';
  var soon = active.slice().sort(function(a, b) { return ((a.extra && a.extra.endDate) || '9999').localeCompare((b.extra && b.extra.endDate) || '9999'); });
  h += '<div class="page-block"><h2>โครงการที่กำลังดำเนินการ</h2>';
  if (!soon.length) h += '<div class="empty-state" style="margin-top:0"><div class="empty-state-text"><h3>ยังไม่มีโครงการที่เปิดอยู่</h3><p>สร้างโครงการเพื่อติดตามงบประมาณ ผู้รับผิดชอบ และกำหนดเสร็จ รายได้จะคำนวณจากเอกสารขายของลูกค้าเจ้าของโครงการ</p><button class="btn btn-dark" type="button" onclick="openDocForm(\'project\')">โครงการใหม่</button></div><div class="empty-state-illo">' + EMPTY_STATE_SVG + '</div></div>';
  else h += '<div class="proj-grid">' + soon.map(function(p) {
    var f = projFinance(p), end = p.extra && p.extra.endDate, left = end ? daysBetween(todayStr(), end) : null;
    return '<button type="button" class="proj-card" data-doc="' + esc(p._id) + '"><div class="proj-top"><b>' + esc(p.party) + '</b>' + statusPill(p) + '</div>' +
      '<div class="small muted">' + esc((p.extra && p.extra.client) || 'ไม่ระบุลูกค้า') + (p.extra && p.extra.manager ? ' · ' + esc(p.extra.manager) : '') + '</div>' +
      '<div class="proj-bar"><span style="width:' + f.pct + '%"></span></div>' +
      '<div class="proj-nums"><span>รายได้ <b class="num">' + fmtMoney(f.rev, 0) + '</b></span><span>งบ <b class="num">' + (f.budget ? fmtMoney(f.budget, 0) : '–') + '</b></span></div>' +
      '<div class="small ' + (left != null && left < 0 ? 'neg-text' : 'muted') + '">' + (end ? (left < 0 ? 'เลยกำหนด ' + (-left) + ' วัน' : left === 0 ? 'ครบกำหนดวันนี้' : 'เหลือ ' + left + ' วัน') + ' · ' + fmtDate(end) : 'ไม่ได้กำหนดวันเสร็จ') + '</div></button>';
  }).join('') + '</div>';
  return h + '</div>';
}
function projListShell() {
  return '<div class="tx-head"><h1 class="section-title">โครงการ</h1><div class="coa-actions"><button class="btn btn-dark" type="button" data-open="project">โครงการใหม่</button></div></div>' +
    '<div class="coa-filters"><label class="coa-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input type="search" data-state="page.projQ" value="' + esc(pageState.projQ) + '" placeholder="ค้นหาชื่อโครงการหรือลูกค้า" aria-label="ค้นหาโครงการ"></label>' +
    '<select class="coa-select" data-state="page.projSt" aria-label="สถานะ">' + [['','ทุกสถานะ'],['open','กำลังดำเนินการ'],['overdue','เลยกำหนด'],['paid','เสร็จแล้ว']].map(function(o) { return '<option value="' + o[0] + '"' + (pageState.projSt === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>';
}
function projListData() {
  var q = (pageState.projQ || '').toLowerCase(), st = pageState.projSt;
  var list = projects().filter(function(p) {
    var s = docStatus(p);
    if (st && (st === 'open' ? s === 'paid' : s !== st)) return false;
    return !q || [p.party, p.extra && p.extra.client, p.docNo].join(' ').toLowerCase().indexOf(q) >= 0;
  });
  var rows = list.map(function(p) {
    var f = projFinance(p), open = docStatus(p) !== 'paid';
    return '<tr><td><button type="button" class="acc-name" data-doc="' + esc(p._id) + '">' + esc(p.party) + '</button><div class="small muted num">' + esc(p.docNo || '') + '</div></td><td>' + esc((p.extra && p.extra.client) || '-') + '</td><td>' + esc((p.extra && p.extra.manager) || '-') + '</td>' +
      '<td class="num">' + fmtDateNum(p.date) + '</td><td class="num">' + (p.extra && p.extra.endDate ? fmtDateNum(p.extra.endDate) : '-') + '</td>' +
      '<td class="r">' + (f.budget ? fmtMoney(f.budget) : '-') + '</td><td class="r">' + fmtMoney(f.rev) + '</td><td>' + statusPill(p) + '</td>' +
      '<td class="act">' + (open ? '<button type="button" class="act-btn" data-pay="' + esc(p._id) + '">ทำเครื่องหมายว่าเสร็จแล้ว</button>' : '<button type="button" class="act-btn" data-doc="' + esc(p._id) + '">ดู/แก้ไข</button>') + '</td></tr>';
  }).join('');
  return '<div class="table-wrap coa-table tx-table"><table class="data-table"><thead><tr><th>ชื่อโครงการ</th><th>ลูกค้า</th><th>ผู้รับผิดชอบ</th><th>เริ่ม</th><th>กำหนดเสร็จ</th><th class="r">งบประมาณ</th><th class="r">รายได้</th><th>สถานะ</th><th>การกระทำ</th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="9" class="empty-hint">' + (projects().length ? 'ไม่พบโครงการที่ตรงกับตัวกรอง' : 'ยังไม่มีโครงการ กด "โครงการใหม่" เพื่อเริ่ม') + '</td></tr>') + '</tbody></table></div>';
}

/* ---- Chart of accounts ---- */
var coaSelected = {};
function coaShell() {
  var types = [['','ทั้งหมด'],['BAL','งบดุล (BAL)'],['PL','กำไรขาดทุน (P&L)']].concat(ACC_SUBTYPES.map(function(t) { return [t[0], t[1]]; }));
  return '<div class="coa-head"><h1 class="section-title">ผังบัญชี</h1></div>' +
    '<div class="coa-bar"><button type="button" class="back-link" onclick="go(\'accounting\')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg>รายการทั้งหมด</button>' +
    '<div class="coa-actions"><button class="btn btn-outline" type="button" onclick="go(\'reports\')">จัดทำรายงาน</button>' +
    '<div class="split"><button class="btn btn-dark" type="button" data-new="accounts">สร้างใหม่</button><button class="btn btn-dark split-caret" type="button" id="coaCaret" aria-label="ตัวเลือกเพิ่มเติม"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>' +
    '<div class="drop" id="coaDrop" hidden><button type="button" onclick="openCoaImport()">นำเข้า</button><button type="button" onclick="openCoaExport()">ส่งออก</button><button type="button" onclick="openCoaClear()">ล้างข้อมูลผังบัญชี</button></div></div></div></div>' +
    '<div class="coa-filters"><label class="coa-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input id="coaQ" type="search" data-state="page.coaQ" value="' + esc(pageState.coaQ) + '" placeholder="กรองตามชื่อหรือหมายเลข" aria-label="กรองตามชื่อหรือหมายเลข"></label>' +
    '<select id="coaF" class="coa-select" data-state="page.coaFilter" aria-label="ประเภทบัญชี">' + types.map(function(t) { return '<option value="' + t[0] + '"' + (pageState.coaFilter === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select>' +
    '<div class="coa-bulk" id="coaBulk"></div></div>';
}
function coaList() {
  var q = (pageState.coaQ || '').toLowerCase(), f = pageState.coaFilter;
  var order = {}; ACC_SUBTYPES.forEach(function(t, i) { order[t[0]] = i; });
  var list = STORE.accounts.filter(function(a) {
    var st = accSubtype(a);
    if (f === 'BAL' && isPL(a)) return false;
    if (f === 'PL' && !isPL(a)) return false;
    if (f && f !== 'BAL' && f !== 'PL' && st !== f) return false;
    return !q || [a.code, a.name, a.detailType].join(' ').toLowerCase().indexOf(q) >= 0;
  });
  var k = pageState.coaSort, dir = pageState.coaDir;
  list.sort(function(a, b) {
    var x, y;
    if (k === 'name') { x = a.name || ''; y = b.name || ''; return x.localeCompare(y, 'th') * dir; }
    x = order[accSubtype(a)]; y = order[accSubtype(b)];
    return ((x - y) || String(a.code).localeCompare(String(b.code))) * dir;
  });
  return list;
}
function coaData() {
  if (!STORE.accounts.length) return '<div class="empty-state"><div class="empty-state-text"><h3>ยังไม่มีผังบัญชี</h3><p>เริ่มจากผังบัญชีมาตรฐานสำหรับธุรกิจขนาดเล็กในไทย แล้วแก้ไขหรือเพิ่มบัญชีเองได้ภายหลัง</p><div class="toolbar"><button class="btn btn-dark" type="button" onclick="loadStandardCoa()">ใช้ผังบัญชีมาตรฐาน SME</button><button class="btn btn-outline" type="button" onclick="openCoaImport()">นำเข้าจากไฟล์</button></div></div><div class="empty-state-illo">' + EMPTY_STATE_SVG + '</div></div>';
  var bal = accountBalances();
  var list = coaList();
  function sortTh(key, label) {
    var on = pageState.coaSort === key;
    return '<th><button type="button" class="th-sort' + (on ? ' on' : '') + '" data-sort="' + key + '">' + label + (on ? (pageState.coaDir > 0 ? ' ↑' : ' ↓') : '') + '</button></th>';
  }
  var allOn = list.length && list.every(function(a) { return coaSelected[a._id]; });
  var rows = list.map(function(a) {
    var st = accSubtype(a), pl = isPL(a);
    var base = subtypeBase(st), debitNormal = base === 'asset' || base === 'expense';
    var b = bal[a.code] || { dr:0, cr:0 };
    var v = debitNormal ? b.dr - b.cr : b.cr - b.dr;
    var tax = (TAX_CODES.find(function(t) { return t[0] === (a.taxCode || ''); }) || ['',''])[1];
    return '<tr><td class="cb"><input type="checkbox" data-sel="' + esc(a._id) + '"' + (coaSelected[a._id] ? ' checked' : '') + ' aria-label="เลือก ' + esc(a.name) + '"></td>' +
      '<td><button type="button" class="acc-name" data-acc="' + esc(a._id) + '">' + esc(a.name) + '</button><div class="small muted num">' + esc(a.code) + '</div></td>' +
      '<td><div class="acc-type"><span>' + esc(subtypeLabel(st)) + '</span><span class="badge ' + (pl ? 'b-pl' : 'b-bal') + '">' + (pl ? 'P&amp;L' : 'BAL') + '</span></div></td>' +
      '<td>' + esc(a.detailType || '') + '</td><td>' + (tax === '—' ? '' : esc(tax)) + '</td>' +
      '<td class="r">' + (pl ? '' : fmtMoney(v)) + '</td>' +
      '<td class="r act"><button type="button" class="act-btn" data-' + (pl ? 'report' : 'hist') + '="' + esc(a._id) + '">' + (pl ? 'จัดทำรายงาน' : 'ประวัติบัญชี') + '</button><button type="button" class="act-caret" data-acc="' + esc(a._id) + '" aria-label="แก้ไข ' + esc(a.name) + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button></td></tr>';
  }).join('');
  return '<div class="table-wrap coa-table"><table class="data-table"><thead><tr><th class="cb"><input type="checkbox" id="coaAll"' + (allOn ? ' checked' : '') + ' aria-label="เลือกทั้งหมด"></th>' +
    sortTh('name', 'ชื่อ') + sortTh('type', 'ประเภทบัญชี') + '<th>ประเภทรายละเอียด</th><th>ภาษี</th><th class="r">ยอดคงเหลือ</th><th class="r">การกระทำ</th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="7" class="empty-hint">ไม่พบบัญชีที่ตรงกับตัวกรอง</td></tr>') + '</tbody></table></div>' +
    '<p class="hint small muted" style="margin-top:10px">' + list.length + ' บัญชี · ยอดคงเหลือคำนวณจากสมุดรายวัน รวมรายการที่ลงบัญชีอัตโนมัติ</p>';
}
function bindCoa() {
  var c = byId('pageData');
  function bulk() {
    var ids = Object.keys(coaSelected).filter(function(k) { return coaSelected[k]; });
    var el = byId('coaBulk'); if (!el) return;
    el.innerHTML = ids.length ? '<span>' + ids.length + ' รายการที่เลือก</span><button class="btn btn-sm btn-danger" type="button" id="coaDel">ลบที่เลือก</button>' : '';
    var d = byId('coaDel');
    if (d) d.addEventListener('click', async function() {
      if (!d.classList.contains('arm')) { d.classList.add('arm'); d.textContent = 'กดอีกครั้งเพื่อยืนยัน'; return; }
      d.disabled = true;
      try { for (var i = 0; i < ids.length; i++) await delRec('accounts', ids[i]); coaSelected = {}; showToast('ลบ ' + ids.length + ' บัญชีแล้ว'); }
      catch (e) { showToast(writeError(e)); }
      bulk();
    });
  }
  c.querySelectorAll('[data-sel]').forEach(function(cb) { cb.addEventListener('change', function() { coaSelected[cb.dataset.sel] = cb.checked; bulk(); }); });
  var all = byId('coaAll');
  if (all) all.addEventListener('change', function() { coaList().forEach(function(a) { coaSelected[a._id] = all.checked; }); refreshPageData(); });
  c.querySelectorAll('[data-sort]').forEach(function(b) { b.addEventListener('click', function() {
    if (pageState.coaSort === b.dataset.sort) pageState.coaDir *= -1; else { pageState.coaSort = b.dataset.sort; pageState.coaDir = 1; }
    refreshPageData();
  }); });
  c.querySelectorAll('[data-report]').forEach(function(b) { b.addEventListener('click', function() { go('reports'); }); });
  c.querySelectorAll('[data-hist]').forEach(function(b) { b.addEventListener('click', function() { openAccountHistory(b.dataset.hist); }); });
  bulk();
}
/* ---- COA import / clear ---- */
var COA_SAMPLE = 'รหัส,ชื่อบัญชี,ประเภทบัญชี,ประเภทรายละเอียด,ภาษี\n1110,เงินสด,ธนาคาร,เงินสดในมือ,\n1130,ลูกหนี้การค้า,ลูกหนี้การค้า (A/R),ลูกหนี้การค้า (A/R),\n4120,รายได้ค่าบริการ,รายได้,รายได้ค่าบริการ/ค่าธรรมเนียม,VAT 7%\n5220,ค่าเช่า,ค่าใช้จ่าย,ค่าเช่าหรือค่าเช่าซื้อ,VAT 7%';
var coaImportRows = [];
var BASE_ALIASES = { 'สินทรัพย์':'curAsset','asset':'curAsset','หนี้สิน':'curLiab','liability':'curLiab','ทุน':'equity','equity':'equity','รายได้':'income','income':'income','ค่าใช้จ่าย':'expense','expense':'expense','ธนาคาร':'bank','bank':'bank','เงินสด':'bank' };
function matchSubtype(v, code) {
  v = String(v || '').trim().toLowerCase();
  if (v) {
    var hit = ACC_SUBTYPES.find(function(t) { return t[0].toLowerCase() === v || t[1].toLowerCase() === v; }) ||
      ACC_SUBTYPES.find(function(t) { return t[1].toLowerCase().indexOf(v) >= 0 || v.indexOf(t[1].toLowerCase()) >= 0; });
    if (hit) return hit[0];
    if (/a\/r|ลูกหนี้/.test(v)) return 'ar';
    if (/a\/p|เจ้าหนี้/.test(v)) return 'ap';
    if (/ถาวร|fixed/.test(v)) return 'fixedAsset';
    if (/ต้นทุน|cogs/.test(v)) return 'cogs';
    for (var k in BASE_ALIASES) if (v.indexOf(k) >= 0) return BASE_ALIASES[k];
  }
  var first = String(code || '').charAt(0);
  return { '1':'curAsset', '2':'curLiab', '3':'equity', '4':'income', '5':'expense' }[first] || null;
}
function matchTax(v) {
  v = String(v || '').replace(/\s/g, '').toLowerCase();
  if (!v || v === '-' || v === '—') return '';
  if (/ยกเว้น|exempt/.test(v)) return 'exempt';
  if (/0%/.test(v)) return 'vat0';
  if (/7|vat/.test(v)) return 'vat7';
  return '';
}
function parseCsv(text) {
  var rows = [], row = [], cur = '', q = false;
  text = text.replace(/^﻿/, '');
  var delim = (text.split('\n')[0].match(/\t/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? '\t' : ',';
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (q) { if (ch === '"') { if (text[i+1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i+1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(function(r) { return r.some(function(c) { return String(c).trim(); }); });
}
function rowsToAccounts(rows) {
  if (!rows.length) return [];
  var head = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
  function col(re, fallback) { var i = head.findIndex(function(h) { return re.test(h); }); return i >= 0 ? i : fallback; }
  var hasHead = head.some(function(h) { return /รหัส|code|ชื่อ|name|ประเภท|type/.test(h); });
  var ci = hasHead ? col(/รหัส|code|หมายเลข|number|no/, -1) : 0;
  var ni = hasHead ? col(/ชื่อ|name/, 1) : 1;
  var ti = hasHead ? col(/ประเภทบัญชี|account type|^type|^ประเภท$/, 2) : 2;
  var di = hasHead ? col(/รายละเอียด|detail/, 3) : 3;
  var xi = hasHead ? col(/ภาษี|tax|vat/, 4) : 4;
  var have = {}; STORE.accounts.forEach(function(a) { have[a.code] = a; });
  var seen = {};
  return rows.slice(hasHead ? 1 : 0).map(function(r) {
    function g(i) { return i >= 0 && r[i] != null ? String(r[i]).trim() : ''; }
    var o = { code: g(ci), name: g(ni), accType: null, detailType: g(di), taxCode: matchTax(g(xi)), rawType: g(ti) };
    o.accType = matchSubtype(o.rawType, o.code);
    if (!o.name) o.err = 'ไม่มีชื่อบัญชี';
    else if (!o.code) o.err = 'ไม่มีรหัสบัญชี';
    else if (!o.accType) o.err = 'ไม่รู้จักประเภทบัญชี "' + o.rawType + '"';
    else if (seen[o.code]) o.err = 'รหัสซ้ำในไฟล์';
    else if (have[o.code]) o.dupe = have[o.code];
    seen[o.code] = 1;
    return o;
  });
}
function loadXlsxLib() {
  if (window.XLSX) return Promise.resolve();
  return new Promise(function(res, rej) {
    var sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    sc.onload = res; sc.onerror = rej; document.head.appendChild(sc);
  });
}
function openCoaImport() {
  var d = byId('coaDrop'); if (d) d.hidden = true;
  coaImportRows = [];
  var body = '<p class="small muted" style="margin:0">เลือกไฟล์ CSV หรือ Excel (.xlsx) ที่มีคอลัมน์ รหัส, ชื่อบัญชี, ประเภทบัญชี และ (ถ้ามี) ประเภทรายละเอียด, ภาษี หรือวางข้อมูลที่คัดลอกจาก Excel ลงในช่องด้านล่าง</p>' +
    '<div class="field"><label for="impFile">ไฟล์</label><input id="impFile" type="file" accept=".csv,.txt,.xlsx,.xls"></div>' +
    '<div class="field"><label for="impText">หรือวางข้อมูล</label><textarea id="impText" rows="5" class="imp-text" placeholder="' + esc(COA_SAMPLE) + '"></textarea></div>' +
    '<div class="toolbar" style="margin:0"><button type="button" class="btn btn-sm" id="impSample">ใส่ตัวอย่างรูปแบบ</button><button type="button" class="btn btn-sm" id="impStd">ใช้ผังบัญชีมาตรฐาน SME (' + STANDARD_COA.length + ' บัญชี)</button></div>' +
    '<div class="field"><label for="impMode">ถ้ารหัสบัญชีซ้ำกับที่มีอยู่</label><select id="impMode"><option value="skip">ข้ามรายการนั้น</option><option value="update">อัปเดตบัญชีเดิม</option></select></div>' +
    '<div id="impPreview"></div><div class="form-error" id="formError" hidden></div>';
  openModal({ title:'นำเข้าผังบัญชี', body: body, focus:false, buttons:[CANCEL_BTN, { label:'นำเข้า', cls:'btn-dark', onClick: runCoaImport }], onMount: function() {
    function fromText() { coaImportRows = rowsToAccounts(parseCsv(byId('impText').value)); renderImportPreview(); }
    byId('impText').addEventListener('input', fromText);
    byId('impSample').addEventListener('click', function() { byId('impText').value = COA_SAMPLE; fromText(); });
    byId('impStd').addEventListener('click', function() {
      byId('impText').value = 'รหัส,ชื่อบัญชี,ประเภทบัญชี,ประเภทรายละเอียด,ภาษี\n' + STANDARD_COA.map(function(r) {
        return [r[0], r[1], subtypeLabel(r[2]), r[3], (TAX_CODES.find(function(t) { return t[0] === r[4]; }) || ['',''])[1].replace('—','')].map(function(c) { return /[",]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',');
      }).join('\n');
      fromText();
    });
    byId('impMode').addEventListener('change', renderImportPreview);
    byId('impFile').addEventListener('change', async function(e) {
      var f = e.target.files[0]; if (!f) return;
      try {
        if (/\.xlsx?$/i.test(f.name)) {
          await loadXlsxLib();
          var wb = XLSX.read(await f.arrayBuffer(), { type:'array' });
          var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header:1, defval:'' });
          coaImportRows = rowsToAccounts(rows.filter(function(r) { return r.some(function(c) { return String(c).trim(); }); }));
        } else coaImportRows = rowsToAccounts(parseCsv(await f.text()));
        renderImportPreview();
      } catch (err) { var el = byId('formError'); el.textContent = 'อ่านไฟล์ไม่ได้ ลองบันทึกเป็น CSV (UTF-8) แล้วเลือกใหม่'; el.hidden = false; }
    });
  } });
}
function renderImportPreview() {
  var el = byId('impPreview'); if (!el) return;
  if (!coaImportRows.length) { el.innerHTML = ''; return; }
  var upd = byId('impMode').value === 'update';
  var ok = coaImportRows.filter(function(r) { return !r.err && (!r.dupe || upd); }).length;
  var bad = coaImportRows.filter(function(r) { return r.err; }).length;
  var skip = coaImportRows.filter(function(r) { return !r.err && r.dupe && !upd; }).length;
  el.innerHTML = '<div class="banner ' + (bad ? 'bad' : 'ok') + '">พร้อมนำเข้า ' + ok + ' บัญชี' + (skip ? ' · ข้าม ' + skip + ' (รหัสซ้ำ)' : '') + (bad ? ' · มีปัญหา ' + bad + ' แถว (จะไม่นำเข้า)' : '') + '</div>' +
    '<div class="items-wrap imp-preview"><table class="data-table"><thead><tr><th>รหัส</th><th>ชื่อ</th><th>ประเภทบัญชี</th><th>สถานะ</th></tr></thead><tbody>' +
    coaImportRows.map(function(r) {
      var st = r.err ? '<span class="status st-overdue">' + esc(r.err) + '</span>' : r.dupe ? (upd ? '<span class="status st-unpaid">อัปเดต</span>' : '<span class="status st-done">ข้าม</span>') : '<span class="status st-paid">ใหม่</span>';
      return '<tr><td class="docno">' + esc(r.code) + '</td><td>' + esc(r.name) + '</td><td>' + (r.accType ? esc(subtypeLabel(r.accType)) : esc(r.rawType)) + '</td><td>' + st + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}
function runCoaImport(btn) {
  var upd = byId('impMode').value === 'update';
  var todo = coaImportRows.filter(function(r) { return !r.err && (!r.dupe || upd); });
  var errEl = byId('formError');
  if (!todo.length) { errEl.textContent = coaImportRows.length ? 'ไม่มีรายการที่นำเข้าได้' : 'เลือกไฟล์หรือวางข้อมูลก่อน'; errEl.hidden = false; return; }
  runSave(btn, async function() {
    for (var i = 0; i < todo.length; i++) {
      var r = todo[i];
      var rec = { code: r.code, name: r.name, accType: r.accType, type: subtypeBase(r.accType), detailType: r.detailType, taxCode: r.taxCode };
      btn.textContent = 'กำลังนำเข้า ' + (i + 1) + '/' + todo.length;
      if (r.dupe) await setRec('accounts', r.dupe._id, Object.assign({}, strip(r.dupe), rec, { updatedAt: Date.now() }));
      else await addRec('accounts', Object.assign(rec, { createdAt: Date.now() }));
    }
    showToast('นำเข้าผังบัญชี ' + todo.length + ' บัญชีแล้ว');
    closeModal(); renderPage();
  });
}
var downloadsNs;
async function getDownloads() {
  if (downloadsNs !== undefined) return downloadsNs;
  try { downloadsNs = (window.claude && window.claude.use) ? await window.claude.use('downloads') : null; } catch (e) { downloadsNs = null; }
  return downloadsNs;
}
function coaExportRows(scope) {
  var list = scope === 'filtered' ? coaList() : scope === 'selected' ? STORE.accounts.filter(function(a) { return coaSelected[a._id]; }) : STORE.accounts.slice().sort(function(a, b) { return String(a.code).localeCompare(String(b.code)); });
  var bal = accountBalances();
  return [['รหัส','ชื่อบัญชี','ประเภทบัญชี','งบ','ประเภทรายละเอียด','ภาษี','ยอดคงเหลือ']].concat(list.map(function(a) {
    var st = accSubtype(a), base = subtypeBase(st), b = bal[a.code] || { dr:0, cr:0 };
    var v = (base === 'asset' || base === 'expense') ? b.dr - b.cr : b.cr - b.dr;
    var tax = (TAX_CODES.find(function(t) { return t[0] === (a.taxCode || ''); }) || ['',''])[1].replace('—','');
    return [a.code, a.name, subtypeLabel(st), isPL(a) ? 'P&L' : 'BAL', a.detailType || '', tax, isPL(a) ? '' : round2(v)];
  }));
}
function toCsv(rows) { return '﻿' + rows.map(function(r) { return r.map(function(c) { c = String(c == null ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\r\n'); }
async function openCoaExport() {
  var d = byId('coaDrop'); if (d) d.hidden = true;
  if (!STORE.accounts.length) { showToast('ยังไม่มีบัญชีให้ส่งออก'); return; }
  var nSel = STORE.accounts.filter(function(a) { return coaSelected[a._id]; }).length;
  var nFil = coaList().length;
  var dl = await getDownloads();
  var body = '<div class="field"><label for="expScope">บัญชีที่จะส่งออก</label><select id="expScope"><option value="all">ทั้งหมด (' + STORE.accounts.length + ' บัญชี)</option>' +
    (nFil !== STORE.accounts.length ? '<option value="filtered">ตามตัวกรองปัจจุบัน (' + nFil + ' บัญชี)</option>' : '') +
    (nSel ? '<option value="selected">เฉพาะที่เลือก (' + nSel + ' บัญชี)</option>' : '') + '</select></div>' +
    '<div class="field"><label for="expFmt">รูปแบบไฟล์</label><select id="expFmt"><option value="xlsx">Excel (.xlsx)</option><option value="csv">CSV (UTF-8)</option></select></div>' +
    '<p class="small muted" style="margin:0">ไฟล์ที่ได้ใช้รูปแบบเดียวกับเมนูนำเข้า จึงนำกลับเข้ามาได้ทันที</p>' +
    (dl ? '' : '<div class="banner info">หน้านี้บันทึกไฟล์ลงเครื่องไม่ได้ในมุมมองนี้ คัดลอกข้อมูลด้านล่างไปวางใน Excel แทนได้</div><textarea id="expText" class="imp-text" rows="8" readonly></textarea>') +
    '<div class="form-error" id="formError" hidden></div>';
  var buttons = [CANCEL_BTN];
  if (dl) buttons.push({ label:'ส่งออก', cls:'btn-dark', onClick: function(btn) { doCoaExport(btn, dl); } });
  else buttons.push({ label:'คัดลอก', cls:'btn-dark', onClick: function() {
    var t = byId('expText');
    navigator.clipboard.writeText(t.value).then(function() { showToast('คัดลอกแล้ว'); }, function() { t.select(); showToast('เลือกข้อความแล้ว กด Ctrl/Cmd+C เพื่อคัดลอก'); });
  } });
  openModal({ title:'ส่งออกผังบัญชี', body: body, focus:false, buttons: buttons, onMount: function() {
    var t = byId('expText');
    if (t) {
      var fill = function() { t.value = coaExportRows(byId('expScope').value).map(function(r) { return r.join('\t'); }).join('\n'); };
      byId('expScope').addEventListener('change', fill); fill();
      byId('expFmt').closest('.field').hidden = true;
    }
  } });
}
async function doCoaExport(btn, dl) {
  var rows = coaExportRows(byId('expScope').value);
  var fmt = byId('expFmt').value;
  var name = 'ผังบัญชี-' + companyName() + '-' + todayStr();
  btn.disabled = true;
  try {
    var data, filename;
    if (fmt === 'xlsx') {
      await loadXlsxLib();
      var ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch:8 }, { wch:30 }, { wch:22 }, { wch:6 }, { wch:34 }, { wch:10 }, { wch:14 }];
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ผังบัญชี');
      data = new Uint8Array(XLSX.write(wb, { bookType:'xlsx', type:'array' }));
      filename = name + '.xlsx';
    } else { data = toCsv(rows); filename = name + '.csv'; }
    await dl.save({ filename: filename, data: data });
    showToast('ส่งออก ' + (rows.length - 1) + ' บัญชีแล้ว');
    closeModal();
  } catch (e) {
    btn.disabled = false;
    if (e && e.code === 'declined') return;
    var el = byId('formError');
    el.textContent = e && e.code === 'rejected_extension' ? 'ระบบไม่อนุญาตไฟล์ชนิดนี้ ลองเลือกรูปแบบ CSV' : 'ส่งออกไม่สำเร็จ ลองอีกครั้ง';
    el.hidden = false;
  }
}

function openCoaClear() {
  var d = byId('coaDrop'); if (d) d.hidden = true;
  var n = STORE.accounts.length;
  if (!n) { showToast('ผังบัญชีว่างอยู่แล้ว'); return; }
  var jv = STORE.documents.filter(function(x) { return x.type === 'journalEntry'; }).length;
  openModal({ title:'ล้างข้อมูลผังบัญชี', focus:false,
    body: '<p style="margin:0;line-height:1.6">บัญชีทั้งหมด <b>' + n + ' บัญชี</b> จะถูกลบถาวรและกู้คืนไม่ได้</p>' +
      (jv ? '<div class="banner info">รายการสมุดรายวัน ' + jv + ' รายการจะยังอยู่ แต่ชื่อบัญชีจะไม่แสดงจนกว่าจะเพิ่มบัญชีรหัสเดิมกลับมา</div>' : '') +
      '<div class="field"><label for="clrConfirm">พิมพ์ <b>ล้าง</b> เพื่อยืนยัน</label><input id="clrConfirm" type="text" autocomplete="off"></div>',
    buttons: [CANCEL_BTN, { label:'ล้างข้อมูลผังบัญชี', cls:'btn-danger arm', onClick: function(btn) {
      if (byId('clrConfirm').value.trim() !== 'ล้าง') { byId('clrConfirm').focus(); showToast('พิมพ์คำว่า ล้าง เพื่อยืนยัน'); return; }
      var ids = STORE.accounts.map(function(a) { return a._id; });
      runSave(btn, async function() {
        for (var i = 0; i < ids.length; i++) { btn.textContent = 'กำลังลบ ' + (i + 1) + '/' + ids.length; await delRec('accounts', ids[i]); }
        coaSelected = {};
        showToast('ล้างผังบัญชีแล้ว ' + ids.length + ' บัญชี');
        closeModal(); renderPage();
      });
    } }] });
}

function openAccountHistory(id) {
  var a = STORE.accounts.find(function(x) { return x._id === id; });
  if (!a) return;
  var base = subtypeBase(accSubtype(a)), debitNormal = base === 'asset' || base === 'expense';
  var lines = allLines().filter(function(l) { return l.code === a.code; }).map(function(l) { return { d: l.d, dr: l.dr, cr: l.cr, date: l.date, memo: l.memo }; });
  lines.sort(function(x, y) { return (x.date || '').localeCompare(y.date || ''); });
  var run = 0;
  var rows = lines.map(function(l) {
    run += debitNormal ? l.dr - l.cr : l.cr - l.dr;
    return '<tr class="row-link" data-docm="' + esc(l.d._id) + '"><td style="white-space:nowrap">' + fmtDate(l.date) + '</td><td class="docno">' + esc(l.d.docNo) + '</td><td>' + esc(l.d.typeLabel + ' · ' + l.d.party) + (l.memo ? ' <span class="small muted">' + esc(l.memo) + '</span>' : '') + '</td><td class="r">' + (l.dr ? fmtMoney(l.dr) : '') + '</td><td class="r">' + (l.cr ? fmtMoney(l.cr) : '') + '</td><td class="r">' + fmtMoney(run) + '</td></tr>';
  }).join('');
  openModal({ title: 'ประวัติบัญชี ' + a.code + ' ' + a.name, focus:false,
    body: '<div class="items-wrap"><table class="data-table"><thead><tr><th>วันที่</th><th>เลขที่</th><th>คำอธิบาย</th><th class="r">เดบิต</th><th class="r">เครดิต</th><th class="r">คงเหลือ</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="6" class="empty-hint">ยังไม่มีรายการในบัญชีนี้</td></tr>') + '</tbody></table></div>',
    buttons: [{ label:'แก้ไขบัญชี', onClick: function() { openRecordForm('accounts', a); } }, { label:'ปิด', cls:'btn-primary', onClick: closeModal }] });
}

/* ---- Journal & trial balance ---- */
function journalShell() {
  return '<div class="breadcrumb-bar"><span>การบัญชี / สมุดรายวันและงบทดลอง</span></div>' +
    pageHead('สมุดรายวัน', 'เอกสารขาย ซื้อ รับและจ่ายชำระ ลงบัญชีคู่ให้อัตโนมัติ ส่วนรายการปรับปรุงและค่าเสื่อมราคาบันทึกเองได้จากปุ่มด้านขวา',
      '<button class="btn btn-primary btn-sm" type="button" data-open="journalEntry">+ บันทึกรายการ</button>');
}
function journalData() {
  var jv = STORE.documents.filter(function(d) { return postingsOf(d).length; }).sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });
  var rows = jv.map(function(d) {
    var pl = postingsOf(d);
    var lines = pl.map(function(r) { return '<span class="num">' + esc(r.code) + '</span> ' + esc(acctName(r.code)) + ' <span class="num">' + (r.dr ? 'Dr ' + fmtMoney(r.dr) : 'Cr ' + fmtMoney(r.cr)) + '</span>'; }).join('<br>');
    return '<tr class="row-link" tabindex="0" data-doc="' + esc(d._id) + '"><td class="docno">' + esc(d.docNo || '-') + '</td><td style="white-space:nowrap">' + fmtDate(d.date) + '</td><td>' + esc((d.type === 'journalEntry' ? '' : d.typeLabel + ' · ') + d.party) + '<div class="small muted">' + lines + '</div></td><td class="r">' + fmtMoney(pl.reduce(function(a, l) { return a + l.dr; }, 0)) + '</td></tr>';
  }).join('');
  var h = tableOrEmpty('<th>เลขที่</th><th>วันที่</th><th>เอกสาร / การลงบัญชี</th><th class="r">จำนวนเงิน</th>', rows, 'ยังไม่มีรายการบันทึกบัญชี');
  var bal = accountBalances();
  var codes = Object.keys(bal).sort();
  var tdr = 0, tcr = 0;
  var tb = codes.map(function(code) {
    var a = STORE.accounts.find(function(x) { return x.code === code; });
    var net = bal[code].dr - bal[code].cr;
    var dr = net > 0 ? net : 0, cr = net < 0 ? -net : 0;
    tdr += dr; tcr += cr;
    return '<tr><td class="docno">' + esc(code) + '</td><td>' + esc(a ? a.name : acctName(code)) + '</td><td class="r">' + (dr ? fmtMoney(dr) : '') + '</td><td class="r">' + (cr ? fmtMoney(cr) : '') + '</td></tr>';
  }).join('');
  var ok = round2(tdr) === round2(tcr);
  h += '<div class="page-block"><h2>งบทดลอง ณ ' + fmtDate(todayStr()) + '</h2><p class="hint">สรุปยอดคงเหลือแต่ละบัญชีจากสมุดรายวันทั่วไป</p>' +
    (codes.length ? '<div class="banner ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓ งบทดลองสมดุล' : '✕ งบทดลองไม่สมดุล ตรวจสอบรายการที่บันทึก') + '</div>' : '') +
    tableOrEmpty('<th>รหัส</th><th>ชื่อบัญชี</th><th class="r">เดบิต</th><th class="r">เครดิต</th>', tb, 'ยังไม่มียอดในบัญชี',
      '<tr><td colspan="2">รวม</td><td class="r">' + fmtMoney(tdr) + '</td><td class="r">' + fmtMoney(tcr) + '</td></tr>') + '</div>';
  return h;
}

/* ---- Contacts ---- */
function contactsShell(title) {
  var tabs = [['all','ทั้งหมด'],['customer','ลูกค้า'],['supplier','ซัพพลายเออร์']].map(function(t) {
    return '<button class="chip-btn' + (pageState.contactTab === t[0] ? ' on' : '') + '" type="button" data-tab="' + t[0] + '">' + t[1] + '</button>';
  }).join('');
  return pageHead(title || 'ศูนย์กลางลูกค้า', 'รายชื่อลูกค้าและซัพพลายเออร์ พร้อมเลขผู้เสียภาษี และยอดค้างชำระ', '<button class="btn btn-primary btn-sm" type="button" data-new="contacts">+ เพิ่มผู้ติดต่อ</button>') +
    '<div class="toolbar">' + tabs + '<div class="field grow" style="margin-left:auto;max-width:320px"><label for="cq">ค้นหา</label><input id="cq" type="search" data-state="page.contactQ" value="' + esc(pageState.contactQ) + '" placeholder="ชื่อ เลขภาษี หรือเบอร์โทร"></div></div>';
}
function contactsData() {
  var tab = pageState.contactTab, q = (pageState.contactQ || '').toLowerCase();
  var list = STORE.contacts.filter(function(c) {
    if (tab === 'customer' && c.kind === 'supplier') return false;
    if (tab === 'supplier' && c.kind === 'customer') return false;
    return !q || [c.name, c.taxId, c.phone, c.email].join(' ').toLowerCase().indexOf(q) >= 0;
  });
  var KIND = { customer:'ลูกค้า', supplier:'ซัพพลายเออร์', both:'ลูกค้า/ซัพพลายเออร์' };
  var rows = list.map(function(c) {
    var ar = sumNet(openItems('invoice').filter(function(d) { return d.party === c.name; }));
    var ap = sumNet(openItems('bill').filter(function(d) { return d.party === c.name; }));
    var n = STORE.documents.filter(function(d) { return d.party === c.name; }).length;
    return '<tr class="row-link" tabindex="0" data-contact="' + esc(c._id) + '"><td><b>' + esc(c.name) + '</b><div class="small muted">' + esc([c.phone, c.email].filter(Boolean).join(' · ')) + '</div></td>' +
      '<td>' + (KIND[c.kind] || '-') + '<div class="small muted">' + (c.entity === 'person' ? 'บุคคลธรรมดา' : 'นิติบุคคล') + '</div></td>' +
      '<td class="num small">' + esc(c.taxId || '-') + (c.branch ? '<div class="muted">' + esc(c.branch) + '</div>' : '') + '</td>' +
      '<td class="r">' + n + '</td><td class="r">' + (ar ? fmtMoney(ar) : '<span class="muted">–</span>') + '</td><td class="r">' + (ap ? fmtMoney(ap) : '<span class="muted">–</span>') + '</td></tr>';
  }).join('');
  return tableOrEmpty('<th>ชื่อ</th><th>ประเภท</th><th>เลขผู้เสียภาษี</th><th class="r">เอกสาร</th><th class="r">ค้างรับ</th><th class="r">ค้างจ่าย</th>', rows,
    STORE.contacts.length ? 'ไม่พบผู้ติดต่อที่ค้นหา' : 'ยังไม่มีผู้ติดต่อ กด "+ เพิ่มผู้ติดต่อ" แล้วชื่อจะขึ้นให้เลือกในฟอร์มเอกสาร');
}

/* ---- Products ---- */
function productsShell(title) {
  return pageHead(title || 'สินค้าคงคลัง', 'สินค้าและบริการที่ขาย สต็อกคงเหลือ = ยอดยกมา + บิลซื้อ − ใบแจ้งหนี้ ± การปรับสต็อก (จับคู่ตามชื่อรายการ)',
    '<button class="btn btn-primary btn-sm" type="button" data-new="products">+ เพิ่มสินค้า/บริการ</button><button class="btn btn-sm" type="button" data-open="inventoryAdjust">ปรับสต็อก</button>') +
    '<div class="toolbar"><div class="field grow" style="max-width:320px"><label for="pq">ค้นหา</label><input id="pq" type="search" data-state="page.productQ" value="' + esc(pageState.productQ) + '" placeholder="ชื่อหรือรหัสสินค้า"></div></div>';
}
function productsData() {
  var q = (pageState.productQ || '').toLowerCase();
  var list = STORE.products.filter(function(p) { return !q || [p.name, p.sku].join(' ').toLowerCase().indexOf(q) >= 0; });
  var totalVal = 0;
  var rows = list.map(function(p) {
    var goods = p.kind !== 'service';
    var stock = goods ? productStock(p) : null;
    var val = goods ? stock * (Number(p.cost) || 0) : 0;
    totalVal += val;
    var stockCell = !goods ? '<span class="muted">บริการ</span>' : (stock <= (p.reorderPoint != null && p.reorderPoint !== '' ? Number(p.reorderPoint) : 5) ? '<span class="status ' + (stock <= 0 ? 'st-overdue' : 'st-unpaid') + '">' + fmtNum(stock) + '</span>' : fmtNum(stock)) + ' <span class="small muted">' + esc(p.unit || '') + '</span>';
    return '<tr class="row-link" tabindex="0" data-product="' + esc(p._id) + '"><td class="docno">' + esc(p.sku || '-') + '</td><td>' + esc(p.name) + '</td><td class="r">' + (p.price != null ? fmtMoney(p.price) : '-') + '</td><td class="r">' + (p.cost != null ? fmtMoney(p.cost) : '-') + '</td><td class="r">' + stockCell + '</td><td class="r">' + (goods ? fmtMoney(val) : '') + '</td></tr>';
  }).join('');
  return tableOrEmpty('<th>รหัส</th><th>ชื่อ</th><th class="r">ราคาขาย</th><th class="r">ต้นทุน</th><th class="r">คงเหลือ</th><th class="r">มูลค่าตามทุน</th>', rows,
    STORE.products.length ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีสินค้า เพิ่มแล้วเลือกในใบแจ้งหนี้ได้เลย ราคาจะเติมให้อัตโนมัติ',
    '<tr><td colspan="5">มูลค่าสินค้าคงเหลือรวม</td><td class="r">' + fmtMoney(totalVal) + '</td></tr>');
}

/* ---- Tax ---- */
function taxShell() {
  return pageHead('ภาษี', 'สรุปภาษีมูลค่าเพิ่ม (ภ.พ.30) และภาษีหัก ณ ที่จ่าย (ภ.ง.ด.3 / ภ.ง.ด.53) รายเดือน จากเอกสารที่บันทึก') +
    '<div class="toolbar"><div class="field"><label for="tm">เดือนภาษี</label><input id="tm" type="month" data-state="page.taxMonth" value="' + esc(pageState.taxMonth) + '"></div></div>';
}
/* ---- Tax overview (VAT returns) ---- */
pageState.taxTab = 'returns'; pageState.taxFilter = '';
function vatSummary(ym) {
  var inMonth = taxDocs().filter(function(d) { return (d.date || '').slice(0,7) === ym && d.vat; });
  var out = round2(inMonth.filter(function(d) { return docFlow(d) === 'rev'; }).reduce(function(s, d) { return s + d.vat * docSign(d); }, 0));
  var inp = round2(inMonth.filter(function(d) { return docFlow(d) === 'exp'; }).reduce(function(s, d) { return s + d.vat * docSign(d); }, 0));
  var ret = taxReturn(ym);
  var adj = round2((ret && ret.adjustments || []).reduce(function(s, a) { return s + (Number(a.amount) || 0); }, 0));
  var paid = round2((ret && ret.payments || []).reduce(function(s, a) { return s + (Number(a.amount) || 0); }, 0));
  var due = round2(out - inp + adj);
  return { ym: ym, out: out, inp: inp, adj: adj, due: due, paid: paid, bal: round2(Math.max(due, 0) - paid), ret: ret, n: inMonth.length };
}
function taxReturn(ym) { return STORE.taxReturns.find(function(r) { return r.period === ym; }); }
function monthEnd(ym) { var d = new Date(ym + '-01T00:00:00'); d.setMonth(d.getMonth() + 1); d.setDate(0); return ym + '-' + String(d.getDate()).padStart(2,'0'); }
function addMonths(ym, n) { var d = new Date(ym + '-01T00:00:00'); d.setMonth(d.getMonth() + n); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); }
function taxPeriods() {
  var cur = todayStr().slice(0,7), first = cur;
  STORE.documents.forEach(function(d) { if (d.vat && d.date && d.date.slice(0,7) < first) first = d.date.slice(0,7); });
  STORE.taxReturns.forEach(function(r) { if (r.period < first) first = r.period; });
  var out = [];
  for (var m = first; m <= cur && out.length < 60; m = addMonths(m, 1)) out.push(m);
  return out;
}
function periodStatus(v) {
  var cur = todayStr().slice(0,7);
  if (v.ret && v.ret.filedDate) return v.bal > 0 ? 'filed' : 'done';
  if (v.ym === cur) return 'open';
  return 'pending';
}
var TAX_ST = { open:['ยังไม่ครบรอบ','st-done'], pending:['คงค้าง','st-unpaid'], filed:['ยื่นแล้ว รอชำระ','st-unpaid'], done:['ยื่นและชำระแล้ว','st-paid'] };
function nextPeriod() {
  var ps = taxPeriods();
  for (var i = 0; i < ps.length; i++) { var v = vatSummary(ps[i]); if (!(v.ret && v.ret.filedDate) && ps[i] < todayStr().slice(0,7)) return ps[i]; }
  return ps[ps.length - 1];
}
async function saveReturn(ym, patch) {
  var cur = taxReturn(ym);
  var rec = Object.assign({ period: ym, adjustments: [], payments: [] }, cur ? strip(cur) : {}, patch, { updatedAt: Date.now() });
  if (db) { await db.doc(cname('taxReturns') + '/vat-' + ym).set(rec); return; }
  STORE.taxReturns = STORE.taxReturns.filter(function(r) { return r.period !== ym; }).concat([Object.assign(rec, { _id: 'vat-' + ym })]);
  sortLocal('taxReturns'); onData();
}
function taxOvShell() {
  var chev = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px"><path d="M6 9l6 6 6-6"/></svg>';
  return '<h1 class="section-title" style="margin-bottom:22px">ภาพรวมภาษี</h1>' +
    '<div class="tax-top-actions"><div class="split"><button class="btn btn-outline" type="button" id="vatMenuBtn">แก้ไข VAT ' + chev + '</button><div class="drop" id="vatMenu" hidden>' +
    '<button type="button" onclick="openTaxAdjust()">เพิ่มการปรับปรุงภาษี</button><button type="button" onclick="go(\'tax\',\'monthly\')">ดูรายการภาษีรายเดือน</button><button type="button" onclick="go(\'accounting\',\'coa\')">บัญชีภาษีซื้อ/ภาษีขายในผังบัญชี</button></div></div>' +
    '<button class="btn btn-outline" type="button" onclick="openTaxAdjust()">เพิ่มภาษี</button></div>';
}
function taxOvData() {
  var ym = nextPeriod(), v = vatSummary(ym);
  var h = '<div class="tax-hero"><div class="tax-hero-label">ภาษี</div><div class="tax-hero-main">' +
    '<div class="tax-big num">' + fmtMoney(v.due) + '</div><div class="tax-range num">' + fmtDateNum(ym + '-01') + ' - ' + fmtDateNum(monthEnd(ym)) + '</div>' +
    '<div class="tax-eq"><div><div class="num tax-mid">' + fmtMoney(v.out) + '</div><button type="button" class="tax-link" onclick="pageState.taxMonth=\'' + ym + '\';go(\'tax\',\'monthly\')">เก็บเมื่อเกิดการขาย</button></div><span class="tax-op">−</span>' +
    '<div><div class="num tax-mid">' + fmtMoney(v.inp) + '</div><button type="button" class="tax-link" onclick="pageState.taxMonth=\'' + ym + '\';go(\'tax\',\'monthly\')">ชำระพร้อมการซื้อ</button></div><span class="tax-op">' + (v.adj < 0 ? '−' : '+') + '</span>' +
    '<div><div class="num tax-mid">' + fmtMoney(Math.abs(v.adj)) + '</div><button type="button" class="tax-link" onclick="openTaxAdjust(\'' + ym + '\')">การปรับปรุง</button></div></div></div>' +
    '<div class="tax-note"><span class="tax-note-ic">!</span><div><b>ทำให้เรียบร้อย</b><p>ยื่นแบบ ภ.พ.30 ของงวด ' + monthLabel(ym, true) + ' ภายใน ' + fmtDate(nextMonthDay(ym, 15)) + ' (ยื่นออนไลน์ภายใน ' + fmtDate(nextMonthDay(ym, 23)) + ') แล้วกด "ทำเครื่องหมายว่ายื่นแล้ว" เพื่อให้บัญชีเป็นระเบียบ</p></div></div></div>';
  h += '<div class="tax-tabs"><div class="tabs"><button type="button" class="tab' + (pageState.taxTab === 'returns' ? ' on' : '') + '" data-ttab="returns">แบบแสดงรายการภาษี</button><button type="button" class="tab' + (pageState.taxTab === 'payments' ? ' on' : '') + '" data-ttab="payments">การชำระเงิน</button></div>' +
    '<div class="split"><button class="btn btn-outline btn-sm" type="button" id="taxRepBtn">ดูรายงาน ▾</button><div class="drop" id="taxRep" hidden><button type="button" onclick="go(\'tax\',\'monthly\')">รายงานภาษีขาย / ภาษีซื้อ</button><button type="button" onclick="go(\'tax\',\'monthly\')">ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.3/53)</button><button type="button" onclick="go(\'reports\')">งบกำไรขาดทุน</button></div></div></div>';
  var ps = taxPeriods().slice().reverse();
  if (pageState.taxTab === 'payments') {
    var pays = [];
    ps.forEach(function(ym) { var r = taxReturn(ym); (r && r.payments || []).forEach(function(p) { pays.push({ ym: ym, p: p }); }); });
    h += '<div class="table-wrap coa-table"><table class="data-table"><thead><tr><th>วันที่ชำระ</th><th>งวดภาษี</th><th>วิธีชำระ</th><th class="r">จำนวนเงิน</th></tr></thead><tbody>' +
      (pays.map(function(x) { return '<tr><td class="num">' + fmtDateNum(x.p.date) + '</td><td>' + monthLabel(x.ym, true) + '</td><td>' + esc(x.p.method || '-') + '</td><td class="r">' + fmtMoney(x.p.amount) + '</td></tr>'; }).join('') || '<tr><td colspan="4" class="empty-hint">ยังไม่มีการชำระภาษี บันทึกได้จากปุ่ม "บันทึกการชำระเงิน" หลังยื่นแบบแล้ว</td></tr>') + '</tbody></table></div>';
    return h;
  }
  h += '<div class="coa-filters"><select class="coa-select" id="taxFilter" aria-label="ตัวกรอง">' + [['','แบบแสดงรายการภาษีทั้งหมด'],['next','ครั้งถัดไปและคงค้าง'],['filed','ยื่นแล้ว']].map(function(o) { return '<option value="' + o[0] + '"' + (pageState.taxFilter === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>';
  var vs = ps.map(vatSummary);
  var upcoming = vs.filter(function(v) { var s = periodStatus(v); return s === 'pending' || s === 'open' || s === 'filed'; });
  var filed = vs.filter(function(v) { return periodStatus(v) === 'done'; });
  function row(v) {
    var s = periodStatus(v), st = TAX_ST[s];
    var act = s === 'pending' || s === 'open' ? '<button type="button" class="tax-act" data-prep="' + v.ym + '">เตรียมแบบแสดงรายการภาษี</button>'
      : s === 'filed' ? '<button type="button" class="tax-act" data-pay="' + v.ym + '">บันทึกการชำระเงิน</button>' : '<button type="button" class="tax-act" data-prep="' + v.ym + '">ดูแบบแสดงรายการภาษี</button>';
    return '<tr><td class="num">' + fmtDateNum(v.ym + '-01') + '</td><td class="num">' + fmtDateNum(monthEnd(v.ym)) + '</td><td class="num">' + (v.ret && v.ret.filedDate ? fmtDateNum(v.ret.filedDate) : fmtDateNum(nextMonthDay(v.ym, 15))) + '</td>' +
      '<td class="r">' + fmtMoney(v.due) + '</td><td class="r">' + fmtMoney(v.paid) + '</td><td class="r">' + fmtMoney(v.bal) + '</td>' +
      '<td><span class="status ' + st[1] + '">' + (s === 'pending' ? '<span class="ic-warn" style="margin-right:4px">!</span>' : '') + st[0] + '</span></td><td class="r act"><span class="row-split">' + act + '<button type="button" class="row-caret" data-rmenu="' + v.ym + '" aria-label="ตัวเลือกเพิ่มเติม" aria-haspopup="menu"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button></span></td></tr>';
  }
  var body = '';
  if (pageState.taxFilter !== 'filed') body += '<tr class="group-row"><td colspan="8">การยื่นแบบแสดงรายการภาษีครั้งถัดไป</td></tr>' + (upcoming.map(row).join('') || '<tr><td colspan="8" class="empty-hint">ไม่มีงวดคงค้าง</td></tr>');
  if (pageState.taxFilter !== 'next') body += '<tr class="group-row"><td colspan="8">ยื่นแล้ว</td></tr>' + (filed.map(row).join('') || '<tr><td colspan="8" class="empty-hint">ยังไม่มีงวดที่ยื่นและชำระครบ</td></tr>');
  h += '<div class="table-wrap coa-table"><table class="data-table"><thead><tr><th>วันที่เริ่มต้น</th><th>วันที่สิ้นสุด</th><th>วันที่ยื่น</th><th class="r">จำนวนเงินที่ต้องชำระ</th><th class="r">การชำระเงิน</th><th class="r">ยอดดุล</th><th>สถานะ</th><th class="r">การดำเนินการ</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
    '<p class="small muted" style="margin-top:10px">วันที่ยื่นของงวดที่ยังไม่ยื่นคือกำหนดยื่นแบบกระดาษ (วันที่ 15 ของเดือนถัดไป) · ยอดติดลบหมายถึงภาษีซื้อมากกว่าภาษีขาย ยกไปเครดิตงวดถัดไปหรือขอคืน</p>';
  return h;
}
function bindTaxOv() {
  var sc = byId('sectionContent');
  [['vatMenuBtn','vatMenu'],['taxRepBtn','taxRep']].forEach(function(p) {
    var b = byId(p[0]), m = byId(p[1]); if (!b || b._bound) return; b._bound = 1;
    b.addEventListener('click', function(e) { e.stopPropagation(); m.hidden = !m.hidden; });
    document.addEventListener('click', function() { m.hidden = true; });
  });
  sc.querySelectorAll('[data-ttab]').forEach(function(b) { b.addEventListener('click', function() { pageState.taxTab = b.dataset.ttab; refreshPageData(); }); });
  var f = byId('taxFilter'); if (f) f.addEventListener('change', function() { pageState.taxFilter = f.value; refreshPageData(); });
  sc.querySelectorAll('[data-rmenu]').forEach(function(b) { b.addEventListener('click', function(e) { e.stopPropagation(); openRowMenu(b, b.dataset.rmenu); }); });
  sc.querySelectorAll('[data-prep]').forEach(function(b) { b.addEventListener('click', function() { openTaxReturn(b.dataset.prep); }); });
  byId('pageData').querySelectorAll('.tax-act[data-pay]').forEach(function(b) { b.addEventListener('click', function(e) { e.stopPropagation(); openTaxPayment(b.dataset.pay); }); });
}
function openRowMenu(anchor, ym) {
  var m = byId('rowMenu');
  if (!m) {
    m = document.createElement('div'); m.id = 'rowMenu'; m.className = 'drop row-menu'; m.setAttribute('role', 'menu'); document.body.appendChild(m);
    document.addEventListener('click', function() { m.hidden = true; });
    window.addEventListener('scroll', function() { m.hidden = true; }, true);
  }
  var items = [['ดูสรุป', function() { openTaxReturn(ym); }], ['ดู VAT รายละเอียด', function() { openVatDetail(ym); }], ['ดูรายละเอียดการยกเว้น', function() { openExemptDetail(ym); }], ['ดูธุรกรรมตามรหัสภาษี', function() { openByTaxCode(ym); }]];
  var v = vatSummary(ym);
  if (v.ret && v.ret.filedDate && v.bal > 0) items.push(['บันทึกการชำระเงิน', function() { openTaxPayment(ym); }]);
  m.innerHTML = '';
  items.forEach(function(it) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.textContent = it[0]; b.addEventListener('click', function() { m.hidden = true; it[1](); }); m.appendChild(b); });
  m.hidden = false;
  var r = anchor.getBoundingClientRect();
  m.style.position = 'fixed';
  m.style.top = Math.min(r.bottom + 4, window.innerHeight - m.offsetHeight - 8) + 'px';
  m.style.left = Math.max(8, r.right - m.offsetWidth) + 'px';
  m.querySelector('button').focus();
}
function periodDocs(ym) { return taxDocs().filter(function(d) { return (d.date || '').slice(0,7) === ym && docFlow(d); }); }
function docTable(list, withVat) {
  var tb = 0, tv = 0;
  var rows = list.map(function(d) {
    var sg = docSign(d), b = docAmountExVat(d) * sg, v = (d.vat || 0) * sg; tb += b; tv += v;
    return '<tr class="row-link" data-docm="' + esc(d._id) + '"><td class="num">' + fmtDateNum(d.date) + '</td><td class="docno">' + esc(d.docNo || '') + '</td><td>' + esc(d.typeLabel || '') + '</td><td>' + esc(d.party || '') + '</td><td class="r">' + fmtMoney(b) + '</td>' + (withVat ? '<td class="r">' + fmtMoney(v) + '</td>' : '') + '</tr>';
  }).join('');
  return '<div class="items-wrap"><table class="data-table"><thead><tr><th>วันที่</th><th>เลขที่</th><th>ชนิด</th><th>คู่ค้า</th><th class="r">มูลค่า</th>' + (withVat ? '<th class="r">VAT</th>' : '') + '</tr></thead><tbody>' +
    (rows || '<tr><td colspan="6" class="empty-hint">ไม่มีรายการ</td></tr>') + '</tbody>' + (rows ? '<tfoot><tr><td colspan="4">รวม</td><td class="r">' + fmtMoney(tb) + '</td>' + (withVat ? '<td class="r">' + fmtMoney(tv) + '</td>' : '') + '</tr></tfoot>' : '') + '</table></div>';
}
function detailModal(title, body) {
  openModal({ title: title, body: body, focus:false, buttons:[{ label:'ปิด', cls:'btn-primary', onClick: closeModal }], onMount: function() {
    modalBody.querySelectorAll('[data-docm]').forEach(function(tr) { tr.addEventListener('click', function() { openDocDetail(tr.dataset.docm); }); });
  } });
}
function openVatDetail(ym) {
  var docs = periodDocs(ym).filter(function(d) { return d.vat; });
  detailModal('VAT รายละเอียด ' + monthLabel(ym, true),
    '<h3 class="mh">ภาษีขาย</h3>' + docTable(docs.filter(function(d) { return docFlow(d) === 'rev'; }), true) +
    '<h3 class="mh">ภาษีซื้อ</h3>' + docTable(docs.filter(function(d) { return docFlow(d) === 'exp'; }), true));
}
function openExemptDetail(ym) {
  var docs = periodDocs(ym).filter(function(d) { return !d.vat; });
  detailModal('รายละเอียดการยกเว้น ' + monthLabel(ym, true),
    '<p class="small muted" style="margin:0">รายการขายและซื้อในงวดนี้ที่ไม่มี VAT (ยกเว้นภาษี อัตรา 0% หรือคู่ค้าไม่ได้จด VAT) ยอดขายส่วนนี้อยู่ในช่อง 2 ของ ภ.พ.30</p>' +
    '<h3 class="mh">ยอดขายที่ไม่มี VAT</h3>' + docTable(docs.filter(function(d) { return docFlow(d) === 'rev'; }), false) +
    '<h3 class="mh">ยอดซื้อที่ไม่มี VAT (ขอภาษีซื้อคืนไม่ได้)</h3>' + docTable(docs.filter(function(d) { return docFlow(d) === 'exp'; }), false));
}
function openByTaxCode(ym) {
  var groups = [['VAT 7% (ภาษีขาย)', 'rev', true], ['ไม่มี VAT / ยกเว้น (ขาย)', 'rev', false], ['VAT 7% (ภาษีซื้อ)', 'exp', true], ['ไม่มี VAT / ยกเว้น (ซื้อ)', 'exp', false]];
  var docs = periodDocs(ym);
  var body = '<div class="items-wrap"><table class="data-table"><thead><tr><th>รหัสภาษี</th><th class="r">จำนวนเอกสาร</th><th class="r">มูลค่า</th><th class="r">VAT</th></tr></thead><tbody>' +
    groups.map(function(g, i) {
      var l = docs.filter(function(d) { return docFlow(d) === g[1] && !!d.vat === g[2]; });
      var b = l.reduce(function(s, d) { return s + docAmountExVat(d) * docSign(d); }, 0), v = l.reduce(function(s, d) { return s + (d.vat || 0) * docSign(d); }, 0);
      return '<tr class="row-link" data-tc="' + i + '"><td>' + g[0] + '</td><td class="r">' + l.length + '</td><td class="r">' + fmtMoney(b) + '</td><td class="r">' + fmtMoney(v) + '</td></tr>';
    }).join('') + '</tbody></table></div><div id="tcDetail"></div>';
  openModal({ title:'ธุรกรรมตามรหัสภาษี ' + monthLabel(ym, true), body: body, focus:false, buttons:[{ label:'ปิด', cls:'btn-primary', onClick: closeModal }], onMount: function() {
    modalBody.querySelectorAll('[data-tc]').forEach(function(tr) { tr.addEventListener('click', function() {
      var g = groups[Number(tr.dataset.tc)];
      byId('tcDetail').innerHTML = '<h3 class="mh">' + g[0] + '</h3>' + docTable(docs.filter(function(d) { return docFlow(d) === g[1] && !!d.vat === g[2]; }), g[2]);
      byId('tcDetail').querySelectorAll('[data-docm]').forEach(function(r) { r.addEventListener('click', function() { openDocDetail(r.dataset.docm); }); });
    }); });
  } });
}

function openTaxReturn(ym) {
  var v = vatSummary(ym), filed = v.ret && v.ret.filedDate;
  var line = function(no, label, amt, strong) { return '<tr' + (strong ? ' style="font-weight:700"' : '') + '><td class="num muted">' + no + '</td><td>' + label + '</td><td class="r">' + fmtMoney(amt) + '</td></tr>'; };
  var sales = taxDocs().filter(function(d) { return (d.date || '').slice(0,7) === ym && docFlow(d) === 'rev'; });
  var base = round2(sales.reduce(function(s, d) { return s + docAmountExVat(d) * docSign(d); }, 0));
  var zero = round2(sales.filter(function(d) { return !d.vat; }).reduce(function(s, d) { return s + docAmountExVat(d) * docSign(d); }, 0));
  var purch = round2(taxDocs().filter(function(d) { return (d.date || '').slice(0,7) === ym && docFlow(d) === 'exp' && d.vat; }).reduce(function(s, d) { return s + docAmountExVat(d) * docSign(d); }, 0));
  var body = '<p class="small muted" style="margin:0">สรุปตามแบบ ภ.พ.30 งวด ' + monthLabel(ym, true) + ' ใช้กรอกในระบบยื่นแบบของกรมสรรพากร</p>' +
    '<div class="items-wrap"><table class="data-table"><tbody>' +
    line('1', 'ยอดขายในเดือนนี้', base) + line('2', 'หัก ยอดขายที่ไม่ต้องเสียภาษี / ไม่มี VAT', zero) + line('4', 'ยอดขายที่ต้องเสียภาษี', round2(base - zero)) +
    line('5', 'ภาษีขายเดือนนี้', v.out) + line('6', 'ยอดซื้อที่มีสิทธินำภาษีซื้อมาหัก', purch) + line('7', 'ภาษีซื้อเดือนนี้', v.inp) +
    (v.adj ? line('', 'การปรับปรุง', v.adj) : '') +
    line(v.due >= 0 ? '8' : '9', v.due >= 0 ? 'ภาษีที่ต้องชำระเดือนนี้' : 'ภาษีที่ชำระเกินเดือนนี้', Math.abs(v.due), true) +
    '</tbody></table></div>' +
    (filed ? '<div class="banner ok">ยื่นแล้วเมื่อ ' + fmtDate(v.ret.filedDate) + '</div>' : '<div class="field"><label for="fileDate">วันที่ยื่นแบบ</label><input id="fileDate" type="date" value="' + todayStr() + '"></div>');
  var buttons = [];
  if (filed) buttons.push({ label:'ยกเลิกสถานะยื่นแล้ว', cls:'btn-danger', left:true, onClick: function(b) { runSave(b, async function() { await saveReturn(ym, { filedDate: null }); showToast('ยกเลิกสถานะยื่นแล้ว'); closeModal(); }); } });
  buttons.push({ label:'ปิด', onClick: closeModal });
  if (!filed) buttons.push({ label:'ทำเครื่องหมายว่ายื่นแล้ว', cls:'btn-dark', onClick: function(b) {
    var fd = byId('fileDate').value || todayStr();
    runSave(b, async function() { await saveReturn(ym, { filedDate: fd, filedAmount: v.due }); showToast('บันทึกการยื่น ภ.พ.30 งวด ' + monthLabel(ym, true) + ' แล้ว'); closeModal(); });
  } });
  else if (v.bal > 0) buttons.push({ label:'บันทึกการชำระเงิน', cls:'btn-dark', onClick: function() { openTaxPayment(ym); } });
  openModal({ title:'แบบแสดงรายการภาษี ' + monthLabel(ym, true), body: body, buttons: buttons, focus:false });
}
function openTaxPayment(ym) {
  var v = vatSummary(ym);
  openModal({ title:'บันทึกการชำระภาษี ' + monthLabel(ym, true), body:
    '<div class="field-row"><div class="field"><label for="tpDate">วันที่ชำระ</label><input id="tpDate" type="date" value="' + todayStr() + '"></div><div class="field"><label for="tpAmt">จำนวนเงิน</label><input id="tpAmt" type="number" step="any" value="' + v.bal + '"></div></div>' +
    '<div class="field"><label for="tpMethod">วิธีชำระ</label><select id="tpMethod"><option>ชำระออนไลน์ (e-Payment)</option><option>ชำระที่สำนักงานสรรพากร</option><option>ชำระผ่านธนาคาร</option></select></div><div class="form-error" id="formError" hidden></div>',
    buttons:[CANCEL_BTN, { label:'บันทึก', cls:'btn-dark', onClick: function(b) {
      var amt = Number(byId('tpAmt').value);
      if (!(amt > 0)) { var e = byId('formError'); e.textContent = 'ระบุจำนวนเงินมากกว่า 0'; e.hidden = false; return; }
      var pays = (v.ret && v.ret.payments || []).concat([{ date: byId('tpDate').value || todayStr(), amount: amt, method: byId('tpMethod').value }]);
      runSave(b, async function() { await saveReturn(ym, { payments: pays }); showToast('บันทึกการชำระภาษีแล้ว'); closeModal(); });
    } }] });
}
function openTaxAdjust(ymIn) {
  var dm = byId('vatMenu'); if (dm) dm.hidden = true;
  var ym = ymIn || nextPeriod(), v = vatSummary(ym);
  var list = (v.ret && v.ret.adjustments || []);
  openModal({ title:'การปรับปรุงภาษี', body:
    '<div class="field"><label for="adjYm">งวดภาษี</label><input id="adjYm" type="month" value="' + ym + '"></div>' +
    '<div class="field-row"><div class="field"><label for="adjAmt">จำนวนเงิน (+ เพิ่มภาษีที่ต้องชำระ / − ลด)</label><input id="adjAmt" type="number" step="any" placeholder="เช่น -1200"></div><div class="field"><label for="adjReason">เหตุผล</label><input id="adjReason" type="text" placeholder="เช่น ภาษีซื้อยกมา, เบี้ยปรับ"></div></div>' +
    (list.length ? '<div class="items-wrap"><table class="data-table"><thead><tr><th>รายการที่มีอยู่ในงวด ' + monthLabel(ym, true) + '</th><th class="r">จำนวน</th></tr></thead><tbody>' + list.map(function(a) { return '<tr><td>' + esc(a.reason || '-') + '</td><td class="r">' + fmtMoney(a.amount) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') +
    '<div class="form-error" id="formError" hidden></div>',
    buttons:[CANCEL_BTN, { label:'เพิ่มการปรับปรุง', cls:'btn-dark', onClick: function(b) {
      var amt = Number(byId('adjAmt').value), y = byId('adjYm').value || ym;
      if (!amt) { var e = byId('formError'); e.textContent = 'ระบุจำนวนเงินที่ไม่ใช่ 0'; e.hidden = false; return; }
      var r = taxReturn(y);
      var adjs = (r && r.adjustments || []).concat([{ amount: amt, reason: byId('adjReason').value.trim(), date: todayStr() }]);
      runSave(b, async function() { await saveReturn(y, { adjustments: adjs }); showToast('เพิ่มการปรับปรุงภาษีแล้ว'); closeModal(); });
    } }] });
}

function nextMonthDay(ym, day) {
  var d = new Date(ym + '-01T00:00:00'); d.setMonth(d.getMonth() + 1); d.setDate(day);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
}
function taxData() {
  var ym = pageState.taxMonth || todayStr().slice(0,7);
  var inMonth = taxDocs().filter(function(d) { return (d.date || '').slice(0,7) === ym; });
  var outDocs = inMonth.filter(function(d) { return docFlow(d) === 'rev' && d.vat; });
  var inDocs = inMonth.filter(function(d) { return docFlow(d) === 'exp' && d.vat; });
  var outVat = round2(outDocs.reduce(function(s, d) { return s + d.vat * docSign(d); }, 0));
  var inVat = round2(inDocs.reduce(function(s, d) { return s + d.vat * docSign(d); }, 0));
  var pay = round2(outVat - inVat);
  var h = '<p class="hint" style="margin-top:0">เดือนภาษี ' + monthLabel(ym, true) + '</p><div class="kpi-row">' +
    kpi('ภาษีขาย', fmtMoney(outVat), outDocs.length + ' เอกสาร') +
    kpi('ภาษีซื้อ', fmtMoney(inVat), inDocs.length + ' เอกสาร') +
    kpi(pay >= 0 ? 'ภาษีที่ต้องชำระ' : 'ภาษีชำระเกิน (ขอคืน/ยกไป)', fmtMoney(Math.abs(pay)), 'ยื่น ภ.พ.30 ภายใน ' + fmtDate(nextMonthDay(ym, 15)) + ' (ออนไลน์ ' + fmtDate(nextMonthDay(ym, 23)) + ')', pay > 0 ? '' : '') + '</div>';

  function vatTable(list, empty) {
    return tableOrEmpty('<th>วันที่</th><th>เลขที่</th><th>คู่ค้า</th><th>เลขผู้เสียภาษี</th><th class="r">มูลค่า</th><th class="r">VAT</th>',
      list.map(function(d) {
        var c = STORE.contacts.find(function(c) { return c._id === d.contactId || c.name === d.party; });
        var s = docSign(d);
        return '<tr class="row-link" tabindex="0" data-doc="' + esc(d._id) + '"><td style="white-space:nowrap">' + fmtDate(d.date) + '</td><td class="docno">' + esc((d.extra && d.extra.supInvNo) || d.docNo) + ((d.extra && d.extra.supInvNo) ? '<div class="small muted">' + esc(d.docNo) + '</div>' : '') + '</td><td>' + esc(d.party) + (s < 0 ? ' <span class="small muted">(' + esc(d.typeLabel) + ')</span>' : '') + '</td><td class="num small">' + esc(c && c.taxId || '-') + '</td><td class="r">' + fmtMoney(d.subtotal * s) + '</td><td class="r">' + fmtMoney(d.vat * s) + '</td></tr>';
      }).join(''), empty);
  }
  h += '<div class="page-block"><h2>รายงานภาษีขาย</h2>' + vatTable(outDocs, 'ไม่มีเอกสารขายที่มี VAT ในเดือนนี้') + '</div>';
  h += '<div class="page-block"><h2>รายงานภาษีซื้อ</h2>' + vatTable(inDocs, 'ไม่มีเอกสารซื้อที่มี VAT ในเดือนนี้') + '</div>';

  var whtPaid = inMonth.filter(function(d) { return d.group === 'supplier' && d.wht; });
  var whtRecv = inMonth.filter(function(d) { return d.group === 'customer' && d.wht; });
  function entityOf(d) { var c = STORE.contacts.find(function(c) { return c._id === d.contactId || c.name === d.party; }); return c && c.entity === 'person' ? 'person' : 'company'; }
  var p3 = whtPaid.filter(function(d) { return entityOf(d) === 'person'; }), p53 = whtPaid.filter(function(d) { return entityOf(d) === 'company'; });
  function whtRows(list) {
    return list.map(function(d) { return '<tr class="row-link" tabindex="0" data-doc="' + esc(d._id) + '"><td style="white-space:nowrap">' + fmtDate(d.date) + '</td><td class="docno">' + esc(d.docNo) + '</td><td>' + esc(d.party) + '</td><td class="r">' + fmtMoney(d.subtotal) + '</td><td class="r">' + esc(d.whtRate) + '%</td><td class="r">' + fmtMoney(d.wht) + '</td></tr>'; }).join('');
  }
  var whHead = '<th>วันที่</th><th>เลขที่</th><th>ผู้รับเงิน</th><th class="r">เงินได้</th><th class="r">อัตรา</th><th class="r">ภาษีที่หัก</th>';
  h += '<div class="page-block"><h2>ภาษีหัก ณ ที่จ่ายที่ต้องนำส่ง</h2><p class="hint">นำส่งภายใน ' + fmtDate(nextMonthDay(ym, 7)) + ' (ออนไลน์ ' + fmtDate(nextMonthDay(ym, 15)) + ') แยกตามสถานะผู้รับเงินในข้อมูลผู้ติดต่อ</p>' +
    '<div class="kpi-row">' + kpi('ภ.ง.ด.3 (บุคคลธรรมดา)', fmtMoney(sumBy(p3, 'wht')), p3.length + ' รายการ') + kpi('ภ.ง.ด.53 (นิติบุคคล)', fmtMoney(sumBy(p53, 'wht')), p53.length + ' รายการ') + kpi('ถูกลูกค้าหัก ณ ที่จ่าย', fmtMoney(sumBy(whtRecv, 'wht')), 'ใช้เครดิตภาษีตอนยื่น ภ.ง.ด.50') + '</div>' +
    '<div style="height:12px"></div>' + tableOrEmpty(whHead, whtRows(whtPaid), 'ไม่มีรายการหัก ณ ที่จ่ายในเดือนนี้') + '</div>';
  return h;
}
function sumBy(list, f) { return round2(list.reduce(function(s, d) { return s + (Number(d[f]) || 0); }, 0)); }

/* ---- Reports ---- */
function reportsShell() {
  var opts = [['month','เดือนนี้'],['quarter','ไตรมาสนี้'],['year','ปีนี้'],['last12','12 เดือนล่าสุด'],['all','ทั้งหมด'],['custom','กำหนดวันที่เอง']];
  return pageHead('รายงาน', 'ผลประกอบการ ลูกหนี้ เจ้าหนี้ และลูกค้าหลัก ตัวเลขรายได้/ค่าใช้จ่ายไม่รวม VAT') +
    '<div class="toolbar"><div class="field"><label for="rp">ช่วงเวลา</label><select id="rp" data-state="page.reportPeriod">' +
    opts.map(function(o) { return '<option value="' + o[0] + '"' + (pageState.reportPeriod === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' + customRangeHTML(pageState.reportPeriod) + '</div>';
}
function reportsData() {
  var r = periodRange(pageState.reportPeriod);
  var docs = STORE.documents.filter(function(d) { return inRange(d.date || '', r); });
  var pl = plTotals(docs);
  var margin = pl.rev ? Math.round(pl.profit / pl.rev * 1000) / 10 : null;
  var h = '<div class="kpi-row">' + kpi('รายได้', fmtMoney(pl.rev, 0)) + kpi('ค่าใช้จ่าย', fmtMoney(pl.exp, 0)) +
    kpi('กำไรสุทธิ', fmtMoney(pl.profit, 0), margin == null ? '' : 'อัตรากำไร ' + margin + '%', pl.profit < 0 ? 'neg' : '') + '</div>';

  // monthly chart
  var months = last12Months();
  var series = months.map(function(m) {
    return plTotals(STORE.documents.filter(function(d) { return (d.date || '').slice(0,7) === m; }));
  });
  h += '<div class="page-block"><h2>รายได้และค่าใช้จ่ายรายเดือน</h2><p class="hint">12 เดือนล่าสุด ไม่ขึ้นกับช่วงเวลาที่เลือก</p>' + barChart(months, series) + '</div>';

  // P&L
  var revBy = {}, expBy = {};
  docs.forEach(function(d) {
    var f = docFlow(d); if (!f) return;
    var amt = docAmountExVat(d) * docSign(d);
    if (f === 'rev') { var rk = (d.extra && d.extra.incomeCat) || d.typeLabel; revBy[rk] = (revBy[rk] || 0) + amt; }
    else { var k = (d.extra && d.extra.expCategory) || 'ไม่ระบุหมวด'; expBy[k] = (expBy[k] || 0) + amt; }
  });
  function lines(obj) { return Object.keys(obj).sort(function(a, b) { return obj[b] - obj[a]; }).map(function(k) { return '<tr><td style="padding-left:28px">' + esc(k) + '</td><td class="r">' + fmtMoney(obj[k]) + '</td></tr>'; }).join(''); }
  h += '<div class="page-block"><h2>งบกำไรขาดทุน</h2><p class="hint">' + fmtDate(r[0] === '0000-01-01' ? '' : r[0]) + ' – ' + fmtDate(r[1] === '9999-12-31' ? todayStr() : r[1]) + '</p>' +
    '<div class="table-wrap"><table class="data-table"><tbody>' +
    '<tr class="group-row"><td>รายได้</td><td class="r">' + fmtMoney(pl.rev) + '</td></tr>' + (lines(revBy) || '<tr><td class="muted" colspan="2" style="padding-left:28px">ไม่มีรายการ</td></tr>') +
    '<tr class="group-row"><td>ค่าใช้จ่าย</td><td class="r">' + fmtMoney(pl.exp) + '</td></tr>' + (lines(expBy) || '<tr><td class="muted" colspan="2" style="padding-left:28px">ไม่มีรายการ</td></tr>') +
    '</tbody><tfoot><tr><td>กำไร (ขาดทุน) สุทธิ</td><td class="r"' + (pl.profit < 0 ? ' style="color:var(--danger)"' : '') + '>' + fmtMoney(pl.profit) + '</td></tr></tfoot></table></div></div>';

  // Aging
  function agingTable(list) {
    var b = agingBuckets(list), tot = 0, n = 0;
    return tableOrEmpty('<th>อายุหนี้</th><th class="r">จำนวน</th><th class="r">ยอดคงค้าง</th>', b.map(function(x) { tot += x.amt; n += x.n; return '<tr><td>' + x.label + '</td><td class="r">' + x.n + '</td><td class="r">' + fmtMoney(x.amt) + '</td></tr>'; }).join(''), '',
      '<tr><td>รวม</td><td class="r">' + n + '</td><td class="r">' + fmtMoney(tot) + '</td></tr>');
  }
  h += '<div class="page-block two-col"><div><h2>ลูกหนี้ค้างรับตามอายุหนี้</h2>' + agingTable(openItems('invoice')) + '</div><div><h2>เจ้าหนี้ค้างจ่ายตามอายุหนี้</h2>' + agingTable(openItems('bill')) + '</div></div>';

  // Top customers
  var byCust = {};
  docs.forEach(function(d) { if (docFlow(d) === 'rev') byCust[d.party] = (byCust[d.party] || 0) + docAmountExVat(d) * docSign(d); });
  var top = Object.keys(byCust).sort(function(a, b) { return byCust[b] - byCust[a]; }).slice(0, 5);
  h += '<div class="page-block"><h2>ลูกค้าที่มียอดขายสูงสุด</h2>' + tableOrEmpty('<th>ลูกค้า</th><th class="r">ยอดขาย</th><th class="r">สัดส่วน</th>',
    top.map(function(k) { return '<tr><td>' + esc(k) + '</td><td class="r">' + fmtMoney(byCust[k]) + '</td><td class="r">' + (pl.rev ? Math.round(byCust[k] / pl.rev * 100) : 0) + '%</td></tr>'; }).join(''), 'ยังไม่มียอดขายในช่วงนี้') + '</div>';
  return h;
}

function niceMax(v) {
  if (v <= 0) return 1000;
  var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
function shortMoney(v) {
  if (v >= 1e6) return (v / 1e6).toLocaleString('th-TH', { maximumFractionDigits:1 }) + 'M';
  if (v >= 1e3) return (v / 1e3).toLocaleString('th-TH', { maximumFractionDigits:1 }) + 'K';
  return String(Math.round(v));
}
var CHART_DATA = null;
function barChart(months, series) {
  CHART_DATA = { months: months, series: series };
  var W = 720, H = 250, L = 48, R = 8, T = 12, B = 30;
  var max = niceMax(Math.max.apply(null, series.map(function(s) { return Math.max(s.rev, s.exp, 0); })));
  var pw = W - L - R, ph = H - T - B, slot = pw / months.length, bw = Math.min(16, (slot - 12) / 2);
  var y = function(v) { return T + ph - (Math.max(v, 0) / max) * ph; };
  var svg = '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="กราฟรายได้และค่าใช้จ่ายรายเดือน">';
  for (var i = 0; i <= 4; i++) {
    var v = max * i / 4, yy = y(v);
    svg += '<line class="' + (i ? 'grid' : 'base') + '" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/>';
    svg += '<text x="' + (L - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + shortMoney(v) + '</text>';
  }
  function bar(x, v, color) {
    if (v <= 0) return '';
    var top = y(v), base = y(0), hgt = base - top, r = Math.min(4, hgt, bw / 2);
    return '<path fill="' + color + '" d="M' + x + ',' + base + 'V' + (top + r) + 'Q' + x + ',' + top + ' ' + (x + r) + ',' + top + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + top + ' ' + (x + bw) + ',' + (top + r) + 'V' + base + 'Z"/>';
  }
  months.forEach(function(m, i) {
    var cx = L + slot * i + slot / 2;
    svg += '<rect class="hit" data-i="' + i + '" x="' + (L + slot * i + 1) + '" y="' + T + '" width="' + (slot - 2) + '" height="' + ph + '" rx="4"/>';
    svg += bar(cx - bw - 1, series[i].rev, 'var(--series-rev)');
    svg += bar(cx + 1, series[i].exp, 'var(--series-exp)');
    svg += '<text x="' + cx + '" y="' + (H - 10) + '" text-anchor="middle">' + monthLabel(m) + '</text>';
  });
  svg += '</svg>';
  var table = '<details class="table-view"><summary>ดูเป็นตาราง</summary><div class="items-wrap"><table class="data-table"><thead><tr><th>เดือน</th><th class="r">รายได้</th><th class="r">ค่าใช้จ่าย</th><th class="r">กำไร</th></tr></thead><tbody>' +
    months.map(function(m, i) { return '<tr><td>' + monthLabel(m, true) + '</td><td class="r">' + fmtMoney(series[i].rev) + '</td><td class="r">' + fmtMoney(series[i].exp) + '</td><td class="r">' + fmtMoney(series[i].profit) + '</td></tr>'; }).join('') +
    '</tbody></table></div></details>';
  return '<div class="chart-card" id="chartCard"><div class="chart-legend"><span><i style="background:var(--series-rev)"></i>รายได้</span><span><i style="background:var(--series-exp)"></i>ค่าใช้จ่าย</span></div>' + svg +
    '<div class="chart-tip" id="chartTip"></div>' + table + '</div>';
}
function bindChart() {
  var card = byId('chartCard'), tip = byId('chartTip');
  if (!card) return;
  card.querySelectorAll('.hit').forEach(function(h) {
    function show() {
      var i = Number(h.dataset.i), s = CHART_DATA.series[i];
      tip.innerHTML = '<div class="tt">' + monthLabel(CHART_DATA.months[i], true) + '</div>' +
        '<div class="ln"><span><i style="background:var(--series-rev)"></i>รายได้</span><span class="num">' + fmtMoney(s.rev, 0) + '</span></div>' +
        '<div class="ln"><span><i style="background:var(--series-exp)"></i>ค่าใช้จ่าย</span><span class="num">' + fmtMoney(s.exp, 0) + '</span></div>' +
        '<div class="ln" style="margin-top:3px;font-weight:600"><span>กำไร</span><span class="num">' + fmtMoney(s.profit, 0) + '</span></div>';
      tip.style.display = 'block';
      var cr = card.getBoundingClientRect(), hr = h.getBoundingClientRect();
      var left = hr.left - cr.left + hr.width / 2 - tip.offsetWidth / 2;
      tip.style.left = Math.max(8, Math.min(left, cr.width - tip.offsetWidth - 8)) + 'px';
      tip.style.top = (hr.top - cr.top + 4) + 'px';
    }
    h.addEventListener('mouseenter', show);
    h.addEventListener('click', show);
    h.addEventListener('mouseleave', function() { tip.style.display = 'none'; });
  });
}

/* ================= Wiring ================= */
function rowActivate(e) {
  var t = e.target.closest('[data-doc],[data-contact],[data-product],[data-acc],[data-emp]');
  if (!t) return;
  if (e.type === 'keydown' && e.key !== 'Enter') return;
  if (t.dataset.doc) openDocDetail(t.dataset.doc);
  else if (t.dataset.contact) openRecordForm('contacts', STORE.contacts.find(function(c) { return c._id === t.dataset.contact; }));
  else if (t.dataset.product) openRecordForm('products', STORE.products.find(function(p) { return p._id === t.dataset.product; }));
  else if (t.dataset.emp) openRecordForm('employees', STORE.employees.find(function(e) { return e._id === t.dataset.emp; }));
  else if (t.dataset.acc) openRecordForm('accounts', STORE.accounts.find(function(a) { return a._id === t.dataset.acc; }));
}
['click','keydown'].forEach(function(ev) {
  byId('sectionContent').addEventListener(ev, rowActivate);
  byId('recentBody').addEventListener(ev, rowActivate);
});
byId('sectionContent').addEventListener('click', function(e) { if (e.target.closest('[data-soon]')) showToast('ฟีเจอร์นี้จะเปิดให้ใช้งานเร็ว ๆ นี้'); });
function goFromEl(e) { var t = e.target.closest('[data-go]'); if (!t) return; if (e.type === 'keydown' && e.key !== 'Enter') return; var gp = t.dataset.go.split(':'); go(gp[0], gp[1]); }
['click','keydown'].forEach(function(ev) { byId('glanceGrid').addEventListener(ev, goFromEl); });
byId('pillRow').addEventListener('click', goFromEl);

byId('modalClose').addEventListener('click', closeModal);
overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });
menuOverlay.addEventListener('click', function(e) { if (e.target === menuOverlay) closeMenu(); });
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { if (overlay.classList.contains('open')) closeModal(); else closeMenu(); } });

byId('sidebarCreateBtn').addEventListener('click', openMenu);
byId('sidebarAppsBtn').addEventListener('click', openMenu);
byId('showAllBtn').addEventListener('click', openMenu);
byId('sidebarAccountingBtn').addEventListener('click', function() { go('accounting'); });
byId('sidebarHomeBtn').addEventListener('click', showHome);
byId('sidebarFeedBtn').addEventListener('click', function() { go('alldocs'); });
byId('sidebarReportsBtn').addEventListener('click', function() { go('reports'); });
document.querySelectorAll('.chip-btn[data-open]').forEach(function(b) { b.addEventListener('click', function() { openDocForm(b.dataset.open); }); });
byId('globalSearch').addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  listState.alldocs = { q: e.target.value.trim() };
  go('alldocs');
});
byId('homeDate').textContent = new Date().toLocaleDateString('th-TH', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

buildMenu();
buildSubnav();
renderDatalists();
renderDashboard();
initDb();
