/* ---- Purchase orders page ---- */
pageState.poSup = ''; pageState.poPeriod = 'year';
function poShell() {
  var sups = {}; STORE.documents.forEach(function(d) { if (d.type === 'purchaseOrder' && d.party) sups[d.party] = 1; });
  STORE.contacts.forEach(function(c) { if (c.kind === 'supplier') sups[c.name] = 1; });
  return '<div class="tx-head"><h1 class="section-title">ใบสั่งซื้อ</h1><div class="coa-actions"><button class="btn btn-dark" type="button" data-open="purchaseOrder">เพิ่มใบสั่งซื้อ</button></div></div>' +
    '<div class="iv-filters"><div class="field"><span class="iv-lbl">ซัพพลายเออร์</span><select class="coa-select" data-state="page.poSup"><option value="">ทั้งหมด</option>' + Object.keys(sups).sort().map(function(n) { return '<option' + (pageState.poSup === n ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><span class="iv-lbl">วันที่ใบสั่งซื้อ</span><select class="coa-select" data-state="page.poPeriod">' + [['month','เดือนนี้'],['quarter','ไตรมาสนี้'],['year','ปีนี้'],['last12','12 เดือนที่ผ่านมา'],['all','ทั้งหมด']].map(function(o) { return '<option value="' + o[0] + '"' + (pageState.poPeriod === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div><div id="poChips"></div>';
}
function poData() {
  var r = periodRange(pageState.poPeriod); if (pageState.poPeriod === 'year') r = [r[0], r[0].slice(0,4) + '-12-31'];
  var list = STORE.documents.filter(function(d) { return d.type === 'purchaseOrder' && (!pageState.poSup || d.party === pageState.poSup) && inRange(d.date || '', r); })
    .sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });
  var chips = '';
  if (pageState.poPeriod !== 'all') chips += '<span class="po-chip">วันที่ใบสั่งซื้อ: ' + fmtDateNum(r[0]) + '-' + fmtDateNum(r[1]) + ' <button type="button" onclick="pageState.poPeriod=\'all\';renderPage()" aria-label="ล้าง">✕</button></span>';
  if (pageState.poSup) chips += '<span class="po-chip">ซัพพลายเออร์: ' + esc(pageState.poSup) + ' <button type="button" onclick="pageState.poSup=\'\';renderPage()" aria-label="ล้าง">✕</button></span>';
  var dimName = function(k, id) { if (!id || typeof dimList !== 'function') return ''; var x = dimList(k).find(function(v) { return String(v.id) === String(id); }); return x ? x.name : ''; };
  var rows = list.map(function(d) {
    var ex = d.extra || {}, open = docStatus(d) !== 'paid';
    var grp = [dimName('departments', ex.dept), dimName('projects', ex.project)].filter(Boolean).join(' / ');
    var loc = ex.branch && typeof branchOf === 'function' && branches().length ? branchLabel(branchOf(ex.branch)) : '';
    return '<tr><td><a href="#" class="po-link" data-doc="' + esc(d._id) + '" onclick="event.preventDefault()">' + esc(d.party || '-') + '</a></td><td class="num">' + esc(d.docNo || '') + '</td><td class="num">' + fmtDateNum(d.date) + '</td>' +
      '<td>' + esc(ex.expCategory || accName(ex.account) || 'การซื้อ') + '</td><td>' + esc(grp) + '</td><td>' + esc(loc) + '</td><td class="muted">' + esc(ex.note || '') + '</td>' +
      '<td class="r">' + fmtMoney(d.subtotal != null ? d.subtotal : d.total || 0) + '</td><td class="r">' + fmtMoney(d.vat || 0) + '</td><td class="r">' + fmtMoney(d.total || 0) + '</td>' +
      '<td><span class="status ' + (open ? 'st-unpaid">เปิด' : 'st-paid">ปิดแล้ว') + '</span></td>' +
      '<td class="r iv-act"><a href="#" data-doc="' + esc(d._id) + '" onclick="event.preventDefault()">ดู/แก้ไข</a><details class="iv-dd"><summary>▾</summary><div class="iv-menu">' +
        '<button type="button" onclick="this.closest(\'details\').open=false;convertDoc(findDoc(\'' + d._id + '\'),\'bill\')">แปลงเป็นบิลซื้อ</button>' +
        '<button type="button" onclick="this.closest(\'details\').open=false;openPrintViewer(findDoc(\'' + d._id + '\'))">พิมพ์</button>' +
        (open ? '<button type="button" onclick="this.closest(\'details\').open=false;poClose(\'' + d._id + '\')">ปิดใบสั่งซื้อ</button>' : '') +
      '</div></details></td></tr>';
  }).join('');
  var n = list.length;
  return (chips ? '<div class="po-chips">' + chips + '</div>' : '') + tableOrEmpty('<th>ซัพพลายเออร์</th><th>หมายเลขใบสั่งซื้อ</th><th>วันที่สั่งซื้อ ↑</th><th>หมวดหมู่</th><th>กลุ่ม</th><th>สถานที่ตั้ง</th><th>บันทึกข้อความ</th><th class="r">ยอดก่อนภาษี</th><th class="r">ภาษี</th><th class="r">ยอดรวม</th><th>สถานะ</th><th class="r">การกระทำ</th>', rows,
    'ไม่พบใบสั่งซื้อในช่วงเวลาหรือตัวกรองนี้') + (n ? '<div class="iv-pager">1 - ' + n + ' ของ ' + n + ' รายการ <span class="muted">‹ หน้า 1 ของ 1 ›</span></div>' : '');
}
async function poClose(id) {
  var d = findDoc(id); if (!d) return;
  try { await setRec('documents', d._id, Object.assign({}, strip(d), { status:'paid', paidDate: todayStr(), updatedAt: Date.now() })); showToast((d.docNo || '') + ' ปิดแล้ว'); } catch (e) { showToast(writeError(e)); }
}
