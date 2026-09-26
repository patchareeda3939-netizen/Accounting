/* ================= Standard reports ================= */
var REPORT_GROUPS = [
  ['ตัวสร้างรายงานกำหนดเอง', [['revrec','รายงานการรับรู้รายรับ (เบต้า)'],['invStatus','สถานะสินค้าคงคลัง'],['billApproval','สถานะการอนุมัติบิล'],['prodProfit','ความสามารถในการทำกำไรของผลิตภัณฑ์/รายการโดยลูกค้า'],['invApproval','สถานะการอนุมัติใบแจ้งหนี้']]],
  ['ภาพรวมธุรกิจ', [['incExpMonthly','รายรับ-รายจ่าย รายเดือน'],['plTag','กำไรขาดทุนตามแท็กกลุ่ม'],['plDetail','กำไรขาดทุน รายละเอียด']]],
  ['ใครติดหนี้คุณ', [['arSum','ลูกหนี้การค้า สรุปอายุ'],['arDetail','ลูกหนี้การค้า รายละเอียดอายุ'],['collections','รายงานการเก็บเงิน'],['custBalSum','ลูกค้า สรุปยอดคงเหลือ'],['custBalDetail','ลูกค้า รายละเอียดยอดคงเหลือ'],['invoiceList','ใบแจ้งหนี้ รายการ'],['invPay','ใบแจ้งหนี้และการชำระเงินที่ได้รับ'],['openInv','เปิด ใบแจ้งหนี้'],['terms','รายการเงื่อนไข'],['unbilledCharges','ที่ยังไม่ได้ออกใบแจ้งหนี้ ค่าบริการ'],['unbilledTime','ที่ยังไม่ได้ออกใบแจ้งหนี้ เวลา']]],
  ['การขายและลูกค้า', [['invValDetail','การประเมินราคาสินค้าคงคลัง รายละเอียด'],['invValSum','การประเมินราคาสินค้าคงคลัง ข้อมูลอย่างย่อ'],['openPODetail','เปิดใบสั่งซื้อ รายละเอียด'],['openPOList','เปิดใบสั่งซื้อ รายการ'],['countSheet','เวิร์กชีตการตรวจนับสินค้า'],['invStatus','สถานะสินค้าคงคลัง'],['cfPay','Cashflow Payment Transactions'],['salesCustType','ยอดขายตามลูกค้า ประเภทรายละเอียด'],['custContacts','ลูกค้า รายชื่อติดต่อ'],['incomeCust','รายได้ โดยลูกค้า ข้อมูลสรุป'],['custPhones','ลูกค้า รายการโทรศัพท์'],['salesCustSum','การขาย โดยลูกค้า ข้อมูลอย่างย่อ'],['salesCustDetail','การขาย โดยลูกค้า รายละเอียด'],['depositDetail','รายละเอียดการฝากเงิน'],['estCust','ใบประเมินราคา ภายใน ลูกค้า'],['prodList','ผลิตภัณฑ์/บริการ รายการ'],['salesProdSum','การขาย โดยผลิตภัณฑ์/บริการ ข้อมูลอย่างย่อ'],['salesProdDetail','การขาย โดยผลิตภัณฑ์/บริการ รายละเอียด'],['payMethods','วิธีการชำระเงิน รายการ'],['timeCust','กิจกรรมเวลา โดยลูกค้า รายละเอียด'],['txCust','รายการธุรกรรมโดย ลูกค้า'],['txTag','รายการธุรกรรมตามกลุ่มแท็ก']]],
  ['สิ่งที่คุณเป็นหนี้', [['apSum','ระบบบัญชีเจ้าหนี้ สรุปอายุ'],['apDetail','ระบบบัญชีเจ้าหนี้ รายละเอียดอายุ'],['billsPay','ใบวางบิลและการชำระเงินที่ใช้'],['invPayList','ใบแจ้งหนี้ รายการชำระเงิน'],['unpaidBills','ยังไม่ได้ชำระ บิล'],['supBalSum','ซัพพลายเออร์ สรุปยอดคงเหลือ'],['supBalDetail','ซัพพลายเออร์ รายละเอียดยอดคงเหลือ']]],
  ['ค่าใช้จ่ายและซัพพลายเออร์', [['checkDetail','รายละเอียดเช็ค'],['purchProd','ซื้อโดยผลิตภัณฑ์/บริการ รายละเอียด'],['purchList','รายการซื้อ'],['txSup','รายการธุรกรรมโดย ซัพพลายเออร์'],['purchSup','ซื้อโดยซัพพลายเออร์ รายละเอียด'],['supContacts','ซัพพลายเออร์ รายชื่อติดต่อ'],['expSup','ค่าใช้จ่าย โดยซัพพลายเออร์ ข้อมูลอย่างย่อ'],['supPhones','ซัพพลายเออร์ รายการโทรศัพท์']]],
  ['ภาษีการขาย', [['taxLiab','ภาษีหนี้สิน รายงาน']]],
  ['พนักงาน', [['empContacts','พนักงาน รายชื่อติดต่อ']]],
  ['สำหรับนักบัญชีของฉัน', [['accList','รายการบัญชี'],['bs','งบดุล'],['bsCompare','งบดุล การเปรียบเทียบ'],['bsDetail','งบดุล รายละเอียด'],['bsSum','งบดุล ข้อมูลสรุป'],['cashflow','งบกระแสเงินสด'],['badJournal','ธุรกรรมในสมุดรายวันไม่ถูกต้อง'],['gl','บัญชีแยกประเภททั่วไป'],['glList','รายการบัญชีแยกประเภททั่วไป'],['journal','สมุดรายวัน'],['pl','กำไรขาดทุน'],['plCust','กำไรขาดทุน ภายใน ลูกค้า'],['plMonth','กำไรขาดทุน ตาม เดือน'],['plCompare','กำไรขาดทุน การเปรียบเทียบ'],['plPct','กำไรขาดทุน เป็น % ของทั้งหมด รายได้'],['plYtd','กำไรขาดทุน การเปรียบเทียบระหว่างต้นปี'],['plQuarter','รายไตรมาสกำไรขาดทุน ข้อมูลสรุป'],['recentTx','ธุรกรรมล่าสุด'],['tb','งบทดลอง'],['tbAdj','งบทดลองหลังการปรับปรุง'],['txAcc','รายละเอียดธุรกรรมตามบัญชี'],['txDate','รายการธุรกรรมตามวันที่'],['txSplit','รายการธุรกรรมพร้อมรายการแยก']]],
  ['เวลา', [['timeRecent','ล่าสุด/แก้ไขแล้ว กิจกรรมเวลา'],['timeEmp','กิจกรรมเวลา โดยพนักงาน รายละเอียด']]],
  ['การจ่ายเงินเดือน', [['tsEmp','Timesheet Detail by Employee'],['timePayType','Time Summary by Pay Type']]]
];
var REPORT_NAME = {};
// cash-basis movements: every posting that hits a cash/bank account, labelled by the document's category
function cashFlowLines() {
  var isCash = {}; STORE.accounts.forEach(function(a) { if (accSubtype(a) === 'bank') isCash[a.code] = 1; }); isCash[SYS.cash] = 1; isCash[SYS.bank] = 1;
  var out = [];
  STORE.documents.forEach(function(d) {
    var ls = postingsOf(d), cashLs = ls.filter(function(l) { return isCash[l.code]; }); if (!cashLs.length) return;
    var other = ls.filter(function(l) { return !isCash[l.code]; }); if (!other.length) return; // transfer between cash accounts
    var cat;
    if (d.extra && d.extra.openingFor) return; // opening balances are not cash received
    if (d.type === 'journalEntry') {
      // only income/expense counterparts are รายรับ-รายจ่าย; capital, loans, opening balances and transfers are not
      var pl = other.filter(function(l) { var b = accBaseOf(l.code); return b === 'income' || b === 'expense'; });
      if (!pl.length) return;
      var o = pl.slice().sort(function(a, b) { return (b.dr + b.cr) - (a.dr + a.cr); })[0]; cat = o.code;
    }
    else cat = catAcc(d, d.group === 'customer' ? SYS.sales : SYS.exp);
    var label = cat + ' ' + (acctName(cat) || '');
    var byDate = {}; cashLs.forEach(function(l) { byDate[l.date] = (byDate[l.date] || 0) + l.dr - l.cr; });
    Object.keys(byDate).forEach(function(dt) { var a = round2(byDate[dt]); if (a) out.push({ date: dt, amt: a, cat: label, d: d }); });
  });
  return out;
}
REPORT_GROUPS.forEach(function(g) { g[1].forEach(function(r) { REPORT_NAME[r[0]] = r[1]; }); });
pageState.repQ = ''; pageState.repId = null; pageState.repPeriod = 'year'; pageState.repClosed = {};

function favList() { try { return JSON.parse(localStorage.getItem('psm_fav_reports') || '[]'); } catch (e) { return pageState._fav || []; } }
function setFav(list) { pageState._fav = list; try { localStorage.setItem('psm_fav_reports', JSON.stringify(list)); } catch (e) {} }

function stdReportsShell() {
  return '<div class="tx-head"><div class="rep-search"><input id="repSearch" list="dl_reports" type="search" placeholder="พิมพ์ชื่อรายงานที่นี่" aria-label="ค้นหารายงาน" value="' + esc(pageState.repQ) + '">' +
    '<datalist id="dl_reports">' + Object.keys(REPORT_NAME).map(function(k) { return '<option value="' + esc(REPORT_NAME[k]) + '"></option>'; }).join('') + '</datalist></div>' +
    '<div class="coa-actions"><button class="btn btn-dark" type="button" onclick="go(\'reports\',\'custom\')">สร้างรายงานใหม่</button></div></div>';
}
function stdReportsData() {
  var q = (pageState.repQ || '').toLowerCase(), fav = favList();
  var star = function(id) { var on = fav.indexOf(id) >= 0; return '<button type="button" class="star' + (on ? ' on' : '') + '" data-star="' + id + '" aria-label="' + (on ? 'เอาออกจากรายการโปรด' : 'เพิ่มในรายการโปรด') + '" aria-pressed="' + on + '">' + (on ? '★' : '☆') + '</button>'; };
  var item = function(r) { return '<div class="rep-item"><button type="button" class="rep-link" data-rep="' + r[0] + '">' + esc(r[1]) + '</button>' + star(r[0]) + '</div>'; };
  function section(key, title, items, intro) {
    var closed = pageState.repClosed[key];
    return '<section class="rep-sec"><button type="button" class="rep-sec-head" data-sec="' + key + '" aria-expanded="' + !closed + '"><span class="rep-chev' + (closed ? ' closed' : '') + '">⌄</span>' + title + '</button>' +
      (closed ? '' : (intro || '') + (items.length ? '<div class="rep-grid">' + items.map(item).join('') + '</div>' : '')) + '</section>';
  }
  var favItems = fav.filter(function(id) { return REPORT_NAME[id]; }).map(function(id) { return [id, REPORT_NAME[id]]; });
  var h = '';
  if (!q) h += section('fav', 'รายการโปรด', favItems, favItems.length ? '' : '<p class="rep-intro">เปิดรายการโปรดได้ เลือกดาวเพื่อเพิ่มรายงานที่คุณใช้บ่อยที่สุด</p>');
  REPORT_GROUPS.forEach(function(g, i) {
    var items = g[1].filter(function(r) { return !q || r[1].toLowerCase().indexOf(q) >= 0; });
    if (q && !items.length) return;
    var intro = i === 0 && !q ? '<p class="rep-intro">ตรวจสอบวิธีสร้างและดูรายงานแบบใหม่ ปรับแต่งรายงานยอดนิยมเหล่านี้หรือทำใหม่ตั้งแต่ต้นกับ <button type="button" class="chip-link" style="padding:0" onclick="go(\'reports\',\'custom\')">สร้างรายงานใหม่</button></p>' : '';
    h += section('g' + i, g[0], items, intro);
  });
  return h || '<p class="empty-hint">ไม่พบรายงานชื่อ "' + esc(pageState.repQ) + '"</p>';
}
function bindStdReports() {
  var c = byId('pageData');
  c.querySelectorAll('[data-star]').forEach(function(b) { b.addEventListener('click', function() {
    var id = b.dataset.star, f = favList(), i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    setFav(f); refreshPageData(); showToast(i >= 0 ? 'เอาออกจากรายการโปรดแล้ว' : 'เพิ่มในรายการโปรดแล้ว');
  }); });
  c.querySelectorAll('[data-sec]').forEach(function(b) { b.addEventListener('click', function() { pageState.repClosed[b.dataset.sec] = !pageState.repClosed[b.dataset.sec]; refreshPageData(); }); });
  c.querySelectorAll('[data-rep]').forEach(function(b) { b.addEventListener('click', function() { openReport(b.dataset.rep); }); });
}
function bindStdShell() {
  var s = byId('repSearch'); if (!s) return;
  s.addEventListener('input', function() {
    var hit = Object.keys(REPORT_NAME).find(function(k) { return REPORT_NAME[k] === s.value; });
    if (hit) { openReport(hit); return; }
    pageState.repQ = s.value; refreshPageData();
  });
}
function openReport(id) { pageState.repId = id; go('reports', 'view'); }

/* ---- Report viewer ---- */
function repRange() { return periodRange(pageState.repPeriod); }
function inRep(d) { return inRange(d.date || '', repRange()); }
var M = function(n) { return fmtMoney(n); };
function contactOf(name) { return STORE.contacts.find(function(c) { return c.name === name; }) || {}; }
function dn(d) { return '<span class="docno">' + esc(d.docNo || '') + '</span>'; }
function rowDoc(d, cells) { return { doc: d._id, c: cells }; }
function G(label) { return { g: label }; }
function T(cells) { return { t: cells }; }
function sumF(list, fn) { return round2(list.reduce(function(s, x) { return s + (fn(x) || 0); }, 0)); }
function byKey(list, fn) { var o = {}; list.forEach(function(x) { var k = fn(x) || '(ไม่ระบุ)'; (o[k] = o[k] || []).push(x); }); return o; }
function sortedKeys(o) { return Object.keys(o).sort(function(a, b) { return a.localeCompare(b, 'th'); }); }
var DOCS = function() { return STORE.documents; };
function flowDocs(f) { return DOCS().filter(function(d) { return docFlow(d) === f && inRep(d); }); }
function amt(d) { return docAmountExVat(d) * docSign(d); }
function dueOf(d) { return (d.extra && (d.extra.dueDate || d.extra.deliveryDate)) || d.date; }

function stdDocTable(list, opts) {
  opts = opts || {};
  var cols = [['วันที่'],['ชนิด'],['เลขที่'],[opts.party || 'คู่ค้า']].concat(opts.extraCols || []).concat([[opts.amtLabel || 'จำนวนเงิน', 1]]);
  var rows = list.map(function(d) { return rowDoc(d, [fmtDateNum(d.date), esc(d.typeLabel), dn(d), esc(d.party)].concat(opts.extra ? opts.extra(d) : []).concat([M(opts.val ? opts.val(d) : d.total)])); });
  var foot = rows.length ? T(['รวม'].concat(new Array(cols.length - 2).fill('')).concat([M(sumF(list, opts.val || function(d) { return d.total; }))])) : null;
  return { cols: cols, rows: foot ? rows.concat([foot]) : rows };
}
function groupedDocTable(list, keyFn, opts) {
  opts = opts || {};
  var groups = byKey(list, keyFn), rows = [], grand = 0, val = opts.val || function(d) { return d.total; };
  sortedKeys(groups).forEach(function(k) {
    rows.push(G(k));
    groups[k].forEach(function(d) { rows.push(rowDoc(d, [fmtDateNum(d.date), esc(d.typeLabel), dn(d)].concat(opts.extra ? opts.extra(d) : []).concat([M(val(d))]))); });
    var s = sumF(groups[k], val); grand += s;
    rows.push(T(['รวม ' + esc(k)].concat(new Array(2 + (opts.extraCols || []).length).fill('')).concat([M(s)])));
  });
  if (rows.length) rows.push(T(['รวมทั้งสิ้น'].concat(new Array(2 + (opts.extraCols || []).length).fill('')).concat([M(grand)])));
  return { cols: [['วันที่'],['ชนิด'],['เลขที่']].concat(opts.extraCols || []).concat([[opts.amtLabel || 'จำนวนเงิน', 1]]), rows: rows };
}
function summaryBy(list, keyFn, valFn, label) {
  var o = {}; list.forEach(function(d) { var k = keyFn(d) || '(ไม่ระบุ)'; o[k] = (o[k] || 0) + valFn(d); });
  var keys = Object.keys(o).sort(function(a, b) { return o[b] - o[a]; }), tot = 0;
  var rows = keys.map(function(k) { tot += o[k]; return [esc(k), M(o[k])]; });
  if (rows.length) rows.push(T(['รวม', M(tot)]));
  return { cols: [[label], ['จำนวนเงิน', 1]], rows: rows };
}
function agingSummary(list) {
  var names = byKey(list, function(d) { return d.party; }), t = todayStr();
  var tot = [0,0,0,0,0,0];
  var rows = sortedKeys(names).map(function(k) {
    var b = [0,0,0,0,0];
    names[k].forEach(function(d) { var late = daysBetween(dueOf(d), t); b[late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : late <= 90 ? 3 : 4] += docBal(d); });
    var s = b.reduce(function(a, x) { return a + x; }, 0);
    b.concat([s]).forEach(function(v, i) { tot[i] += v; });
    return [esc(k)].concat(b.concat([s]).map(function(v) { return v ? M(v) : ''; }));
  });
  if (rows.length) rows.push(T(['รวม'].concat(tot.map(M))));
  return { cols: [['ชื่อ'],['ปัจจุบัน',1],['1–30',1],['31–60',1],['61–90',1],['เกิน 90',1],['รวม',1]], rows: rows, asOf: true };
}
function agingDetail(list) {
  var t = todayStr();
  var buckets = [['ปัจจุบัน', function(l) { return l <= 0; }], ['เกินกำหนด 1–30 วัน', function(l) { return l > 0 && l <= 30; }], ['เกินกำหนด 31–60 วัน', function(l) { return l > 30 && l <= 60; }], ['เกินกำหนด 61–90 วัน', function(l) { return l > 60 && l <= 90; }], ['เกินกำหนด 91 วันขึ้นไป', function(l) { return l > 90; }]];
  var rows = [], grand = 0;
  buckets.forEach(function(b) {
    var l = list.filter(function(d) { return b[1](daysBetween(dueOf(d), t)); });
    if (!l.length) return;
    rows.push(G(b[0]));
    l.forEach(function(d) { rows.push(rowDoc(d, [fmtDateNum(d.date), esc(d.typeLabel), dn(d), esc(d.party), fmtDateNum(dueOf(d)), String(Math.max(0, daysBetween(dueOf(d), t))), M(docBal(d))])); });
    var s = sumF(l, docBal); grand += s;
    rows.push(T(['รวม ' + b[0], '', '', '', '', '', M(s)]));
  });
  if (rows.length) rows.push(T(['รวมทั้งสิ้น', '', '', '', '', '', M(grand)]));
  return { cols: [['วันที่'],['ชนิด'],['เลขที่'],['ชื่อ'],['ครบกำหนด'],['ค้างเกิน (วัน)',1],['ยอดคงค้าง',1]], rows: rows, asOf: true };
}
function balanceSummary(list) {
  var o = byKey(list, function(d) { return d.party; }), tot = 0;
  var rows = sortedKeys(o).map(function(k) { var s = sumF(o[k], docBal); tot += s; return [esc(k), M(s)]; });
  if (rows.length) rows.push(T(['รวม', M(tot)]));
  return { cols: [['ชื่อ'],['ยอดคงเหลือ',1]], rows: rows, asOf: true };
}
function balanceDetail(list) {
  var r = groupedDocTable(list, function(d) { return d.party; }, { extraCols:[['ครบกำหนด']], extra: function(d) { return [fmtDateNum(dueOf(d))]; }, val: docBal, amtLabel:'ยอดคงค้าง' });
  r.asOf = true; return r;
}
function contactList(kind, phoneOnly) {
  var list = STORE.contacts.filter(function(c) { return kind === 'customer' ? c.kind !== 'supplier' : c.kind !== 'customer'; });
  return { cols: phoneOnly ? [['ชื่อ'],['โทรศัพท์']] : [['ชื่อ'],['โทรศัพท์'],['อีเมล'],['เลขผู้เสียภาษี'],['ที่อยู่']],
    rows: list.map(function(c) { return phoneOnly ? [esc(c.name), esc(c.phone || '-')] : [esc(c.name), esc(c.phone || '-'), esc(c.email || '-'), '<span class="num">' + esc(c.taxId || '-') + '</span>', esc(c.address || '-')]; }), noPeriod: true };
}
function itemLines(types, keyFn) {
  var lines = [];
  DOCS().forEach(function(d) { if (types.indexOf(d.type) >= 0 && inRep(d) && d.items) d.items.forEach(function(it) { lines.push({ d: d, it: it, v: (Number(it.qty) || 0) * (Number(it.price) || 0) }); }); });
  return lines;
}
function itemsSummary(types, label) {
  var o = {}; itemLines(types).forEach(function(l) { var b = o[l.it.name] = o[l.it.name] || { q:0, v:0 }; b.q += Number(l.it.qty) || 0; b.v += l.v; });
  var keys = Object.keys(o).sort(function(a, b) { return o[b].v - o[a].v; }), tq = 0, tv = 0;
  var rows = keys.map(function(k) { tq += o[k].q; tv += o[k].v; return [esc(k), fmtNum(o[k].q), M(o[k].v), M(o[k].q ? o[k].v / o[k].q : 0)]; });
  if (rows.length) rows.push(T(['รวม', fmtNum(tq), M(tv), '']));
  return { cols: [[label], ['จำนวน',1], ['ยอดรวม',1], ['ราคาเฉลี่ย',1]], rows: rows };
}
function itemsDetail(types) {
  var lines = itemLines(types), o = {};
  lines.forEach(function(l) { (o[l.it.name] = o[l.it.name] || []).push(l); });
  var rows = [], grand = 0;
  sortedKeys(o).forEach(function(k) {
    rows.push(G(k));
    o[k].forEach(function(l) { rows.push({ doc: l.d._id, c: [fmtDateNum(l.d.date), esc(l.d.typeLabel), dn(l.d), esc(l.d.party), fmtNum(l.it.qty), M(l.it.price), M(l.v)] }); });
    var s = sumF(o[k], function(l) { return l.v; }); grand += s;
    rows.push(T(['รวม ' + esc(k), '', '', '', '', '', M(s)]));
  });
  if (rows.length) rows.push(T(['รวมทั้งสิ้น', '', '', '', '', '', M(grand)]));
  return { cols: [['วันที่'],['ชนิด'],['เลขที่'],['คู่ค้า'],['จำนวน',1],['ราคา',1],['ยอดรวม',1]], rows: rows };
}
function plRows(docs) {
  var rev = {}, exp = {};
  docs.forEach(function(d) { postingsOf(d).forEach(function(l) { var b = accBaseOf(l.code), k = l.code + ' ' + (acctName(l.code) || ''); if (b === 'income') rev[k] = (rev[k] || 0) + l.cr - l.dr; else if (b === 'expense') exp[k] = (exp[k] || 0) + l.dr - l.cr; }); });
  return { rev: rev, exp: exp };
}
function plMulti(periods) {
  var parts = periods.map(function(p) { return plRows(DOCS().filter(function(d) { return inRange(d.date || '', p[1]); })); });
  var revK = {}, expK = {};
  parts.forEach(function(p) { Object.keys(p.rev).forEach(function(k) { revK[k] = 1; }); Object.keys(p.exp).forEach(function(k) { expK[k] = 1; }); });
  var rows = [G('รายได้')];
  Object.keys(revK).forEach(function(k) { rows.push(['&nbsp;&nbsp;' + esc(k)].concat(parts.map(function(p) { return M(p.rev[k] || 0); }))); });
  var tr = parts.map(function(p) { return sumF(Object.keys(p.rev), function(k) { return p.rev[k]; }); });
  rows.push(T(['รวมรายได้'].concat(tr.map(M))));
  rows.push(G('ค่าใช้จ่าย'));
  Object.keys(expK).forEach(function(k) { rows.push(['&nbsp;&nbsp;' + esc(k)].concat(parts.map(function(p) { return M(p.exp[k] || 0); }))); });
  var te = parts.map(function(p) { return sumF(Object.keys(p.exp), function(k) { return p.exp[k]; }); });
  rows.push(T(['รวมค่าใช้จ่าย'].concat(te.map(M))));
  rows.push(T(['กำไร (ขาดทุน) สุทธิ'].concat(tr.map(function(v, i) { return M(v - te[i]); }))));
  return { cols: [['']].concat(periods.map(function(p) { return [p[0], 1]; })), rows: rows, noPeriod: periods.length > 1 };
}
function shiftYear(r, n) { return r.map(function(s) { return s === '0000-01-01' || s === '9999-12-31' ? s : (Number(s.slice(0,4)) + n) + s.slice(4); }); }
function accName(code) { return acctName(code); }
function journalLines(filterFn) { return allLines(filterFn); }
function balancesAt(end) {
  var bal = {};
  allLines().filter(function(l) { return (l.date || '') <= end; }).forEach(function(l) { var b = bal[l.code] = bal[l.code] || { dr:0, cr:0 }; b.dr += l.dr; b.cr += l.cr; });
  return bal;
}
function bsData(end) {
  var bal = balancesAt(end), sec = { asset:[], liability:[], equity:[] }, earnings = 0;
  Object.keys(bal).forEach(function(code) {
    var a = STORE.accounts.find(function(x) { return x.code === code; }), base = a ? subtypeBase(accSubtype(a)) : ({ '1':'asset','2':'liability','3':'equity','4':'income','5':'expense' })[code.charAt(0)];
    var b = bal[code];
    if (base === 'income') earnings += b.cr - b.dr;
    else if (base === 'expense') earnings -= b.dr - b.cr;
    else if (sec[base]) sec[base].push({ code: code, name: a ? a.name : '', sub: a ? subtypeLabel(accSubtype(a)) : '', v: base === 'asset' ? b.dr - b.cr : b.cr - b.dr });
  });
  sec.equity.push({ code: '', name: 'กำไร (ขาดทุน) สุทธิงวดนี้', sub: 'ส่วนของเจ้าของ', v: earnings });
  return sec;
}
function bsReport(ends, mode) {
  var datas = ends.map(function(e) { return bsData(e[1]); });
  var rows = [], labels = { asset:'สินทรัพย์', liability:'หนี้สิน', equity:'ส่วนของเจ้าของ' }, totals = {};
  ['asset','liability','equity'].forEach(function(s) {
    rows.push(G(labels[s]));
    var keys = {}; datas.forEach(function(d) { d[s].forEach(function(x) { keys[x.code + '|' + x.name] = x; }); });
    var byCat = {};
    Object.keys(keys).sort().forEach(function(k) { var x = keys[k]; (byCat[x.sub] = byCat[x.sub] || []).push(k); });
    if (mode === 'summary') {
      Object.keys(byCat).forEach(function(cat) { rows.push(['&nbsp;&nbsp;' + esc(cat)].concat(datas.map(function(d) { return M(sumF(d[s].filter(function(x) { return byCat[cat].indexOf(x.code + '|' + x.name) >= 0; }), function(x) { return x.v; })); }))); });
    } else {
      Object.keys(keys).sort().forEach(function(k) { var x = keys[k]; rows.push(['&nbsp;&nbsp;' + (x.code ? '<span class="num muted">' + esc(x.code) + '</span> ' : '') + esc(x.name)].concat(datas.map(function(d) { var y = d[s].find(function(z) { return z.code + '|' + z.name === k; }); return M(y ? y.v : 0); }))); });
    }
    totals[s] = datas.map(function(d) { return sumF(d[s], function(x) { return x.v; }); });
    rows.push(T(['รวม' + labels[s]].concat(totals[s].map(M))));
  });
  rows.push(T(['รวมหนี้สินและส่วนของเจ้าของ'].concat(totals.liability.map(function(v, i) { return M(v + totals.equity[i]); }))));
  var r = { cols: [['']].concat(ends.map(function(e) { return [e[0], 1]; })), rows: rows, asOf: true, note: 'คำนวณจากสมุดรายวัน รวมรายการลงบัญชีอัตโนมัติจากเอกสาร' };
  if (mode === 'detail') r = Object.assign(glReport(), { note: r.note });
  return r;
}
function glReport() {
  var lines = allLines().filter(function(l) { return inRange(l.date || '', repRange()); }), o = {};
  lines.forEach(function(l) { (o[l.code] = o[l.code] || []).push(l); });
  var rows = [];
  Object.keys(o).sort().forEach(function(code) {
    rows.push(G(code + ' ' + accName(code)));
    var run = 0;
    o[code].sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); }).forEach(function(l) { run += l.dr - l.cr; rows.push({ doc: l.d._id, c: [fmtDateNum(l.date), dn(l.d), esc(l.d.typeLabel + ' · ' + l.d.party + (l.memo ? ' · ' + l.memo : '')), l.dr ? M(l.dr) : '', l.cr ? M(l.cr) : '', M(run)] }); });
    rows.push(T(['รวม ' + code, '', '', M(sumF(o[code], function(l) { return l.dr; })), M(sumF(o[code], function(l) { return l.cr; })), M(run)]));
  });
  return { cols: [['วันที่'],['เลขที่'],['คำอธิบาย'],['เดบิต',1],['เครดิต',1],['ยอดสะสม',1]], rows: rows, note: 'รวมรายการลงบัญชีอัตโนมัติจากเอกสารขาย ซื้อ และการรับ/จ่ายชำระ' };
}
function tbReport(end) {
  var bal = balancesAt(end), tdr = 0, tcr = 0;
  var rows = Object.keys(bal).sort().map(function(code) { var n = bal[code].dr - bal[code].cr, dr = n > 0 ? n : 0, cr = n < 0 ? -n : 0; tdr += dr; tcr += cr; return ['<span class="num">' + esc(code) + '</span> ' + esc(accName(code)), dr ? M(dr) : '', cr ? M(cr) : '']; });
  if (rows.length) rows.push(T(['รวม', M(tdr), M(tcr)]));
  return { cols: [['บัญชี'],['เดบิต',1],['เครดิต',1]], rows: rows, asOf: true };
}
function timeDocs() { return DOCS().filter(function(d) { return d.group === 'team' && inRep(d); }); }
function empOf(d) { return d.type === 'weeklyTimesheet' ? d.party : (d.extra && d.extra.employee) || '(ไม่ระบุ)'; }
function timeTable(list, keyFn) {
  var o = byKey(list, keyFn), rows = [], grand = 0;
  sortedKeys(o).forEach(function(k) {
    rows.push(G(k));
    o[k].forEach(function(d) { rows.push(rowDoc(d, [fmtDateNum(d.date), esc(d.typeLabel), esc(empOf(d)), esc(d.type === 'weeklyTimesheet' ? (d.extra && d.extra.week) || '' : d.party), fmtNum(d.extra && d.extra.hours)])); });
    var s = sumF(o[k], function(d) { return Number(d.extra && d.extra.hours); }); grand += s;
    rows.push(T(['รวม ' + esc(k), '', '', '', fmtNum(s)]));
  });
  if (rows.length) rows.push(T(['รวมทั้งสิ้น', '', '', '', fmtNum(grand)]));
  return { cols: [['วันที่'],['ชนิด'],['พนักงาน'],['รายละเอียด'],['ชั่วโมง',1]], rows: rows };
}
function unsupported(msg, fallback) { var r = fallback(); r.note = msg; return r; }
function openDocs(type) { return STORE.documents.filter(function(d) { return d.type === type && docStatus(d) !== 'paid'; }); }

var RG = {
  revrec: function() { return Object.assign(stdDocTable(DOCS().filter(function(d) { return docFlow(d) === 'rev' && inRep(d); }), { party:'ลูกค้า', val: amt, amtLabel:'รายได้ที่รับรู้ (ไม่รวม VAT)' }), { note:'รับรู้รายได้ตามวันที่ในเอกสารขาย' }); },
  invStatus: function() {
    var rows = stockRows().map(function(r) { var st = r.stock <= 0 ? '<span class="status st-overdue">หมด</span>' : r.stock <= r.rp ? '<span class="status st-unpaid">เหลือน้อย</span>' : '<span class="status st-paid">ปกติ</span>'; return [esc(r.p.name), esc(r.p.sku || '-'), fmtNum(r.stock), fmtNum(r.rp), st]; });
    return { cols: [['สินค้า'],['SKU'],['คงเหลือ',1],['จุดสั่งซื้อ',1],['สถานะ']], rows: rows, noPeriod: true };
  },
  billApproval: function() { return stdDocTable(DOCS().filter(function(d) { return d.type === 'bill' && inRep(d); }), { party:'ผู้ขาย', extraCols:[['สถานะ']], extra: function(d) { return [statusPill(d)]; } }); },
  invApproval: function() { return stdDocTable(DOCS().filter(function(d) { return d.type === 'invoice' && inRep(d); }), { party:'ลูกค้า', extraCols:[['สถานะ']], extra: function(d) { return [statusPill(d)]; } }); },
  prodProfit: function() {
    var o = {};
    itemLines(['invoice']).forEach(function(l) { var p = STORE.products.find(function(x) { return x.name === l.it.name; }); var k = l.d.party + ' · ' + l.it.name; var b = o[k] = o[k] || { rev:0, cost:0 }; b.rev += l.v; b.cost += (Number(p && p.cost) || 0) * (Number(l.it.qty) || 0); });
    var keys = sortedKeys(o), tr = 0, tc = 0;
    var rows = keys.map(function(k) { tr += o[k].rev; tc += o[k].cost; var m = o[k].rev - o[k].cost; return [esc(k), M(o[k].rev), M(o[k].cost), M(m), o[k].rev ? Math.round(m / o[k].rev * 100) + '%' : '-']; });
    if (rows.length) rows.push(T(['รวม', M(tr), M(tc), M(tr - tc), tr ? Math.round((tr - tc) / tr * 100) + '%' : '-']));
    return { cols: [['ลูกค้า · ผลิตภัณฑ์'],['รายได้',1],['ต้นทุน',1],['กำไรขั้นต้น',1],['อัตรากำไร',1]], rows: rows, note:'ต้นทุนใช้ต้นทุนต่อหน่วยในข้อมูลสินค้า' };
  },
  plTag: function() { return unsupported('ระบบยังไม่มีแท็กกลุ่ม แสดงกำไรขาดทุนรวมแทน', function() { return plMulti([['รวม', repRange()]]); }); },
  plDetail: function() {
    var docs = DOCS().filter(function(d) { return docFlow(d) && inRep(d); });
    var r = groupedDocTable(docs, function(d) { return docFlow(d) === 'rev' ? 'รายได้ · ' + d.typeLabel : 'ค่าใช้จ่าย · ' + ((d.extra && d.extra.expCategory) || 'ไม่ระบุหมวด'); }, { extraCols:[['คู่ค้า']], extra: function(d) { return [esc(d.party)]; }, val: amt });
    r.rows = r.rows.filter(function(x) { return !(x.t && x.t[0] === 'รวมทั้งสิ้น'); });
    var pl = plTotals(docs); r.rows.push(T(['กำไร (ขาดทุน) สุทธิ', '', '', '', M(pl.profit)]));
    return r;
  },
  arSum: function() { return agingSummary(openDocs('invoice')); },
  arDetail: function() { return agingDetail(openDocs('invoice')); },
  collections: function() {
    var l = openDocs('invoice').filter(function(d) { return docStatus(d) === 'overdue'; });
    return Object.assign(groupedDocTable(l, function(d) { return d.party; }, { extraCols:[['ครบกำหนด'],['โทรศัพท์']], extra: function(d) { return [fmtDateNum(dueOf(d)), esc(contactOf(d.party).phone || '-')]; }, val: docBal, amtLabel:'ยอดค้าง' }), { asOf: true });
  },
  custBalSum: function() { return balanceSummary(openDocs('invoice')); },
  custBalDetail: function() { return balanceDetail(openDocs('invoice')); },
  invoiceList: function() { return stdDocTable(DOCS().filter(function(d) { return d.type === 'invoice' && inRep(d); }), { party:'ลูกค้า', extraCols:[['ครบกำหนด'],['สถานะ']], extra: function(d) { return [fmtDateNum(dueOf(d)), statusPill(d)]; } }); },
  invPay: function() { return groupedDocTable(DOCS().filter(function(d) { return (d.type === 'invoice' || d.type === 'payment' || d.type === 'receipt') && inRep(d); }), function(d) { return d.party; }, { extraCols:[['สถานะ']], extra: function(d) { return [d.type === 'invoice' ? statusPill(d) : 'รับชำระ']; }, val: function(d) { return d.type === 'invoice' ? d.total : -(d.total || 0); }, amtLabel:'จำนวน (+หนี้ / −รับชำระ)' }); },
  openInv: function() { return Object.assign(stdDocTable(openDocs('invoice'), { party:'ลูกค้า', extraCols:[['ครบกำหนด'],['สถานะ']], extra: function(d) { return [fmtDateNum(dueOf(d)), statusPill(d)]; }, val: docBal, amtLabel:'ยอดค้าง' }), { asOf: true }); },
  stmtList: function() { return stdDocTable(DOCS().filter(function(d) { return d.type === 'statement' && inRep(d); }), { party:'ลูกค้า', extraCols:[['รอบบัญชี']], extra: function(d) { return [esc(d.extra && d.extra.period || '-')]; } }); },
  terms: function() {
    var o = {};
    DOCS().forEach(function(d) { if ((d.type === 'invoice' || d.type === 'bill') && d.extra && d.extra.dueDate) { var k = 'Net ' + Math.max(0, daysBetween(d.date, d.extra.dueDate)); o[k] = (o[k] || 0) + 1; } });
    var rows = Object.keys(o).sort(function(a, b) { return parseInt(a.slice(4)) - parseInt(b.slice(4)); }).map(function(k) { return [k + ' (ชำระภายใน ' + k.slice(4) + ' วัน)', String(o[k])]; });
    return { cols: [['เงื่อนไขการชำระ'],['จำนวนเอกสาร',1]], rows: rows, noPeriod: true, note:'คำนวณจากวันครบกำหนดในใบแจ้งหนี้และบิล' };
  },
  unbilledCharges: function() {
    var inv = {}; DOCS().forEach(function(d) { if (d.type === 'invoice') inv[d.party] = 1; });
    var l = DOCS().filter(function(d) { return d.type === 'salesOrder' && d.status !== 'paid' && inRep(d); });
    return Object.assign(stdDocTable(l, { party:'ลูกค้า' }), { note:'ใบสั่งขายที่ยังเปิดอยู่ ถือเป็นค่าบริการที่ยังไม่ได้ออกใบแจ้งหนี้' });
  },
  unbilledTime: function() { return Object.assign(timeTable(timeDocs(), empOf), { note:'ชั่วโมงงานทั้งหมดในช่วงนี้ ระบบยังไม่ผูกชั่วโมงกับใบแจ้งหนี้' }); },
  invValDetail: function() {
    var rows = [];
    stockRows().forEach(function(r) {
      rows.push(G(r.p.name));
      var run = Number(r.p.openingQty) || 0, cost = Number(r.p.cost) || 0;
      rows.push(['ยอดยกมา', '', fmtNum(run), M(run * cost)]);
      DOCS().slice().sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); }).forEach(function(d) {
        var q = 0;
        if (d.type === 'inventoryAdjust' && d.party === r.p.name) q = Number(d.extra && d.extra.qtyChange) || 0;
        if ((d.type === 'invoice' || d.type === 'bill') && d.items) d.items.forEach(function(it) { if (it.name === r.p.name) q += (d.type === 'bill' ? 1 : -1) * (Number(it.qty) || 0); });
        if (!q) return; run += q;
        rows.push({ doc: d._id, c: [fmtDateNum(d.date) + ' ' + esc(d.typeLabel) + ' ' + dn(d), fmtNum(q), fmtNum(run), M(run * cost)] });
      });
      rows.push(T(['คงเหลือ ' + esc(r.p.name), '', fmtNum(r.stock), M(r.stock * cost)]));
    });
    return { cols: [['รายการ'],['เปลี่ยนแปลง',1],['คงเหลือ',1],['มูลค่า',1]], rows: rows, noPeriod: true };
  },
  invValSum: function() {
    var tv = 0;
    var rows = stockRows().map(function(r) { var c = Number(r.p.cost) || 0; tv += r.stock * c; return [esc(r.p.name), esc(r.p.sku || '-'), fmtNum(r.stock), M(c), M(r.stock * c)]; });
    if (rows.length) rows.push(T(['รวม', '', '', '', M(tv)]));
    return { cols: [['สินค้า'],['SKU'],['คงเหลือ',1],['ต้นทุน/หน่วย',1],['มูลค่า',1]], rows: rows, asOf: true };
  },
  openPODetail: function() { var r = itemsDetail(['purchaseOrder']); r.rows = r.rows.filter(function(x) { return !x.doc || findDoc(x.doc).status !== 'paid'; }); return r; },
  openPOList: function() { return stdDocTable(openDocs('purchaseOrder'), { party:'ซัพพลายเออร์', extraCols:[['วันที่รับของ'],['สถานะ']], extra: function(d) { return [fmtDateNum(d.extra && d.extra.deliveryDate), statusPill(d)]; } }); },
  countSheet: function() { return { cols: [['สินค้า'],['SKU'],['หน่วย'],['ในระบบ',1],['นับได้จริง']], rows: stockRows().map(function(r) { return [esc(r.p.name), esc(r.p.sku || '-'), esc(r.p.unit || ''), fmtNum(r.stock), '<span class="count-blank"></span>']; }), noPeriod: true, note:'บันทึกผลนับได้จากสินค้าคงคลัง → ภาพรวม → ใบงานตรวจนับสต็อก' }; },
  cfPay: function() { return stdDocTable(DOCS().filter(function(d) { return (d.type === 'payment' || d.type === 'receipt' || d.type === 'checkPayment' || d.type === 'expense') && inRep(d); }), { extraCols:[['วิธีชำระ']], extra: function(d) { return [esc(d.extra && d.extra.method || '-')]; }, val: function(d) { return d.group === 'customer' ? d.total : -(d.total || 0); }, amtLabel:'เงินเข้า (+) / ออก (−)' }); },
  salesCustType: function() { return groupedDocTable(flowDocs('rev'), function(d) { return d.party + ' · ' + d.typeLabel; }, { val: amt, amtLabel:'ยอดขาย (ไม่รวม VAT)' }); },
  custContacts: function() { return contactList('customer'); },
  incomeCust: function() {
    var o = {}; flowDocs('rev').forEach(function(d) { o[d.party] = (o[d.party] || 0) + amt(d); });
    var ex = {}; flowDocs('exp').forEach(function(d) { var c = d.extra && d.extra.client; if (c) ex[c] = (ex[c] || 0) + amt(d); });
    var rows = sortedKeys(o).map(function(k) { return [esc(k), M(o[k]), M(ex[k] || 0), M(o[k] - (ex[k] || 0))]; });
    return { cols: [['ลูกค้า'],['รายได้',1],['ค่าใช้จ่าย',1],['รายได้สุทธิ',1]], rows: rows };
  },
  custPhones: function() { return contactList('customer', true); },
  salesCustSum: function() { return summaryBy(flowDocs('rev'), function(d) { return d.party; }, amt, 'ลูกค้า'); },
  salesCustDetail: function() { return groupedDocTable(flowDocs('rev'), function(d) { return d.party; }, { val: amt, amtLabel:'ยอดขาย (ไม่รวม VAT)' }); },
  depositDetail: function() { return stdDocTable(DOCS().filter(function(d) { return d.type === 'bankDeposit' && inRep(d); }), { party:'บัญชีธนาคาร', extraCols:[['รับจาก']], extra: function(d) { return [esc(d.extra && d.extra.source || '-')]; } }); },
  estCust: function() { return groupedDocTable(DOCS().filter(function(d) { return d.type === 'estimate' && inRep(d); }), function(d) { return d.party; }, { extraCols:[['ยืนราคาถึง']], extra: function(d) { return [fmtDateNum(d.extra && d.extra.validUntil)]; } }); },
  prodList: function() { return { cols: [['ชื่อ'],['SKU'],['ประเภท'],['หน่วย'],['ราคาขาย',1],['ต้นทุน',1]], rows: STORE.products.map(function(p) { return [esc(p.name), esc(p.sku || '-'), p.kind === 'service' ? 'บริการ' : 'สินค้า', esc(p.unit || ''), p.price != null ? M(p.price) : '-', p.cost != null ? M(p.cost) : '-']; }), noPeriod: true }; },
  salesProdSum: function() { return itemsSummary(['invoice'], 'ผลิตภัณฑ์/บริการ'); },
  salesProdDetail: function() { return itemsDetail(['invoice']); },
  payMethods: function() {
    var o = {}; DOCS().forEach(function(d) { var m = d.extra && d.extra.method; if (m && inRep(d)) { var b = o[m] = o[m] || { n:0, v:0 }; b.n++; b.v += d.total || 0; } });
    PAYMENT_METHODS.forEach(function(m) { o[m] = o[m] || { n:0, v:0 }; });
    return { cols: [['วิธีชำระเงิน'],['จำนวนธุรกรรม',1],['ยอดรวม',1]], rows: Object.keys(o).map(function(k) { return [esc(k), String(o[k].n), M(o[k].v)]; }) };
  },
  timeCust: function() { return timeTable(timeDocs(), function(d) { var p = STORE.documents.find(function(x) { return x.type === 'project' && x.extra && x.extra.manager === empOf(d); }); return p ? (p.extra.client || p.party) : '(ไม่ระบุลูกค้า)'; }); },
  txCust: function() { return groupedDocTable(DOCS().filter(function(d) { return d.group === 'customer' && inRep(d); }), function(d) { return d.party; }, { extraCols:[['สถานะ']], extra: function(d) { return [statusPill(d)]; } }); },
  txTag: function() { return unsupported('ระบบยังไม่มีแท็ก แสดงรายการธุรกรรมตามวันที่แทน', function() { return RG.txDate(); }); },
  apSum: function() { return agingSummary(openDocs('bill')); },
  apDetail: function() { return agingDetail(openDocs('bill')); },
  billsPay: function() { return groupedDocTable(DOCS().filter(function(d) { return (d.type === 'bill' || d.type === 'checkPayment') && inRep(d); }), function(d) { return d.party; }, { extraCols:[['สถานะ']], extra: function(d) { return [statusPill(d)]; } }); },
  invPayList: function() {
    var rows = [], tot = 0;
    DOCS().forEach(function(d) { (d.payments || []).forEach(function(p) { if (!inRange(p.date || '', repRange())) return; tot += p.amount; rows.push({ doc: d._id, c: [fmtDateNum(p.date), dn(d), esc(d.party), esc(p.method), esc([p.bankAcc, p.ref].filter(Boolean).join(' · ') || '-'), p.wht ? M(p.wht) : '', M(p.amount)] }); }); });
    if (rows.length) { rows.sort(function(a, b) { return a.c[0].split('/').reverse().join('').localeCompare(b.c[0].split('/').reverse().join('')); }); rows.push(T(['รวม', '', '', '', '', '', M(tot)])); return { cols: [['วันที่ชำระ'],['เอกสาร'],['คู่ค้า'],['วิธี'],['บัญชี/อ้างอิง'],['หัก ณ ที่จ่าย',1],['จำนวนเงิน',1]], rows: rows }; }
    return RG.invPayList0();
  },
  invPayList0: function() { return stdDocTable(DOCS().filter(function(d) { return (d.type === 'payment' || (d.type === 'invoice' && d.status === 'paid')) && inRep(d); }), { party:'ลูกค้า', extraCols:[['วันที่ชำระ'],['วิธีชำระ']], extra: function(d) { return [fmtDateNum(d.paidDate || d.date), esc(d.extra && (d.extra.method || d.extra.refDoc) || '-')]; } }); },
  unpaidBills: function() { return Object.assign(stdDocTable(openDocs('bill'), { party:'ผู้ขาย', extraCols:[['ครบกำหนด'],['สถานะ']], extra: function(d) { return [fmtDateNum(dueOf(d)), statusPill(d)]; }, val: docBal, amtLabel:'ยอดค้างจ่าย' }), { asOf: true }); },
  supBalSum: function() { return balanceSummary(openDocs('bill')); },
  supBalDetail: function() { return balanceDetail(openDocs('bill')); },
  checkDetail: function() { return stdDocTable(DOCS().filter(function(d) { return d.type === 'checkPayment' && inRep(d); }), { party:'ผู้รับเงิน', extraCols:[['เลขที่เช็ค']], extra: function(d) { return ['<span class="num">' + esc(d.extra && d.extra.checkNo || '-') + '</span>']; } }); },
  purchProd: function() { return itemsDetail(['bill','purchaseOrder']); },
  purchList: function() { return stdDocTable(DOCS().filter(function(d) { return d.group === 'supplier' && d.type !== 'addSupplier' && inRep(d); }), { party:'ซัพพลายเออร์', extraCols:[['หมวดหมู่']], extra: function(d) { return [esc(d.extra && d.extra.expCategory || '-')]; } }); },
  txSup: function() { return groupedDocTable(DOCS().filter(function(d) { return d.group === 'supplier' && inRep(d); }), function(d) { return d.party; }, { extraCols:[['สถานะ']], extra: function(d) { return [statusPill(d)]; } }); },
  purchSup: function() { return groupedDocTable(DOCS().filter(function(d) { return (d.type === 'bill' || d.type === 'purchaseOrder' || d.type === 'expense' || d.type === 'checkPayment') && inRep(d); }), function(d) { return d.party; }, { extraCols:[['หมวดหมู่']], extra: function(d) { return [esc(d.extra && d.extra.expCategory || '-')]; } }); },
  supContacts: function() { return contactList('supplier'); },
  expSup: function() { return summaryBy(flowDocs('exp'), function(d) { return d.party; }, amt, 'ซัพพลายเออร์'); },
  supPhones: function() { return contactList('supplier', true); },
  taxLiab: function() {
    var r = repRange(), ps = taxPeriods().filter(function(ym) { return ym + '-01' >= r[0].slice(0,7) + '-01' && ym + '-01' <= r[1]; });
    var t = [0,0,0,0];
    var rows = ps.map(function(ym) { var v = vatSummary(ym); t[0] += v.out; t[1] += v.inp; t[2] += v.due; t[3] += v.bal; return [monthLabel(ym, true), M(v.out), M(v.inp), M(v.due), M(v.paid), M(v.bal)]; });
    if (rows.length) rows.push(T(['รวม', M(t[0]), M(t[1]), M(t[2]), '', M(t[3])]));
    return { cols: [['งวดภาษี'],['ภาษีขาย',1],['ภาษีซื้อ',1],['ต้องชำระ',1],['ชำระแล้ว',1],['คงค้าง',1]], rows: rows };
  },
  empContacts: function() { return { cols: [['ชื่อ'],['ตำแหน่ง'],['โทรศัพท์'],['อีเมล'],['เริ่มงาน']], rows: STORE.employees.map(function(e) { return [esc(e.name), esc(e.position || '-'), esc(e.phone || '-'), esc(e.email || '-'), fmtDateNum(e.startDate)]; }), noPeriod: true }; },
  accList: function() { var bal = balancesAt('9999-12-31'); return { cols: [['รหัส'],['ชื่อบัญชี'],['ประเภทบัญชี'],['ประเภทรายละเอียด'],['ยอดคงเหลือ',1]], rows: STORE.accounts.slice().sort(function(a, b) { return String(a.code).localeCompare(String(b.code)); }).map(function(a) { var b = bal[a.code] || { dr:0, cr:0 }, base = subtypeBase(accSubtype(a)); return ['<span class="num">' + esc(a.code) + '</span>', esc(a.name), esc(subtypeLabel(accSubtype(a))), esc(a.detailType || ''), isPL(a) ? '' : M(base === 'asset' ? b.dr - b.cr : b.cr - b.dr)]; }), noPeriod: true }; },
  bs: function() { return bsReport([['ณ ' + fmtDateNum(repRange()[1] === '9999-12-31' ? todayStr() : repRange()[1]), repRange()[1]]]); },
  bsCompare: function() { var e = repRange()[1] === '9999-12-31' ? todayStr() : repRange()[1], p = shiftYear([e], -1)[0]; return bsReport([['ณ ' + fmtDateNum(e), e], ['ณ ' + fmtDateNum(p), p]]); },
  bsDetail: function() { return bsReport([['', repRange()[1]]], 'detail'); },
  bsSum: function() { return bsReport([['ณ ' + fmtDateNum(repRange()[1] === '9999-12-31' ? todayStr() : repRange()[1]), repRange()[1]]], 'summary'); },
  cashflow: function() {
    var ins = DOCS().filter(function(d) { return inRep(d) && (d.type === 'receipt' || d.type === 'payment' || (d.type === 'invoice' && d.status === 'paid')); });
    var outs = DOCS().filter(function(d) { return inRep(d) && (d.type === 'expense' || d.type === 'checkPayment' || (d.type === 'bill' && d.status === 'paid')); });
    var i = sumF(ins, docNet), o = sumF(outs, docNet);
    return { cols: [[''],['จำนวนเงิน',1]], rows: [G('กิจกรรมดำเนินงาน'), ['&nbsp;&nbsp;เงินรับจากลูกค้า (' + ins.length + ' รายการ)', M(i)], ['&nbsp;&nbsp;เงินจ่ายค่าใช้จ่ายและบิล (' + outs.length + ' รายการ)', M(-o)], T(['เงินสดสุทธิจากกิจกรรมดำเนินงาน', M(i - o)])], note:'วิธีทางตรงอย่างง่าย: นับใบเสร็จ การรับชำระ ใบแจ้งหนี้ที่ชำระแล้ว เทียบกับค่าใช้จ่าย เช็คจ่าย และบิลที่ชำระแล้ว' };
  },
  badJournal: function() {
    var codes = {}; STORE.accounts.forEach(function(a) { codes[a.code] = 1; });
    var rows = [];
    DOCS().forEach(function(d) {
      if (d.type !== 'journalEntry' || !inRep(d)) return;
      var dr = sumF(d.items || [], function(r) { return Number(r.debit); }), cr = sumF(d.items || [], function(r) { return Number(r.credit); }), probs = [];
      if (dr !== cr) probs.push('เดบิตไม่เท่าเครดิต');
      (d.items || []).forEach(function(r) { var c = String(r.account || '').split(' ')[0]; if (!codes[c]) probs.push('ไม่พบบัญชี ' + c); });
      if (probs.length) rows.push(rowDoc(d, [fmtDateNum(d.date), dn(d), esc(d.party), esc(probs.join(', '))]));
    });
    return { cols: [['วันที่'],['เลขที่'],['คำอธิบาย'],['ปัญหา']], rows: rows, emptyMsg:'ไม่พบรายการที่ผิดพลาด' };
  },
  gl: function() { return glReport(); },
  glList: function() { return RG.accList(); },
  journal: function() {
    var rows = [], by = {};
    allLines().filter(function(l) { return inRange(l.date || '', repRange()); }).forEach(function(l) { var k = l.date + '|' + l.d._id + '|' + (l.memo && /ชำระ/.test(l.memo) ? 'p' : ''); (by[k] = by[k] || []).push(l); });
    Object.keys(by).sort().forEach(function(k) {
      var g = by[k], d = g[0].d;
      rows.push(G(fmtDateNum(g[0].date) + ' · ' + (d.docNo || '') + ' · ' + d.typeLabel + ' · ' + d.party));
      g.forEach(function(l) { rows.push({ doc: d._id, c: ['<span class="num">' + esc(l.code) + '</span> ' + esc(acctName(l.code)) + (l.memo ? ' <span class="small muted">' + esc(l.memo) + '</span>' : ''), l.dr ? M(l.dr) : '', l.cr ? M(l.cr) : ''] }); });
    });
    var td = 0, tc = 0; Object.keys(by).forEach(function(k) { by[k].forEach(function(l) { td += l.dr; tc += l.cr; }); });
    if (rows.length) rows.push(T(['รวม', M(td), M(tc)]));
    return { cols: [['บัญชี'],['เดบิต',1],['เครดิต',1]], rows: rows };
  },
  pl: function() { return plMulti([['ยอดรวม', repRange()]]); },
  incExpMonthly: function() {
    var r = repRange(), end = r[1] === '9999-12-31' ? todayStr() : r[1], start = r[0];
    if (pageState.repPeriod !== 'custom') end = monthEnd(end.slice(0, 7)); // include payments dated later this month
    if (start === '0000-01-01') { var ds = DOCS().map(function(d) { return d.date || ''; }).filter(Boolean).sort(); start = ds[0] || end; }
    var ym = start.slice(0, 7), last = end.slice(0, 7), periods = [];
    if (addMonths(last, -23) > ym) ym = addMonths(last, -23);
    while (ym <= last) { var mn = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][Number(ym.slice(5, 7)) - 1] + ' ' + String(Number(ym.slice(0, 4)) + 543).slice(2); periods.push([mn, [ym + '-01' < start ? start : ym + '-01', monthEnd(ym) > end ? end : monthEnd(ym)]]); ym = addMonths(ym, 1); }
    periods.push(['รวม', [start, end]]);
    var parts = periods.map(function(pp) { var t = plRows(DOCS().filter(function(d) { return (d.date || '') >= pp[1][0] && (d.date || '') <= pp[1][1]; })); return t; });
    // use ledger line dates (payments / fees) for accuracy
    var flows = cashFlowLines();
    parts = periods.map(function(pp) { var rev = {}, exp = {}; flows.forEach(function(f) { if (f.date < pp[1][0] || f.date > pp[1][1]) return; if (f.amt > 0) rev[f.cat] = (rev[f.cat] || 0) + f.amt; else exp[f.cat] = (exp[f.cat] || 0) - f.amt; }); return { rev: rev, exp: exp }; });
    var revK = {}, expK = {}; parts.forEach(function(x) { Object.keys(x.rev).forEach(function(k) { revK[k] = 1; }); Object.keys(x.exp).forEach(function(k) { expK[k] = 1; }); });
    var rows = [G('รายรับ')];
    Object.keys(revK).sort().forEach(function(k) { rows.push(['&nbsp;&nbsp;' + esc(k)].concat(parts.map(function(x) { return M(x.rev[k] || 0); }))); });
    var tr = parts.map(function(x) { return sumF(Object.keys(x.rev), function(k) { return x.rev[k]; }); });
    rows.push(T(['รวมรายรับ'].concat(tr.map(M))));
    rows.push(G('รายจ่าย'));
    Object.keys(expK).sort().forEach(function(k) { rows.push(['&nbsp;&nbsp;' + esc(k)].concat(parts.map(function(x) { return M(x.exp[k] || 0); }))); });
    var te = parts.map(function(x) { return sumF(Object.keys(x.exp), function(k) { return x.exp[k]; }); });
    rows.push(T(['รวมรายจ่าย'].concat(te.map(M))));
    rows.push(T(['รายรับสูง (ต่ำ) กว่ารายจ่าย'].concat(tr.map(function(v, i) { return M(v - te[i]); }))));
    var cum = 0; rows.push(['&nbsp;&nbsp;สะสม'].concat(tr.slice(0, -1).map(function(v, i) { cum += v - te[i]; return M(cum); })).concat([M(cum)]));
    return { cols: [['บัญชี']].concat(periods.map(function(pp) { return [pp[0], 1]; })), rows: rows, note: 'เกณฑ์เงินสด: รายรับ = เงินที่รับเข้าจริง, รายจ่าย = เงินที่จ่ายออกจริง (รวม VAT) ตามวันที่รับ/จ่ายเงิน จัดกลุ่มตามบัญชีของเอกสาร ไม่รวมการโอนระหว่างบัญชี แสดงสูงสุด 24 เดือน' };
  },
  plCust: function() {
    var custs = {}; DOCS().forEach(function(d) { if (docFlow(d) === 'rev' && inRep(d)) custs[d.party] = 1; });
    var keys = sortedKeys(custs), rows = [], tot = 0;
    keys.forEach(function(k) { var v = sumF(flowDocs('rev').filter(function(d) { return d.party === k; }), amt); tot += v; rows.push([esc(k), M(v)]); });
    var exp = sumF(flowDocs('exp'), amt);
    rows.push(T(['รวมรายได้', M(tot)])); rows.push(['ค่าใช้จ่ายที่ไม่ได้แยกลูกค้า', M(exp)]); rows.push(T(['กำไร (ขาดทุน) สุทธิ', M(tot - exp)]));
    return { cols: [['ลูกค้า'],['จำนวนเงิน',1]], rows: rows };
  },
  plMonth: function() {
    var r = repRange(), start = r[0] === '0000-01-01' ? last12Months()[0] : r[0].slice(0,7), end = (r[1] === '9999-12-31' ? todayStr() : r[1]).slice(0,7), ps = [];
    for (var m = start; m <= end && ps.length < 24; m = addMonths(m, 1)) ps.push([monthLabel(m), [m + '-01', monthEnd(m)]]);
    return Object.assign(plMulti(ps), { noPeriod: false });
  },
  plCompare: function() { var r = repRange(); return Object.assign(plMulti([['ช่วงนี้', r], ['ปีก่อน', shiftYear(r, -1)]]), { noPeriod: false }); },
  plPct: function() {
    var p = plRows(DOCS().filter(inRep)), rev = sumF(Object.keys(p.rev), function(k) { return p.rev[k]; }), exp = sumF(Object.keys(p.exp), function(k) { return p.exp[k]; });
    var pct = function(v) { return rev ? (Math.round(v / rev * 1000) / 10) + '%' : '-'; };
    var rows = [G('รายได้')].concat(Object.keys(p.rev).map(function(k) { return ['&nbsp;&nbsp;' + esc(k), M(p.rev[k]), pct(p.rev[k])]; })).concat([T(['รวมรายได้', M(rev), pct(rev)]), G('ค่าใช้จ่าย')])
      .concat(Object.keys(p.exp).map(function(k) { return ['&nbsp;&nbsp;' + esc(k), M(p.exp[k]), pct(p.exp[k])]; })).concat([T(['รวมค่าใช้จ่าย', M(exp), pct(exp)]), T(['กำไร (ขาดทุน) สุทธิ', M(rev - exp), pct(rev - exp)])]);
    return { cols: [[''],['จำนวนเงิน',1],['% ของรายได้',1]], rows: rows };
  },
  plYtd: function() { var y = todayStr().slice(0,4), t = todayStr(); return plMulti([['ต้นปีถึงวันนี้ ' + y, [y + '-01-01', t]], ['ช่วงเดียวกันปี ' + (y - 1), [(y - 1) + '-01-01', (y - 1) + t.slice(4)]]]); },
  plQuarter: function() { var y = todayStr().slice(0,4); return plMulti([['ไตรมาส 1', [y + '-01-01', y + '-03-31']], ['ไตรมาส 2', [y + '-04-01', y + '-06-30']], ['ไตรมาส 3', [y + '-07-01', y + '-09-30']], ['ไตรมาส 4', [y + '-10-01', y + '-12-31']], ['รวมปี ' + y, [y + '-01-01', y + '-12-31']]]); },
  recentTx: function() { var l = DOCS().slice().sort(function(a, b) { return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0); }).slice(0, 30); return Object.assign(stdDocTable(l, { extraCols:[['แก้ไขล่าสุด']], extra: function(d) { var t = d.updatedAt || d.createdAt; return [t ? new Date(t).toLocaleString('th-TH', { dateStyle:'short', timeStyle:'short' }) : '-']; } }), { noPeriod: true, note:'30 รายการที่สร้างหรือแก้ไขล่าสุด' }); },
  tb: function() { return tbReport(repRange()[1]); },
  tbAdj: function() { return Object.assign(tbReport(repRange()[1]), { note:'รวมรายการปรับปรุงทั้งหมดในสมุดรายวันทั่วไป' }); },
  txAcc: function() { return glReport(); },
  txDate: function() { return stdDocTable(DOCS().filter(inRep).slice().sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); }), { extraCols:[['สถานะ']], extra: function(d) { return [statusPill(d)]; } }); },
  txSplit: function() {
    var rows = [];
    DOCS().filter(inRep).slice().sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); }).forEach(function(d) {
      rows.push({ doc: d._id, c: [fmtDateNum(d.date), esc(d.typeLabel), dn(d), esc(d.party), '<b>' + M(d.total) + '</b>'] });
      (d.items || []).forEach(function(it) { rows.push({ sub: true, c: ['', '', '', '↳ ' + esc(it.name || ((it.account || '') + ' ' + (it.accountName || ''))), it.name ? fmtNum(it.qty) + ' × ' + M(it.price) : (it.debit ? 'Dr ' + M(it.debit) : 'Cr ' + M(it.credit))] }); });
    });
    return { cols: [['วันที่'],['ชนิด'],['เลขที่'],['คู่ค้า / รายการ'],['จำนวนเงิน',1]], rows: rows };
  },
  timeRecent: function() { var l = DOCS().filter(function(d) { return d.group === 'team'; }).sort(function(a, b) { return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0); }).slice(0, 30); return Object.assign(timeTable(l, function() { return 'ล่าสุด'; }), { noPeriod: true }); },
  timeEmp: function() { return timeTable(timeDocs(), empOf); },
  tsEmp: function() { return timeTable(timeDocs().filter(function(d) { return d.type === 'weeklyTimesheet'; }), empOf); },
  timePayType: function() {
    var TYPE = { full:'พนักงานประจำ', part:'พาร์ทไทม์', contract:'ฟรีแลนซ์/สัญญาจ้าง' }, o = {};
    timeDocs().forEach(function(d) { var e = STORE.employees.find(function(x) { return x.name === empOf(d); }); var k = e ? TYPE[e.empType] || '-' : '(ไม่อยู่ในรายชื่อพนักงาน)'; o[k] = (o[k] || 0) + (Number(d.extra && d.extra.hours) || 0); });
    var t = 0, rows = Object.keys(o).map(function(k) { t += o[k]; return [esc(k), fmtNum(o[k])]; });
    if (rows.length) rows.push(T(['รวม', fmtNum(t)]));
    return { cols: [['ประเภทการจ้าง'],['ชั่วโมง',1]], rows: rows };
  }
};

var lastReport = null;
function reportViewShell() {
  var id = pageState.repId, fav = favList().indexOf(id) >= 0;
  var opts = [['month','เดือนนี้'],['quarter','ไตรมาสนี้'],['year','ปีนี้'],['last12','12 เดือนล่าสุด'],['all','ทั้งหมด'],['custom','กำหนดวันที่เอง']];
  return '<div class="coa-bar"><button type="button" class="back-link" onclick="go(\'reports\',\'standard\')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg>กลับไปยังรายงานมาตรฐาน</button>' +
    '<div class="coa-actions"><button type="button" class="btn btn-outline" id="repFav">' + (fav ? '★ อยู่ในรายการโปรด' : '☆ เพิ่มในรายการโปรด') + '</button><button type="button" class="btn btn-dark" id="repExport">ส่งออก</button></div></div>' +
    '<div class="coa-filters" id="repFilters"><label class="date-chip">ช่วงรายงาน: <select id="repPeriod" aria-label="ช่วงรายงาน">' + opts.map(function(o) { return '<option value="' + o[0] + '"' + (pageState.repPeriod === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' + customRangeHTML(pageState.repPeriod) + '</div>';
}
function reportViewData() {
  var id = pageState.repId, gen = RG[id];
  if (!gen) return '<p class="empty-hint">ไม่พบรายงานนี้</p>';
  var r; try { r = gen(); } catch (e) { r = { cols: [['']], rows: [], note: 'สร้างรายงานไม่สำเร็จ: ' + e.message }; }
  lastReport = r;
  var f = byId('repFilters'); if (f) f.style.display = r.noPeriod ? 'none' : '';
  var range = repRange(), end = range[1] === '9999-12-31' ? todayStr() : range[1];
  var sub = r.noPeriod ? 'ข้อมูล ณ ' + fmtDate(todayStr()) : r.asOf ? 'ณ วันที่ ' + fmtDate(end) : (range[0] === '0000-01-01' ? 'ทุกช่วงเวลา' : fmtDate(range[0]) + ' – ' + fmtDate(end));
  var n = r.cols.length;
  var body = r.rows.map(function(x) {
    if (x.g) return '<tr class="group-row"><td colspan="' + n + '">' + esc(x.g) + '</td></tr>';
    var cells = x.t || x.c || x, cls = x.t ? ' class="rep-total"' : x.doc ? ' class="row-link" tabindex="0" data-doc="' + esc(x.doc) + '"' : x.sub ? ' class="rep-sub"' : '';
    return '<tr' + cls + '>' + cells.map(function(c, i) { return '<td' + (r.cols[i] && r.cols[i][1] ? ' class="r"' : '') + '>' + c + '</td>'; }).join('') + '</tr>';
  }).join('');
  return '<div class="rep-paper"><div class="rep-title"><div class="rep-co">' + esc(companyName()) + '</div><h1>' + esc(REPORT_NAME[id]) + '</h1><div class="small muted">' + sub + '</div></div>' +
    (r.note ? '<div class="banner info">' + esc(r.note) + '</div>' : '') +
    '<div class="items-wrap"><table class="data-table rep-table"><thead><tr>' + r.cols.map(function(c) { return '<th' + (c[1] ? ' class="r"' : '') + '>' + esc(c[0]) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    (body || '<tr><td colspan="' + n + '" class="empty-hint">' + (r.emptyMsg || 'ไม่มีข้อมูลในช่วงนี้') + '</td></tr>') + '</tbody></table></div>' +
    '<p class="small muted" style="margin-top:12px">สร้างเมื่อ ' + new Date().toLocaleString('th-TH') + '</p></div>';
}
function bindReportView() {
  var p = byId('repPeriod');
  if (p && !p._b) { p._b = 1; p.addEventListener('change', function() { pageState.repPeriod = p.value; refreshPageData(); }); }
  var fb = byId('repFav');
  if (fb && !fb._b) { fb._b = 1; fb.addEventListener('click', function() { var f = favList(), i = f.indexOf(pageState.repId); if (i >= 0) f.splice(i, 1); else f.push(pageState.repId); setFav(f); fb.textContent = i >= 0 ? '☆ เพิ่มในรายการโปรด' : '★ อยู่ในรายการโปรด'; }); }
  var ex = byId('repExport');
  if (ex && !ex._b) { ex._b = 1; ex.addEventListener('click', exportReport); }
}
function strip2(h) { var d = document.createElement('div'); d.innerHTML = String(h); return d.textContent.replace(/ /g, ' ').trim(); }
async function exportReport() {
  var r = lastReport; if (!r) return;
  var rows = [r.cols.map(function(c) { return c[0]; })].concat(r.rows.map(function(x) { return x.g ? [x.g] : (x.t || x.c || x).map(strip2); }));
  var dl = await getDownloads();
  var name = REPORT_NAME[pageState.repId] + '-' + todayStr();
  if (!dl) {
    openModal({ title:'ส่งออกรายงาน', focus:false, body:'<div class="banner info">หน้านี้บันทึกไฟล์ลงเครื่องไม่ได้ในมุมมองนี้ คัดลอกข้อมูลด้านล่างไปวางใน Excel แทนได้</div><textarea class="imp-text" rows="10" readonly id="repCopy">' + esc(rows.map(function(r) { return r.join('\t'); }).join('\n')) + '</textarea>',
      buttons:[{ label:'ปิด', onClick: closeModal }, { label:'คัดลอก', cls:'btn-dark', onClick: function() { var t = byId('repCopy'); navigator.clipboard.writeText(t.value).then(function() { showToast('คัดลอกแล้ว'); }, function() { t.select(); showToast('กด Ctrl/Cmd+C เพื่อคัดลอก'); }); } }] });
    return;
  }
  try {
    await loadXlsxLib();
    var ws = XLSX.utils.aoa_to_sheet([[companyName()], [REPORT_NAME[pageState.repId]], []].concat(rows));
    var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'รายงาน');
    await dl.save({ filename: name + '.xlsx', data: new Uint8Array(XLSX.write(wb, { bookType:'xlsx', type:'array' })) });
    showToast('ส่งออกรายงานแล้ว');
  } catch (e) {
    if (e && e.code === 'declined') return;
    try { await dl.save({ filename: name + '.csv', data: toCsv(rows) }); showToast('ส่งออกเป็น CSV แล้ว'); } catch (e2) { showToast('ส่งออกไม่สำเร็จ ลองอีกครั้ง'); }
  }
}

/* ---- Other report sub-pages ---- */
function reportsPlaceholder(title, desc, cta) {
  return '<h1 class="section-title">' + title + '</h1><div class="empty-state"><div class="empty-state-text"><h3>' + title + '</h3><p>' + desc + '</p>' + (cta || '') + '</div><div class="empty-state-illo">' + EMPTY_STATE_SVG + '</div></div>';
}
function cashOverviewShell() { return '<h1 class="section-title" style="margin-bottom:18px">ภาพรวมกระแสเงินสด</h1>'; }
function cashOverviewData() {
  var months = last12Months(), ins = [], outs = [];
  var series = months.map(function(m) {
    var i = sumF(DOCS().filter(function(d) { return (d.date || '').slice(0,7) === m && (d.type === 'receipt' || d.type === 'payment' || d.type === 'bankDeposit'); }), docNet);
    var o = sumF(DOCS().filter(function(d) { return (d.date || '').slice(0,7) === m && (d.type === 'expense' || d.type === 'checkPayment' || (d.type === 'bill' && d.status === 'paid')); }), docNet);
    return { rev: i, exp: o, profit: round2(i - o) };
  });
  var ti = sumF(series, function(s) { return s.rev; }), to = sumF(series, function(s) { return s.exp; });
  var ar = sumNet(openItems('invoice')), ap = sumNet(openItems('bill'));
  var h = '<div class="kpi-row">' + kpi('เงินเข้า 12 เดือน', fmtMoney(ti, 0)) + kpi('เงินออก 12 เดือน', fmtMoney(to, 0)) + kpi('กระแสเงินสดสุทธิ', fmtMoney(ti - to, 0), '', ti - to < 0 ? 'neg' : '') + kpi('รอรับ − รอจ่าย', fmtMoney(ar - ap, 0), 'ลูกหนี้ ' + fmtMoney(ar, 0) + ' · เจ้าหนี้ ' + fmtMoney(ap, 0)) + '</div>';
  h += '<div class="page-block"><h2>เงินเข้าและเงินออกรายเดือน</h2><p class="hint">แท่งสีน้ำเงิน = เงินเข้า (ใบเสร็จ รับชำระ ฝากเงิน) · แท่งสีส้ม = เงินออก (ค่าใช้จ่าย เช็ค บิลที่ชำระแล้ว)</p>' + barChart(months, series) + '</div>';
  return h;
}
