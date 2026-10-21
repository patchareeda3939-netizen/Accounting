/* ================= จัดการเอกสารภาษีซื้อ (ภาษี → จัดการเอกสารภาษีซื้อ) ================= */
/* สถานะใบกำกับภาษีซื้อเก็บใน extra.vatClaim = { st:'claimed'|'pending'|'none', ym, invNo, invDate }
   ไม่ระบุ = ใช้สิทธิ์ในเดือนของเอกสาร (เหมือนเดิม) · รอใช้สิทธิ์ = ไม่นับใน ภ.พ.30 จนกว่าจะเลือกเดือน
   ไม่ใช้สิทธิ์ = ภาษีซื้อเป็นค่าใช้จ่าย (เช่น ภาษีซื้อต้องห้าม ใบกำกับไม่ถูกต้อง) */
var IV_ST = { claimed: ['ใช้สิทธิ์แล้ว', 'st-paid'], pending: ['รอใช้สิทธิ์', 'st-unpaid'], none: ['ไม่ใช้สิทธิ์', 'st-done'], svc: ['ใช้สิทธิ์เมื่อจ่ายชำระ', 'st-paid'] };
pageState.ivTab = 'all'; pageState.ivPeriod = 'year'; pageState.ivQ = ''; pageState.ivSel = {};
function ivList() { // เอกสารซื้อที่มี VAT ตามวันที่เอกสาร (บิลค่าบริการแยกตามงวดที่จ่าย)
  return taxDocs().filter(function(d) { return docFlow(d) === 'exp' && d.vat; }).map(function(d) {
    var c = d._slice ? { st: 'svc', ym: (d.date || '').slice(0, 7) } : vatClaimOf(d);
    return { d: d, c: c, key: d._slice ? d._id + '|' + d.date + '|' + d.docNo : d._id };
  }).sort(function(a, b) { return (b.d.date || '').localeCompare(a.d.date || '') || String(b.d.docNo || '').localeCompare(String(a.d.docNo || '')); });
}
function ivShell() {
  return pageHead('จัดการเอกสารภาษีซื้อ', 'ภาษีซื้อจากค่าใช้จ่าย บิล เช็คจ่าย และเครดิตจากผู้ขาย เลือกเดือนที่ใช้สิทธิ์ (ภายใน 6 เดือนนับจากเดือนถัดจากเดือนที่ออกใบกำกับ) หรือพักไว้รอใช้สิทธิ์ ภ.พ.30 และรายงานภาษีซื้อนับตามเดือนที่ใช้สิทธิ์');
}
function ivData() {
  var r = periodRange(pageState.ivPeriod), q = (pageState.ivQ || '').toLowerCase();
  var all = ivList().filter(function(x) { return inRange(x.d.date || '', r) && (!q || [x.d.docNo, x.d.party, x.d.extra && x.d.extra.supInvNo, x.c.invNo].join(' ').toLowerCase().indexOf(q) >= 0); });
  var cnt = { all: all.length }; all.forEach(function(x) { var k = x.c.st === 'svc' ? 'claimed' : x.c.st; cnt[k] = (cnt[k] || 0) + 1; });
  var list = pageState.ivTab === 'all' ? all : all.filter(function(x) { return (x.c.st === 'svc' ? 'claimed' : x.c.st) === pageState.ivTab; });
  var vat = round2(list.reduce(function(s, x) { return s + x.d.vat * docSign(x.d); }, 0)), ro = fbReadOnly();
  Object.keys(pageState.ivSel).forEach(function(k) { if (!list.some(function(x) { return x.key === k; })) delete pageState.ivSel[k]; });
  var nSel = Object.keys(pageState.ivSel).length;
  var tabs = [['all', 'แสดงทั้งหมด'], ['pending', 'รอใช้สิทธิ์'], ['claimed', 'ใช้สิทธิ์แล้ว'], ['none', 'ไม่ใช้สิทธิ์']];
  var h = '<div class="jn-tabs">' + tabs.map(function(t) { return '<button type="button" class="' + (pageState.ivTab === t[0] ? 'on' : '') + '" onclick="ivSet(\'ivTab\',\'' + t[0] + '\')">' + t[1] + ' <span class="jn-n">' + (cnt[t[0]] || 0) + '</span></button>'; }).join('') + '</div>' +
    '<div class="iv-filters"><div class="field"><span class="iv-lbl">ช่วงวันที่เอกสาร</span><select class="coa-select" onchange="ivSet(\'ivPeriod\',this.value)">' + [['month','เดือนนี้'],['quarter','ไตรมาสนี้'],['year','ปีนี้'],['last12','12 เดือนที่ผ่านมา'],['all','ทั้งหมด']].map(function(o) { return '<option value="' + o[0] + '"' + (pageState.ivPeriod === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
    '<label class="coa-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input type="search" value="' + esc(pageState.ivQ) + '" placeholder="ค้นหาเลขที่เอกสาร ผู้จำหน่าย เลขที่ใบกำกับ" onchange="ivSet(\'ivQ\',this.value)"></label></div>' +
    '<div class="kpi-row">' + kpi('ยอดรวมภาษีซื้อทั้งหมด', fmtMoney(vat), (tabs.find(function(t) { return t[0] === pageState.ivTab; }) || [])[1]) + kpi('รายการทั้งหมด', String(list.length), 'รอใช้สิทธิ์ ' + (cnt.pending || 0) + ' รายการ') + '</div>';
  if (!list.length) return h + '<div class="yc-card adj-empty"><b>ไม่พบข้อมูลในช่วงเวลานี้</b><div>กรุณาสร้างค่าใช้จ่ายเพื่อจัดการเอกสารภาษีซื้อ</div>' +
    (ro ? '' : '<div style="margin-top:10px"><button type="button" class="btn btn-dark" data-open="expense">+ สร้างค่าใช้จ่าย</button></div>') + '</div>';
  var lk = lockDate();
  h += (ro ? '' : '<div class="toolbar iv-bulk" style="margin:0 0 8px"><span class="small muted">เลือกแล้ว ' + nSel + ' รายการ</span>' +
      '<button type="button" class="btn btn-outline btn-sm"' + (nSel ? '' : ' disabled') + ' onclick="ivBulk(\'claimed\')">ใช้สิทธิ์ในเดือน…</button>' +
      '<button type="button" class="btn btn-outline btn-sm"' + (nSel ? '' : ' disabled') + ' onclick="ivBulk(\'pending\')">ย้ายไปรอใช้สิทธิ์</button></div>') +
    '<div class="table-wrap"><table class="data-table iv-table"><thead><tr>' + (ro ? '' : '<th style="width:32px"><input type="checkbox" aria-label="เลือกทั้งหมด" onchange="ivSelAll(this.checked)"' + (nSel && nSel === list.filter(ivEditable).length ? ' checked' : '') + '></th>') +
    '<th>วันที่เอกสาร</th><th>เลขที่เอกสาร</th><th>ชื่อผู้จำหน่าย/ชื่อโปรเจ็ค</th><th class="r">มูลค่า/ภาษีมูลค่าเพิ่ม</th><th>สถานะใบกำกับภาษี</th>' + (ro ? '' : '<th></th>') + '</tr></thead><tbody>' +
    list.map(function(x) {
      var d = x.d, ex = d.extra || {}, sg = docSign(d), st = IV_ST[x.c.st], ed = ivEditable(x), locked = lk && (d.date || '') <= lk;
      var proj = typeof dimName === 'function' ? dimName('projects', ex.project) : '';
      var stTxt = '<span class="status ' + st[1] + '">' + st[0] + '</span>' + (x.c.st === 'claimed' ? '<div class="small muted">ภ.พ.30 ' + esc(monthLabel(x.c.ym, true)) + '</div>' : '') + (x.c.invNo ? '<div class="small muted">ใบกำกับ ' + esc(x.c.invNo) + (x.c.invDate ? ' · ' + fmtDateNum(x.c.invDate) : '') + '</div>' : '');
      return '<tr' + (pageState.ivSel[x.key] ? ' class="sel"' : '') + '>' + (ro ? '' : '<td>' + (ed ? '<input type="checkbox" aria-label="เลือก" ' + (pageState.ivSel[x.key] ? 'checked ' : '') + 'onchange="ivToggle(\'' + esc(x.key) + '\',this.checked)">' : '') + '</td>') +
        '<td class="num">' + fmtDateNum(d.date) + '</td>' +
        '<td><a href="#" class="po-link" data-doc="' + esc(d._id) + '" onclick="event.preventDefault()">' + esc(d.docNo || '-') + '</a>' + (ex.supInvNo ? '<div class="small muted">ใบกำกับผู้ขาย ' + esc(ex.supInvNo) + '</div>' : '') + '<div class="small muted">' + esc(d.typeLabel || '') + '</div></td>' +
        '<td>' + esc(d.party || '-') + (proj ? '<div class="small muted">' + esc(proj) + '</div>' : '') + '</td>' +
        '<td class="r">' + fmtMoney(docAmountExVat(d) * sg) + '<div class="small muted">VAT ' + fmtMoney(d.vat * sg) + '</div></td>' +
        '<td>' + stTxt + '</td>' +
        (ro ? '' : '<td class="r">' + (ed ? '<button type="button" class="btn btn-outline btn-sm" onclick="openIvClaim(\'' + esc(d._id) + '\')">จัดการ</button>' : locked && x.c.st !== 'svc' ? '<span class="small muted" title="งวดถูกล็อกถึง ' + fmtDateNum(lk) + '">🔒</span>' : '') + '</td>') + '</tr>';
    }).join('') + '</tbody></table></div>' +
    '<p class="small muted">บิลค่าบริการใช้สิทธิ์ภาษีซื้อเมื่อจ่ายชำระ (แยกตามงวดที่จ่าย) จัดการที่การจ่ายชำระบิล · เอกสารในงวดที่ล็อกแล้วเปลี่ยนสถานะไม่ได้</p>';
  return h;
}
function ivEditable(x) { var lk = lockDate(); return x.c.st !== 'svc' && !(lk && (x.d.date || '') <= lk); }
function ivSet(k, v) { pageState[k] = v; pageState.ivSel = {}; refreshPageData(); }
function ivToggle(k, on) { if (on) pageState.ivSel[k] = 1; else delete pageState.ivSel[k]; refreshPageData(); }
function ivSelAll(on) {
  pageState.ivSel = {};
  if (on) { var r = periodRange(pageState.ivPeriod); ivList().filter(function(x) { return inRange(x.d.date || '', r) && ivEditable(x) && (pageState.ivTab === 'all' || x.c.st === pageState.ivTab); }).forEach(function(x) { pageState.ivSel[x.key] = 1; }); }
  refreshPageData();
}
// ตรวจเดือนที่ใช้สิทธิ์: ไม่ก่อนเดือนของเอกสาร ไม่เกิน 6 เดือนนับจากเดือนถัดจากเดือนที่ออกใบกำกับ และไม่อยู่ในงวดที่ล็อก
function ivClaimError(d, c) {
  if (c.st !== 'claimed') return '';
  if (!/^\d{4}-\d{2}$/.test(c.ym || '')) return 'เลือกเดือนที่ใช้สิทธิ์';
  var dm = (d.date || '').slice(0, 7), im = (c.invDate || d.date || '').slice(0, 7), lk = lockDate();
  if (c.ym < dm) return 'เดือนที่ใช้สิทธิ์ต้องไม่ก่อนเดือนของเอกสาร (' + monthLabel(dm, true) + ')';
  if (c.invDate && c.invDate.slice(0, 7) > c.ym) return 'เดือนที่ใช้สิทธิ์ต้องไม่ก่อนเดือนที่ออกใบกำกับภาษี';
  if (c.ym > addMonths(im, 6)) return 'เกินกำหนดใช้สิทธิ์: ใช้ได้ถึงเดือน ' + monthLabel(addMonths(im, 6), true) + ' (6 เดือนนับจากเดือนถัดจากเดือนที่ออกใบกำกับ)';
  if (c.ym !== dm && lk && c.ym + '-01' <= lk) return 'เดือน ' + monthLabel(c.ym, true) + ' อยู่ในงวดที่ล็อกแล้ว';
  return '';
}
async function ivSave(d, c) {
  var ex = Object.assign({}, d.extra || {}), dm = (d.date || '').slice(0, 7);
  if (c.st === 'claimed' && c.ym === dm && !c.invNo && !c.invDate) delete ex.vatClaim; // ค่าเริ่มต้น
  else ex.vatClaim = { st: c.st, ym: c.st === 'claimed' ? c.ym : '', invNo: c.invNo || '', invDate: c.invDate || '' };
  await setRec('documents', d._id, Object.assign({}, strip(d), { extra: ex, updatedAt: Date.now() }));
}
function openIvClaim(id) {
  var d = findDoc(id); if (!d || fbReadOnly()) return;
  var c = vatClaimOf(d), sg = docSign(d);
  openModal({ title: 'ภาษีซื้อ ' + (d.docNo || ''), focus: false, body:
    '<p class="small muted" style="margin:0">' + esc(d.typeLabel || '') + ' · ' + esc(d.party || '') + ' · ' + fmtDateNum(d.date) + ' · มูลค่า ' + fmtMoney(docAmountExVat(d) * sg) + ' · VAT ' + fmtMoney(d.vat * sg) + '</p>' +
    '<div class="field"><label for="ivSt">สถานะใบกำกับภาษี</label><select id="ivSt"><option value="claimed"' + (c.st === 'claimed' ? ' selected' : '') + '>ใช้สิทธิ์</option><option value="pending"' + (c.st === 'pending' ? ' selected' : '') + '>รอใช้สิทธิ์ (ยังไม่ได้รับใบกำกับ / ยกไปเดือนหลัง)</option><option value="none"' + (c.st === 'none' ? ' selected' : '') + '>ไม่ใช้สิทธิ์ (ภาษีซื้อต้องห้าม บันทึกเป็นค่าใช้จ่าย)</option></select></div>' +
    '<div class="grid-2"><div class="field" id="ivYmF"><label for="ivYm">เดือนที่ใช้สิทธิ์ (ภ.พ.30)</label><input id="ivYm" type="month" value="' + esc(c.ym || (d.date || '').slice(0, 7)) + '"></div>' +
    '<div class="field"><label for="ivNo">เลขที่ใบกำกับภาษี</label><input id="ivNo" value="' + esc(c.invNo || (d.extra && d.extra.supInvNo) || '') + '"></div></div>' +
    '<div class="field"><label for="ivDt">วันที่ใบกำกับภาษี</label><input id="ivDt" type="date" value="' + esc(c.invDate || '') + '"></div>' +
    '<div class="form-error" id="formError" hidden></div>',
    buttons: [CANCEL_BTN, { label: 'บันทึก', cls: 'btn-dark', onClick: async function(btn) {
      var nc = { st: byId('ivSt').value, ym: byId('ivYm').value, invNo: byId('ivNo').value.trim(), invDate: byId('ivDt').value };
      var el = byId('formError'), err = ivClaimError(d, nc);
      if (err) { el.textContent = err; el.hidden = false; return; }
      btn.disabled = true;
      try { await ivSave(d, nc); closeModal(); showToast('บันทึกสถานะภาษีซื้อแล้ว'); refreshPageData(); }
      catch (e) { btn.disabled = false; el.textContent = 'บันทึกไม่สำเร็จ: ' + ((e && e.message) || e); el.hidden = false; }
    } }],
    onMount: function() { var f = function() { byId('ivYmF').hidden = byId('ivSt').value !== 'claimed'; }; byId('ivSt').addEventListener('change', f); f(); } });
}
function ivBulk(st) {
  var ids = Object.keys(pageState.ivSel), docs = ids.map(findDoc).filter(Boolean);
  if (!docs.length || fbReadOnly()) return;
  var run = async function(c, btn) {
    var errs = [], el = byId('formError');
    docs.forEach(function(d) { var e = ivClaimError(d, Object.assign({}, vatClaimOf(d), c)); if (e) errs.push((d.docNo || '') + ': ' + e); });
    if (errs.length) { el.textContent = errs.slice(0, 3).join(' · ') + (errs.length > 3 ? ' และอีก ' + (errs.length - 3) + ' รายการ' : ''); el.hidden = false; return; }
    btn.disabled = true;
    try { for (var i = 0; i < docs.length; i++) await ivSave(docs[i], Object.assign({}, vatClaimOf(docs[i]), c)); }
    catch (e) { btn.disabled = false; el.textContent = 'บันทึกไม่สำเร็จ: ' + ((e && e.message) || e); el.hidden = false; return; }
    pageState.ivSel = {}; closeModal(); showToast('อัปเดต ' + docs.length + ' รายการแล้ว'); refreshPageData();
  };
  if (st === 'pending') return openModal({ title: 'ย้ายไปรอใช้สิทธิ์', focus: false, body: '<p style="margin:0">ย้าย ' + docs.length + ' รายการไปรอใช้สิทธิ์ ภาษีซื้อเหล่านี้จะไม่นับใน ภ.พ.30 จนกว่าจะเลือกเดือนที่ใช้สิทธิ์</p><div class="form-error" id="formError" hidden></div>',
    buttons: [CANCEL_BTN, { label: 'ย้ายไปรอใช้สิทธิ์', cls: 'btn-dark', onClick: function(btn) { run({ st: 'pending' }, btn); } }] });
  openModal({ title: 'ใช้สิทธิ์ภาษีซื้อ ' + docs.length + ' รายการ', focus: false, body:
    '<div class="field"><label for="ivBYm">เดือนที่ใช้สิทธิ์ (ภ.พ.30)</label><input id="ivBYm" type="month" value="' + todayStr().slice(0, 7) + '"></div><div class="form-error" id="formError" hidden></div>',
    buttons: [CANCEL_BTN, { label: 'ใช้สิทธิ์', cls: 'btn-dark', onClick: function(btn) { run({ st: 'claimed', ym: byId('ivBYm').value }, btn); } }] });
}
