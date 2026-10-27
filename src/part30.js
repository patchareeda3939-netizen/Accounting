/* ================= เงินเดือน (ทีมงาน → เงินเดือน) ================= */
/* รอบเงินเดือน = เอกสาร payroll ต่อเดือน: items = พนักงานแต่ละคน { empId, name, base, extra, deduct, gross, sso, ssoEr, wht, net }
   ลงบัญชี: Dr เงินเดือน (รวม) + Dr เงินสมทบประกันสังคม (นายจ้าง) / Cr ธนาคาร (สุทธิ) + Cr ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) + Cr ประกันสังคมค้างจ่าย
   นำส่ง ภ.ง.ด.1 / สปส.1-10 = เอกสาร payrollRemit: Dr ภาษีหัก ณ ที่จ่าย + Dr ประกันสังคมค้างจ่าย / Cr ธนาคาร
   การตั้งค่าใน settings/payroll { ssoRate, ssoCeil, ssoFloor, salaryAcc, ssoExpAcc, ssoPayAcc, payFrom } */
DOC_TYPES.payroll = { label:'เงินเดือน', group:'other', template:'record', partyLabel:'รอบเงินเดือน', prefix:'PR', extra:[] };
DOC_TYPES.payrollRemit = { label:'นำส่งภาษีเงินเดือนและประกันสังคม', group:'other', template:'record', partyLabel:'รายการ', prefix:'PS', extra:[] };
(function() { // ข้อมูลพนักงานสำหรับเงินเดือน
  var i = EMPLOYEE_FIELDS.findIndex(function(f) { return f.key === 'phone'; });
  EMPLOYEE_FIELDS.splice(i < 0 ? EMPLOYEE_FIELDS.length : i, 0,
    { key:'taxId', label:'เลขประจำตัวผู้เสียภาษี / บัตรประชาชน' },
    { key:'sso', label:'ประกันสังคม', type:'select', options:[['yes','เข้าประกันสังคม (มาตรา 33)'],['no','ไม่เข้าประกันสังคม']] },
    { key:'taxAllow', label:'ค่าลดหย่อนภาษีอื่นต่อปี (บาท, นอกจากส่วนตัวและประกันสังคม)', type:'number' },
    { key:'bankAcct', label:'บัญชีธนาคารรับเงินเดือน' });
})();
var PR_TAX = [[150000, 0], [300000, 0.05], [500000, 0.10], [750000, 0.15], [1000000, 0.20], [2000000, 0.25], [5000000, 0.30], [Infinity, 0.35]];
function prCfg() {
  var s = STORE.settings.find(function(x) { return x._id === 'payroll'; }) || {};
  var n = function(v, d) { return v === '' || v == null || isNaN(Number(v)) ? d : Number(v); };
  return { ssoRate: n(s.ssoRate, 5), ssoCeil: n(s.ssoCeil, 17500), ssoFloor: n(s.ssoFloor, 1650), salaryAcc: s.salaryAcc || '5210', ssoExpAcc: s.ssoExpAcc || '', ssoPayAcc: s.ssoPayAcc || '', payFrom: s.payFrom || SYS.bank };
}
function prPit(annual) { var t = 0, lo = 0; PR_TAX.forEach(function(b) { if (annual > lo) t += (Math.min(annual, b[0]) - lo) * b[1]; lo = b[0]; }); return t; }
function prEmpSso(e) { return e ? (e.sso ? e.sso !== 'no' : e.empType !== 'contract') : true; }
// คำนวณบรรทัดของพนักงาน: ประกันสังคม 5% ของค่าจ้าง (ขั้นต่ำ–เพดาน) ภาษีคำนวณแบบประมาณทั้งปี (×12) หาร 12
function prCalc(line, e, cfg, whtManual) {
  var gross = round2(Math.max((Number(line.base) || 0) + (Number(line.extra) || 0) - (Number(line.deduct) || 0), 0));
  var sso = prEmpSso(e) && gross > 0 ? Math.round(Math.min(Math.max(gross, cfg.ssoFloor), cfg.ssoCeil) * cfg.ssoRate / 100) : 0;
  var annual = gross * 12, allow = 60000 + Math.min(sso * 12, Math.round(cfg.ssoCeil * cfg.ssoRate / 100) * 12) + (Number(e && e.taxAllow) || 0);
  var taxable = Math.max(annual - Math.min(annual * 0.5, 100000) - allow, 0), wht = whtManual != null ? round2(whtManual) : round2(prPit(taxable) / 12);
  return Object.assign({}, line, { gross: gross, sso: sso, ssoEr: sso, wht: wht, net: round2(gross - sso - wht) });
}
function prRun(ym) { return STORE.documents.find(function(d) { return d.type === 'payroll' && !d.voided && d.extra && d.extra.period === ym; }); }
function prRemitOf(d) { return STORE.documents.find(function(x) { return x.type === 'payrollRemit' && !x.voided && x.extra && x.extra.payrollId === d._id; }); }
function prSum(items, k) { return round2((items || []).reduce(function(s, x) { return s + (Number(x[k]) || 0); }, 0)); }

var _postingsOfPr = postingsOf;
postingsOf = function(d) {
  if (!d || d.voided || (d.type !== 'payroll' && d.type !== 'payrollRemit')) return _postingsOfPr(d);
  var ex = d.extra || {}, L = [], add = function(code, dr, cr, memo) { dr = round2(dr); cr = round2(cr); if (code && (dr || cr)) L.push({ code: code, dr: dr, cr: cr, memo: memo || '', date: d.date, d: d }); };
  if (d.type === 'payroll') {
    var it = d.items || [];
    add(ex.salaryAcc, prSum(it, 'gross'), 0, 'เงินเดือน ' + (ex.period || ''));
    add(ex.ssoExpAcc, prSum(it, 'ssoEr'), 0, 'เงินสมทบประกันสังคม (นายจ้าง)');
    add(ex.payFrom, 0, prSum(it, 'net'), 'จ่ายเงินเดือนสุทธิ');
    add(SYS.whtPay, 0, prSum(it, 'wht'), 'ภาษีหัก ณ ที่จ่าย ภ.ง.ด.1');
    add(ex.ssoPayAcc, 0, prSum(it, 'sso') + prSum(it, 'ssoEr'), 'ประกันสังคมค้างนำส่ง');
  } else {
    add(SYS.whtPay, Number(ex.wht) || 0, 0, 'นำส่ง ภ.ง.ด.1'); add(ex.ssoPayAcc, Number(ex.sso) || 0, 0, 'นำส่งประกันสังคม');
    add(ex.fromAcc, 0, (Number(ex.wht) || 0) + (Number(ex.sso) || 0));
  }
  return L;
};
var _openDocFormPr = openDocForm;
openDocForm = function(typeKey, doc, prefill) {
  if (typeKey === 'payroll') { if (doc && doc.extra) pageState.prYm = doc.extra.period; go('team', 'payroll'); return openPrRun(pageState.prYm || todayStr().slice(0, 7)); }
  if (typeKey === 'payrollRemit') { var p = doc && findDoc(doc.extra && doc.extra.payrollId); return p ? openPrRemit(p, doc) : go('team', 'payroll'); }
  return _openDocFormPr(typeKey, doc, prefill);
};
async function prEnsureAccs() { // บัญชีที่ต้องใช้ ถ้ายังไม่มีสร้างให้
  var cfg = prCfg(), patch = {};
  var ensure = async function(code, name, accType) { if (!STORE.accounts.some(function(a) { return a.code === code; })) await addRec('accounts', { code: code, name: name, accType: accType }); };
  await ensure(cfg.salaryAcc, 'เงินเดือนและค่าจ้าง', 'expense');
  if (!cfg.ssoExpAcc) { var e1 = STORE.accounts.find(function(a) { return /สมทบประกันสังคม/.test(a.name) && accBaseOf(a.code) === 'expense'; }); patch.ssoExpAcc = e1 ? e1.code : pcFreeCode(5215); if (!e1) await ensure(patch.ssoExpAcc, 'เงินสมทบประกันสังคม', 'expense'); }
  if (!cfg.ssoPayAcc) { var l1 = STORE.accounts.find(function(a) { return /ประกันสังคม/.test(a.name) && accBaseOf(a.code) === 'liability'; }); patch.ssoPayAcc = l1 ? l1.code : pcFreeCode(2150); if (!l1) await ensure(patch.ssoPayAcc, 'เงินประกันสังคมค้างนำส่ง', 'curLiab'); }
  if (Object.keys(patch).length) await saveSettings('payroll', patch);
  return prCfg();
}

/* ---- หน้าเงินเดือน ---- */
pageState.prYm = '';
function prShell() { return pageHead('เงินเดือน', 'คำนวณเงินเดือน ประกันสังคม และภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) รายเดือน ลงบัญชีให้อัตโนมัติ ออกสลิปเงินเดือน และบันทึกการนำส่ง'); }
function prData() {
  var ym = pageState.prYm || todayStr().slice(0, 7), ro = fbReadOnly(), d = prRun(ym), cfg = prCfg();
  var h = '<div class="toolbar" style="margin:0 0 10px"><div class="field" style="margin:0"><label for="prYm">เดือน</label><input id="prYm" type="month" value="' + esc(ym) + '" onchange="pageState.prYm=this.value;refreshPageData()"></div>' +
    (ro ? '' : (d ? '<button type="button" class="btn btn-outline" onclick="openPrRun(\'' + ym + '\')">แก้ไขรอบเงินเดือน</button>' : '<button type="button" class="btn btn-dark" onclick="openPrRun(\'' + ym + '\')">+ สร้างรอบเงินเดือน ' + esc(monthLabel(ym, true)) + '</button>') +
      '<button type="button" class="btn btn-outline" onclick="openPrSettings()">ตั้งค่า</button>') + '</div>';
  if (!d) {
    var act = STORE.employees.filter(function(e) { return (e.active || 'yes') === 'yes'; }).length;
    h += '<div class="yc-card adj-empty"><b>ยังไม่มีรอบเงินเดือน ' + esc(monthLabel(ym, true)) + '</b><div>' + (act ? 'พนักงานที่ทำงานอยู่ ' + act + ' คน' : 'ยังไม่มีพนักงาน — เพิ่มพนักงานที่ ทีมงาน → พนักงาน') + '</div></div>';
  } else {
    var payYm = d.date.slice(0, 7), it = d.items || [], rem = prRemitOf(d), wht = prSum(it, 'wht'), sso = prSum(it, 'sso'), er = prSum(it, 'ssoEr');
    h += '<div class="kpi-row">' + kpi('เงินเดือนรวม', fmtMoney(prSum(it, 'gross')), it.length + ' คน · จ่ายวันที่ ' + fmtDateNum(d.date)) + kpi('จ่ายสุทธิ', fmtMoney(prSum(it, 'net')), (d.extra.payFrom || '') + ' ' + (acctName(d.extra.payFrom) || '')) +
      kpi('ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1)', fmtMoney(wht), 'นำส่งภายใน ' + fmtDate(nextMonthDay(payYm, 7)) + ' (e-Filing ' + fmtDate(nextMonthDay(payYm, 15)) + ')') +
      kpi('ประกันสังคม (สปส.1-10)', fmtMoney(sso + er), 'ลูกจ้าง ' + fmtMoney(sso) + ' + นายจ้าง ' + fmtMoney(er) + ' · ภายใน ' + fmtDate(nextMonthDay(ym, 15))) + '</div>' +
      '<div class="banner ' + (rem ? 'ok' : 'warn') + '">' + (rem ? 'นำส่งภาษีและประกันสังคมแล้ว วันที่ ' + fmtDateNum(rem.date) + ' (' + esc(rem.docNo || '') + ')' : 'ยังไม่ได้บันทึกการนำส่ง ภ.ง.ด.1 และประกันสังคมของเดือนนี้') +
      (ro || rem || (!wht && !sso && !er) ? '' : ' <button type="button" class="btn btn-sm btn-dark" onclick="openPrRemit(findDoc(\'' + d._id + '\'))">บันทึกการนำส่ง</button>') + '</div>' +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>พนักงาน</th><th class="r">เงินเดือน/ค่าจ้าง</th><th class="r">รายได้อื่น</th><th class="r">หักขาด/ลา</th><th class="r">ประกันสังคม</th><th class="r">ภาษี</th><th class="r">สุทธิ</th><th></th></tr></thead><tbody>' +
      it.map(function(x, i) { return '<tr><td><b>' + esc(x.name) + '</b>' + (x.bankAcct ? '<div class="small muted">' + esc(x.bankAcct) + '</div>' : '') + '</td><td class="r">' + fmtMoney(x.base) + '</td><td class="r">' + (x.extra ? fmtMoney(x.extra) : '') + '</td><td class="r">' + (x.deduct ? fmtMoney(x.deduct) : '') + '</td><td class="r">' + fmtMoney(x.sso) + '</td><td class="r">' + fmtMoney(x.wht) + '</td><td class="r"><b>' + fmtMoney(x.net) + '</b></td><td class="r"><button type="button" class="btn btn-outline btn-sm" onclick="openPayslip(\'' + d._id + '\',' + i + ')">สลิป</button></td></tr>'; }).join('') +
      '</tbody><tfoot><tr><td>รวม</td><td class="r">' + fmtMoney(prSum(it, 'base')) + '</td><td class="r">' + fmtMoney(prSum(it, 'extra')) + '</td><td class="r">' + fmtMoney(prSum(it, 'deduct')) + '</td><td class="r">' + fmtMoney(sso) + '</td><td class="r">' + fmtMoney(wht) + '</td><td class="r">' + fmtMoney(prSum(it, 'net')) + '</td><td></td></tr></tfoot></table></div>' +
      '<div class="toolbar" style="margin:8px 0"><button type="button" class="btn btn-outline btn-sm" onclick="prExport(\'' + d._id + '\')">ส่งออกรายการโอนเงินเดือน (CSV)</button><a href="#" class="po-link small" data-doc="' + esc(d._id) + '" onclick="event.preventDefault()">' + esc(d.docNo || '') + ' · ดูการลงบัญชี</a></div>';
  }
  h += '<div class="toolbar"><button type="button" class="btn btn-outline" onclick="openPrPnd1()">สรุปข้อมูล ภ.ง.ด.1 ตามเดือนที่จ่าย</button></div>';
  var hist = STORE.documents.filter(function(x) { return x.type === 'payroll' && !x.voided; }).sort(function(a, b) { return String(b.extra.period).localeCompare(String(a.extra.period)); });
  if (hist.length) h += '<div class="page-block"><h2>รอบเงินเดือนทั้งหมด</h2><div class="table-wrap"><table class="data-table"><thead><tr><th>เดือน</th><th>วันที่จ่าย</th><th class="r">คน</th><th class="r">เงินเดือนรวม</th><th class="r">ภาษี</th><th class="r">ประกันสังคม</th><th class="r">จ่ายสุทธิ</th><th>นำส่ง</th></tr></thead><tbody>' +
    hist.map(function(x) { var it2 = x.items || []; return '<tr class="row-link" tabindex="0" onclick="pageState.prYm=\'' + esc(x.extra.period) + '\';refreshPageData()"><td>' + esc(monthLabel(x.extra.period, true)) + '</td><td class="num">' + fmtDateNum(x.date) + '</td><td class="r">' + it2.length + '</td><td class="r">' + fmtMoney(prSum(it2, 'gross')) + '</td><td class="r">' + fmtMoney(prSum(it2, 'wht')) + '</td><td class="r">' + fmtMoney(prSum(it2, 'sso') + prSum(it2, 'ssoEr')) + '</td><td class="r">' + fmtMoney(prSum(it2, 'net')) + '</td><td>' + (prRemitOf(x) ? '<span class="status st-paid">นำส่งแล้ว</span>' : '<span class="status st-unpaid">ยังไม่นำส่ง</span>') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  return h + '<p class="small muted">ประกันสังคม ' + cfg.ssoRate + '% ของค่าจ้าง ฐานขั้นต่ำ ' + fmtMoney(cfg.ssoFloor) + ' เพดาน ' + fmtMoney(cfg.ssoCeil) + ' (แก้ได้ที่ตั้งค่า) · ภาษีคำนวณแบบประมาณทั้งปี: เงินเดือน × 12 หักค่าใช้จ่าย 50% (ไม่เกิน 100,000) ลดหย่อนส่วนตัว 60,000 ประกันสังคม และค่าลดหย่อนอื่นของพนักงาน แล้วหาร 12 — แก้ยอดภาษีแต่ละคนได้</p>';
}
function openPrSettings() {
  if (fbReadOnly()) return;
  var c = prCfg(), exp = STORE.accounts.filter(function(a) { return accBaseOf(a.code) === 'expense'; }).map(function(a) { return [a.code, a.name]; });
  var liab = STORE.accounts.filter(function(a) { return accBaseOf(a.code) === 'liability'; }).map(function(a) { return [a.code, a.name]; });
  var opt = function(l, cur, blank) { return (blank ? '<option value="">' + blank + '</option>' : '') + pcOpts(l, cur); };
  openModal({ title:'ตั้งค่าเงินเดือน', focus:false, body:
    '<div class="grid-2"><div class="field"><label for="psRate">อัตราประกันสังคม (%)</label><input id="psRate" type="number" step="0.01" value="' + c.ssoRate + '"></div><div class="field"><label for="psCeil">เพดานค่าจ้าง (บาท/เดือน)</label><input id="psCeil" type="number" value="' + c.ssoCeil + '"></div></div>' +
    '<div class="grid-2"><div class="field"><label for="psFloor">ฐานค่าจ้างขั้นต่ำ (บาท/เดือน)</label><input id="psFloor" type="number" value="' + c.ssoFloor + '"></div><div class="field"><label for="psFrom">จ่ายเงินเดือนจากบัญชี</label><select id="psFrom">' + pcOpts(pcPayAccs(), c.payFrom) + '</select></div></div>' +
    '<div class="field"><label for="psSal">บัญชีเงินเดือน (ค่าใช้จ่าย)</label><select id="psSal">' + opt(exp, c.salaryAcc, STORE.accounts.some(function(a) { return a.code === c.salaryAcc; }) ? '' : '5210 เงินเดือนและค่าจ้าง (สร้างใหม่)') + '</select></div>' +
    '<div class="grid-2"><div class="field"><label for="psSsoE">บัญชีเงินสมทบประกันสังคม (นายจ้าง)</label><select id="psSsoE">' + opt(exp, c.ssoExpAcc, 'สร้าง/ค้นหาให้อัตโนมัติ') + '</select></div><div class="field"><label for="psSsoP">บัญชีประกันสังคมค้างนำส่ง</label><select id="psSsoP">' + opt(liab, c.ssoPayAcc, 'สร้าง/ค้นหาให้อัตโนมัติ') + '</select></div></div>' +
    '<p class="small muted" style="margin:0">ตรวจอัตราและเพดานประกันสังคมกับประกาศของสำนักงานประกันสังคมทุกปี</p><div class="form-error" id="formError" hidden></div>',
    buttons:[CANCEL_BTN, { label:'บันทึก', cls:'btn-dark', onClick: async function(btn) {
      var rate = Number(byId('psRate').value), ceil = Number(byId('psCeil').value), floor = Number(byId('psFloor').value);
      if (!(rate >= 0 && rate <= 20)) return pcErr('อัตราประกันสังคมไม่ถูกต้อง');
      if (!(ceil > 0) || !(floor >= 0) || floor > ceil) return pcErr('ฐานขั้นต่ำต้องไม่เกินเพดานค่าจ้าง');
      btn.disabled = true;
      try { await saveSettings('payroll', { ssoRate: rate, ssoCeil: ceil, ssoFloor: floor, payFrom: byId('psFrom').value, salaryAcc: byId('psSal').value || '5210', ssoExpAcc: byId('psSsoE').value, ssoPayAcc: byId('psSsoP').value }); closeModal(); showToast('บันทึกการตั้งค่าเงินเดือนแล้ว'); refreshPageData(); }
      catch (e) { btn.disabled = false; pcErr('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e)); }
    } }] });
}
var prForm = null;
function openPrRun(ym) {
  if (fbReadOnly()) return;
  var d = prRun(ym), cfg = prCfg(), emps = STORE.employees.slice().sort(function(a, b) { return String(a.name).localeCompare(String(b.name), 'th'); });
  var lines = emps.map(function(e) {
    var old = d && (d.items || []).find(function(x) { return x.empId === e._id; });
    if (old) return Object.assign({ on: true }, old, { _manual: true, _saved: true });
    var base = Number(e.salary) || round2((Number(e.hourlyRate) || 0) * (typeof empHours === 'function' ? empHours(e.name, ym) : 0));
    return { on: !d && (e.active || 'yes') === 'yes' && base > 0, empId: e._id, name: e.name, taxId: e.taxId || '', bankAcct: e.bankAcct || '', position: e.position || '', base: base, extra: 0, deduct: 0 };
  });
  prForm = { ym: ym, doc: d, lines: lines.map(function(l) { var e = STORE.employees.find(function(x) { return x._id === l.empId; }); return l.on && !l._saved ? prCalc(l, e, cfg, l._manual ? l.wht : null) : l; }) };
  if (!lines.length) { showToast('ยังไม่มีพนักงาน — เพิ่มที่ ทีมงาน → พนักงาน'); return; }
  var payDate = (d && d.date) || monthEnd(ym);
  openModal({ full: true, title: (d ? 'แก้ไข' : 'สร้าง') + 'รอบเงินเดือน ' + monthLabel(ym, true), body:
    '<div class="grid-2" style="max-width:640px"><div class="field"><label for="prDate">วันที่จ่าย</label><input id="prDate" type="date" value="' + esc(payDate) + '"></div><div class="field"><label for="prFrom">จ่ายจากบัญชี</label><select id="prFrom">' + pcOpts(pcPayAccs(), (d && d.extra.payFrom) || cfg.payFrom) + '</select></div></div>' +
    '<div class="items-wrap"><table class="data-table pr-table"><thead><tr><th></th><th>พนักงาน</th><th class="r">เงินเดือน/ค่าจ้าง</th><th class="r">รายได้อื่น (OT/โบนัส/เบี้ยเลี้ยง)</th><th class="r">หักขาด/ลา</th><th class="r">ประกันสังคม</th><th class="r">ภาษีหัก ณ ที่จ่าย</th><th class="r">สุทธิ</th></tr></thead><tbody id="prRows"></tbody><tfoot id="prFoot"></tfoot></table></div>' +
    '<p class="small muted">ภาษีประมาณจากรายได้เดือนนี้ × 12 ตามอัตราก้าวหน้า กรณีโบนัสครั้งเดียว เริ่ม/ออกงานระหว่างปี หรือปรับยอดปลายปี ให้ตรวจและปรับภาษีตามข้อมูลจริง แก้ยอดแล้วกด ↺ เพื่อกลับไปคำนวณอัตโนมัติ</p><div class="form-error" id="formError" hidden></div>',
    buttons:[CANCEL_BTN, { label:'บันทึกและลงบัญชี', cls:'btn-dark', onClick: savePrRun }], onMount: renderPrRows });
}
function renderPrRows() {
  var inp = function(i, k, v) { return '<input type="number" step="0.01" min="0" class="pr-in" data-i="' + i + '" data-k="' + k + '" value="' + (v || v === 0 ? v : '') + '"' + (prForm.lines[i].on ? '' : ' disabled') + '>'; };
  byId('prRows').innerHTML = prForm.lines.map(function(l, i) {
    return '<tr' + (l.on ? '' : ' class="muted"') + '><td><input type="checkbox" data-on="' + i + '"' + (l.on ? ' checked' : '') + ' aria-label="รวม ' + esc(l.name) + '"></td><td><b>' + esc(l.name) + '</b><div class="small muted">' + esc(l.position || '') + '</div></td>' +
      '<td class="r">' + inp(i, 'base', l.base) + '</td><td class="r">' + inp(i, 'extra', l.extra) + '</td><td class="r">' + inp(i, 'deduct', l.deduct) + '</td><td class="r">' + (l.on ? fmtMoney(l.sso) : '') + '</td>' +
      '<td class="r"><span style="white-space:nowrap">' + inp(i, 'wht', l.on ? l.wht : '') + (l._manual && l.on ? ' <button type="button" class="btn btn-sm btn-outline" data-re="' + i + '" title="คำนวณภาษีใหม่">↺</button>' : '') + '</span></td><td class="r"><b>' + (l.on ? fmtMoney(l.net) : '') + '</b></td></tr>';
  }).join('');
  var on = prForm.lines.filter(function(l) { return l.on; });
  byId('prFoot').innerHTML = '<tr><td></td><td>รวม ' + on.length + ' คน</td><td class="r">' + fmtMoney(prSum(on, 'base')) + '</td><td class="r">' + fmtMoney(prSum(on, 'extra')) + '</td><td class="r">' + fmtMoney(prSum(on, 'deduct')) + '</td><td class="r">' + fmtMoney(prSum(on, 'sso')) + '</td><td class="r">' + fmtMoney(prSum(on, 'wht')) + '</td><td class="r">' + fmtMoney(prSum(on, 'net')) + '</td></tr>';
  var host = byId('prRows');
  if (host._b) return; host._b = 1;
  var recalc = function(i, manualWht) { var l = prForm.lines[i], e = STORE.employees.find(function(x) { return x._id === l.empId; }); prForm.lines[i] = prCalc(l, e, prCfg(), manualWht); if (manualWht != null) prForm.lines[i]._manual = true; else delete prForm.lines[i]._manual; prForm.lines[i].on = l.on; };
  host.addEventListener('change', function(ev) {
    var t = ev.target;
    if (t.dataset.on != null) { var i = Number(t.dataset.on); prForm.lines[i].on = t.checked; if (t.checked) recalc(i, null); return renderPrRows(); }
    if (t.dataset.k) { var j = Number(t.dataset.i), l = prForm.lines[j]; l[t.dataset.k] = Number(t.value); recalc(j, t.dataset.k === 'wht' ? Number(t.value) || 0 : (l._manual ? l.wht : null)); renderPrRows(); }
  });
  host.addEventListener('click', function(ev) { var b = ev.target.closest('[data-re]'); if (b) { recalc(Number(b.dataset.re), null); renderPrRows(); } });
}
async function savePrRun(btn) {
  var dt = byId('prDate').value, on = prForm.lines.filter(function(l) { return l.on; }), d = prForm.doc;
  if (!on.length) return pcErr('เลือกพนักงานอย่างน้อย 1 คน');
  if (on.some(function(l) { return ['base','extra','deduct','gross','sso','ssoEr','wht','net'].some(function(k) { return !Number.isFinite(Number(l[k])) || Number(l[k]) < 0; }) || Number(l.deduct) > Number(l.base) + Number(l.extra); })) return pcErr('จำนวนเงินต้องเป็นตัวเลขตั้งแต่ศูนย์ และยอดหักขาด/ลาต้องไม่เกินรายได้');
  if (pcDateErr(dt) || (d && pcDateErr(d.date))) return pcErr(pcDateErr(dt) || pcDateErr(d.date));
  btn.disabled = true;
  try {
    var cfg = await prEnsureAccs(), items = on.map(function(l) { var o = {}; ['empId','name','taxId','bankAcct','position','base','extra','deduct','gross','sso','ssoEr','wht','net'].forEach(function(k) { o[k] = l[k] == null ? '' : l[k]; }); return o; });
    await pcSaveDoc(d, { type:'payroll', typeLabel: DOC_TYPES.payroll.label, group:'other', party:'เงินเดือน ' + monthLabel(prForm.ym, true), date: dt, docNo: (d && d.docNo) || nextDocNo('payroll', dt), items: items, total: prSum(items, 'gross'), subtotal: prSum(items, 'gross'), net: prSum(items, 'net'),
      extra: Object.assign({}, d && d.extra, { period: prForm.ym, payFrom: byId('prFrom').value, salaryAcc: cfg.salaryAcc, ssoExpAcc: cfg.ssoExpAcc, ssoPayAcc: cfg.ssoPayAcc }) });
    pageState.prYm = prForm.ym; closeModal(); showToast('บันทึกรอบเงินเดือน ' + monthLabel(prForm.ym, true) + ' แล้ว'); refreshPageData();
  } catch (e) { btn.disabled = false; pcErr('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e)); }
}
function openPrRemit(p, doc) {
  if (!p || fbReadOnly()) return;
  var it = p.items || [], ex = (doc && doc.extra) || {}, wht = doc ? ex.wht : prSum(it, 'wht'), sso = doc ? ex.sso : prSum(it, 'sso') + prSum(it, 'ssoEr');
  openModal({ title:'นำส่งภาษีและประกันสังคม ' + monthLabel(p.extra.period, true), focus:false, body:
    '<div class="grid-2"><div class="field"><label for="prrDate">วันที่นำส่ง</label><input id="prrDate" type="date" value="' + esc((doc && doc.date) || todayStr()) + '"></div><div class="field"><label for="prrFrom">จ่ายจากบัญชี</label><select id="prrFrom">' + pcOpts(pcPayAccs(), ex.fromAcc || p.extra.payFrom || SYS.bank) + '</select></div></div>' +
    '<div class="grid-2"><div class="field"><label for="prrWht">ภาษีหัก ณ ที่จ่าย ภ.ง.ด.1</label><input id="prrWht" type="number" step="0.01" min="0" value="' + wht + '"></div><div class="field"><label for="prrSso">ประกันสังคม สปส.1-10 (ลูกจ้าง + นายจ้าง)</label><input id="prrSso" type="number" step="0.01" min="0" value="' + sso + '"></div></div><div class="form-error" id="formError" hidden></div>',
    buttons:[CANCEL_BTN, { label:'บันทึก', cls:'btn-dark', onClick: async function(btn) {
      var dt = byId('prrDate').value, w = round2(Number(byId('prrWht').value) || 0), s = round2(Number(byId('prrSso').value) || 0);
      if (![w, s].every(function(v) { return Number.isFinite(v) && v >= 0; })) return pcErr('ยอดนำส่งภาษีและประกันสังคมต้องเป็นตัวเลขตั้งแต่ศูนย์');
      if (!(w + s > 0)) return pcErr('ระบุยอดที่นำส่ง');
      if (dt < p.date) return pcErr('วันที่นำส่งต้องไม่ก่อนวันที่จ่ายเงินเดือน');
      if (pcDateErr(dt) || (doc && pcDateErr(doc.date))) return pcErr(pcDateErr(dt) || pcDateErr(doc.date));
      btn.disabled = true;
      try {
        await pcSaveDoc(doc, { type:'payrollRemit', typeLabel: DOC_TYPES.payrollRemit.label, group:'other', party:'นำส่ง ภ.ง.ด.1 / ประกันสังคม ' + monthLabel(p.extra.period, true), date: dt, docNo: (doc && doc.docNo) || nextDocNo('payrollRemit', dt), total: round2(w + s), subtotal: round2(w + s), net: round2(w + s), extra: { payrollId: p._id, wht: w, sso: s, fromAcc: byId('prrFrom').value, ssoPayAcc: p.extra.ssoPayAcc } });
        closeModal(); showToast('บันทึกการนำส่งแล้ว'); refreshPageData();
      } catch (e) { btn.disabled = false; pcErr('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e)); }
    } }] });
}
function openPayslip(id, i) {
  var d = findDoc(id), x = d && (d.items || [])[i]; if (!x) return;
  var cs = companySettings(), row = function(a, b) { return '<tr><td>' + a + '</td><td style="text-align:right">' + b + '</td></tr>'; };
  var html = '<div class="pf-paper ps-paper"><div class="ps-head"><div><b style="font-size:18px">' + esc(cs.legalName || companyName()) + '</b><div>' + esc(cs.legalAddress || cs.address || '') + '</div></div><div style="text-align:right"><b style="font-size:18px">สลิปเงินเดือน</b><div>PAYSLIP</div></div></div>' +
    '<table class="ps-info"><tr><td>ชื่อพนักงาน</td><td><b>' + esc(x.name) + '</b></td><td>ประจำเดือน</td><td><b>' + esc(monthLabel(d.extra.period, true)) + '</b></td></tr><tr><td>ตำแหน่ง</td><td>' + esc(x.position || '-') + '</td><td>วันที่จ่าย</td><td>' + fmtDateNum(d.date) + '</td></tr><tr><td>เลขประจำตัวผู้เสียภาษี</td><td>' + esc(x.taxId || '-') + '</td><td>บัญชีรับเงิน</td><td>' + esc(x.bankAcct || '-') + '</td></tr></table>' +
    '<div class="ps-cols"><table class="ps-t"><thead><tr><th>รายได้</th><th style="text-align:right">จำนวนเงิน</th></tr></thead><tbody>' + row('เงินเดือน/ค่าจ้าง', fmtMoney(x.base)) + (x.extra ? row('รายได้อื่น', fmtMoney(x.extra)) : '') + (x.deduct ? row('หักขาด/ลา', '−' + fmtMoney(x.deduct)) : '') + '</tbody><tfoot><tr><td>รวมรายได้</td><td style="text-align:right">' + fmtMoney(x.gross) + '</td></tr></tfoot></table>' +
    '<table class="ps-t"><thead><tr><th>รายการหัก</th><th style="text-align:right">จำนวนเงิน</th></tr></thead><tbody>' + row('ประกันสังคม', fmtMoney(x.sso)) + row('ภาษีหัก ณ ที่จ่าย', fmtMoney(x.wht)) + '</tbody><tfoot><tr><td>รวมรายการหัก</td><td style="text-align:right">' + fmtMoney(round2(x.sso + x.wht)) + '</td></tr></tfoot></table></div>' +
    '<div class="ps-net">เงินได้สุทธิ <b>' + fmtMoney(x.net) + '</b><div class="small">' + esc(typeof bahtText === 'function' ? bahtText(x.net) : '') + '</div></div>' +
    '<div class="ps-sign"><div>ผู้จ่ายเงิน<br><br>........................................</div><div>ผู้รับเงิน<br><br>........................................</div></div></div>';
  openPrintViewer({ typeLabel:'สลิปเงินเดือน', docNo: x.name + ' ' + monthLabel(d.extra.period, true), type:'payslip' }, html, 'สลิปเงินเดือน-' + x.name + '-' + d.extra.period + '.pdf');
}
async function prExport(id) {
  var d = findDoc(id); if (!d) return;
  var rows = [['ชื่อพนักงาน', 'เลขประจำตัวผู้เสียภาษี', 'บัญชีรับเงิน', 'เงินเดือน', 'รายได้อื่น', 'หักขาด/ลา', 'รวมรายได้', 'ประกันสังคม', 'ภาษีหัก ณ ที่จ่าย', 'สุทธิ']].concat((d.items || []).map(function(x) { return [x.name, x.taxId, x.bankAcct, x.base, x.extra, x.deduct, x.gross, x.sso, x.wht, x.net]; }));
  try { await (await getSaver()).save({ filename: 'เงินเดือน-' + d.extra.period + '.csv', data: toCsv(rows) }); } catch (e) { if (!e || e.code !== 'declined') showToast('ส่งออกไม่สำเร็จ ลองอีกครั้ง'); }
}

/* ข้อมูลประกอบ ภ.ง.ด.1 ใช้เดือนที่จ่ายเงินจริง ไม่ใช้เดือนทำงาน และไม่ใช่ไฟล์นำเข้า e-Filing */
function prPnd1Rows(ym) {
  var rows = [];
  STORE.documents.filter(function(d) { return d.type === 'payroll' && !d.voided && String(d.date || '').slice(0, 7) === ym; })
    .sort(function(a, b) { return String(a.date).localeCompare(String(b.date)) || String(a.docNo || '').localeCompare(String(b.docNo || '')); })
    .forEach(function(d) { (d.items || []).forEach(function(x) { rows.push({ date: d.date, docNo: d.docNo || '', name: x.name || '', taxId: x.taxId || '', gross: Number(x.gross) || 0, wht: Number(x.wht) || 0 }); }); });
  return rows;
}
function openPrPnd1(ym) {
  ym = ym || pageState.prYm || todayStr().slice(0, 7);
  var rows = prPnd1Rows(ym);
  openModal({ title: 'สรุปข้อมูลประกอบ ภ.ง.ด.1', full: true, body:
    '<div class="field"><label for="prPndYm">เดือนที่จ่ายเงิน</label><input id="prPndYm" type="month" value="' + esc(ym) + '" onchange="openPrPnd1(this.value)"></div>' +
    '<p>เงินเดือน/ค่าจ้าง ตามมาตรา 40(1) · แสดงทุกรายการ รวมผู้ที่ไม่มีภาษีหัก</p>' +
    '<div class="table-wrap"><table class="data-table" id="prPndTable"><thead><tr><th>วันที่จ่าย</th><th>เอกสาร</th><th>ชื่อผู้มีเงินได้</th><th>เลขผู้เสียภาษี</th><th class="r">เงินได้ที่จ่าย</th><th class="r">ภาษีที่หัก</th></tr></thead><tbody>' +
    rows.map(function(x) { return '<tr><td>' + fmtDateNum(x.date) + '</td><td>' + esc(x.docNo) + '</td><td>' + esc(x.name) + '</td><td>' + esc(x.taxId || 'ยังไม่ระบุ') + '</td><td class="r">' + fmtMoney(x.gross) + '</td><td class="r">' + fmtMoney(x.wht) + '</td></tr>'; }).join('') +
    '</tbody><tfoot><tr><td colspan="4">รวม ' + rows.length + ' รายการ</td><td class="r">' + fmtMoney(prSum(rows, 'gross')) + '</td><td class="r">' + fmtMoney(prSum(rows, 'wht')) + '</td></tr></tfoot></table></div>' +
    (rows.some(function(x) { return !/^\d{13}$/.test(String(x.taxId).replace(/[-\s]/g, '')); }) ? '<div class="banner warn">มีเลขผู้เสียภาษีไม่ครบ 13 หลัก ตรวจสอบข้อมูลพนักงานและรอบเงินเดือนก่อนจัดทำแบบ</div>' : '') +
    '<p class="small muted">ใช้ตรวจสอบและประกอบการจัดทำแบบ ภ.ง.ด.1 เท่านั้น CSV นี้ไม่ใช่รูปแบบสำหรับนำเข้า e-Filing และไม่ได้ยื่นภาษีให้อัตโนมัติ</p>',
    buttons: [{ label:'ส่งออก CSV', cls:'btn-dark', onClick: function() { return prExportPnd1(ym); } }, { label:'ปิด', onClick:closeModal }] });
}
async function prExportPnd1(ym) {
  var rows = [['วันที่จ่าย','เลขที่เอกสาร','ชื่อผู้มีเงินได้','เลขประจำตัวผู้เสียภาษี','ประเภทเงินได้','เงินได้ที่จ่าย','ภาษีที่หัก','เงื่อนไขการหัก']].concat(prPnd1Rows(ym).map(function(x) { return [x.date, x.docNo, x.name, x.taxId, '40(1)', x.gross, x.wht, 'หัก ณ ที่จ่าย']; }));
  try { await (await getSaver()).save({ filename:'สรุป-ภงด1-' + ym + '.csv', data:toCsv(rows) }); }
  catch (e) { if (!e || e.code !== 'declined') showToast('ส่งออกไม่สำเร็จ ลองอีกครั้ง'); }
}
