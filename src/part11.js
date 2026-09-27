
/* ================= Month-end close checklist (accounting:monthClose) ================= */
var mc = { ym: addMonths(todayStr().slice(0, 7), -1), open: {} };
function closeDoc(ym) { return STORE.settings.find(function(s) { return s._id === 'close_' + ym; }) || { done:{}, notes:{} }; }
function lockDate() { return companySettings().lockDate || ''; }
function balAt(code, end) { var b = balancesAt(end)[code] || { dr:0, cr:0 }; return round2(b.dr - b.cr); }
function linesIn(code, ym) { return allLines().filter(function(l) { return l.code === code && (l.date || '').slice(0, 7) === ym; }); }
function sumLines(ls, side) { return round2(ls.reduce(function(s, l) { return s + l[side]; }, 0)); }
function docsAsOf(end) { return STORE.documents.filter(function(d) { return (d.date || '') <= end; }); }
function openBalAsOf(d, end) {
  var tot = Number(d.total) || 0;
  var paid = (d.payments || []).filter(function(p) { return (p.date || '') <= end; }).reduce(function(s, p) { return s + (Number(p.amount) || 0) + (Number(p.wht) || 0) + (Number(p.fee) || 0); }, 0);
  if (d.status === 'paid' && !(d.payments && d.payments.length)) return (d.paidDate || d.date) <= end ? 0 : tot;
  return round2(tot - paid);
}
// each check → {id, group, title, how, status:'ok'|'warn'|'bad'|'manual', detail, action:[label, js]}
function closeChecks(ym) {
  var end = monthEnd(ym), start = ym + '-01', out = [];
  var push = function(o) { out.push(o); };
  var M = fmtMoney;
  // --- Cash & bank
  bankAccList().forEach(function(a) {
    var h = (reconDoc(a.code).history || []).slice(-1)[0], ok = h && h.end >= end, bal = balAt(a.code, end);
    push({ id:'bank_' + a.code, group:'เงินสดและธนาคาร', title:'กระทบยอด ' + a.code + ' ' + a.name, how:'เทียบใบแจ้งยอดธนาคาร ณ สิ้นเดือนกับยอดในระบบ ติ๊กรายการให้ส่วนต่างเป็น 0',
      status: ok ? 'ok' : (Math.abs(bal) < 0.005 && !linesIn(a.code, ym).length ? 'ok' : 'bad'), detail:'ยอดตามบัญชี ณ ' + fmtDateNum(end) + ' ' + M(bal) + ' · ' + (h ? 'กระทบล่าสุดถึง ' + fmtDateNum(h.end) : 'ยังไม่เคยกระทบยอด'),
      action:['ไปกระทบยอด', "rec.acc='" + a.code + "';rec.stage='start';rec.end='" + end + "';go('accounting','reconcile')"] });
    if (bal < -0.005) push({ id:'neg_' + a.code, group:'เงินสดและธนาคาร', title:'ยอดติดลบ ' + a.name, how:'บัญชีเงินสด/ธนาคารไม่ควรติดลบ ตรวจรายการจ่ายที่ลงผิดบัญชีหรือรายการรับที่ยังไม่ได้บันทึก', status:'bad', detail:'ยอด ' + M(bal), action:['ดูรายการ', "pageState.bankSel='" + a.code + "';go('accounting','bankTx')"] });
  });
  // --- AR
  var arSub = round2(docsAsOf(end).reduce(function(s, d) { return s + (d.type === 'invoice' ? openBalAsOf(d, end) : d.type === 'creditNote' ? -(Number(d.total) || 0) : d.type === 'payment' ? -(Number(d.total) || 0) : 0); }, 0)), arGL = balAt(SYS.ar, end);
  var arDiff = round2(arGL - arSub);
  push({ id:'ar', group:'ลูกหนี้และเจ้าหนี้', title:'กระทบยอดลูกหนี้การค้า (1130) กับรายตัวลูกหนี้', how:'ยอดบัญชีคุมลูกหนี้ต้องเท่ากับผลรวมใบแจ้งหนี้คงค้างรายตัว ถ้าไม่เท่า มักเกิดจากสมุดรายวันที่ลงบัญชีลูกหนี้ตรง ๆ หรือใบลดหนี้ที่ยังไม่ได้ตัด',
    status: Math.abs(arDiff) < 0.01 ? 'ok' : 'bad', detail:'บัญชีคุม ' + M(arGL) + ' · รายตัว ' + M(arSub) + (Math.abs(arDiff) >= 0.01 ? ' · ต่าง ' + M(arDiff) : ''), action:['ลูกหนี้สรุปอายุ', "openReport('arSum')"] });
  var overdue = STORE.documents.filter(function(d) { return d.type === 'invoice' && openBalAsOf(d, end) > 0 && d.extra && d.extra.dueDate && d.extra.dueDate < end; });
  push({ id:'arAging', group:'ลูกหนี้และเจ้าหนี้', title:'ติดตามลูกหนี้เกินกำหนด และพิจารณาหนี้สงสัยจะสูญ', how:'ทบทวนรายงานอายุลูกหนี้ ส่งใบแจ้งวางบิล/ทวงถาม และตั้งค่าเผื่อหนี้สงสัยจะสูญถ้าจำเป็น',
    status: overdue.length ? 'warn' : 'ok', detail: overdue.length ? overdue.length + ' ใบเกินกำหนด รวม ' + M(overdue.reduce(function(s, d) { return s + openBalAsOf(d, end); }, 0)) : 'ไม่มีใบแจ้งหนี้เกินกำหนด', action:['รายละเอียดลูกหนี้', "openReport('arDetail')"] });
  var apSub = round2(docsAsOf(end).reduce(function(s, d) { return s + (d.type === 'bill' ? openBalAsOf(d, end) : d.type === 'vendorCredit' ? -(Number(d.total) || 0) : 0); }, 0)), apGL = round2(-balAt(SYS.ap, end)), apDiff = round2(apGL - apSub);
  push({ id:'ap', group:'ลูกหนี้และเจ้าหนี้', title:'กระทบยอดเจ้าหนี้การค้า (2110) กับรายตัวเจ้าหนี้', how:'ยอดบัญชีคุมเจ้าหนี้ต้องเท่ากับผลรวมบิลค้างจ่ายรายตัว และตรงกับใบแจ้งยอดจากผู้ขาย',
    status: Math.abs(apDiff) < 0.01 ? 'ok' : 'bad', detail:'บัญชีคุม ' + M(apGL) + ' · รายตัว ' + M(apSub) + (Math.abs(apDiff) >= 0.01 ? ' · ต่าง ' + M(apDiff) : ''), action:['เจ้าหนี้สรุปอายุ', "openReport('apSum')"] });
  // --- Tax
  var v = vatSummary(ym), glOut = round2(sumLines(linesIn(SYS.vatOut, ym), 'cr') - sumLines(linesIn(SYS.vatOut, ym), 'dr')), glIn = round2(sumLines(linesIn(SYS.vatIn, ym), 'dr') - sumLines(linesIn(SYS.vatIn, ym), 'cr'));
  var vOk = Math.abs(glOut - v.out) < 0.01 && Math.abs(glIn - v.inp) < 0.01;
  push({ id:'vat', group:'ภาษี', title:'กระทบยอดภาษีขาย/ภาษีซื้อ กับรายงานภาษี (ภ.พ.30)', how:'ภาษีขาย (2120) และภาษีซื้อ (1150) ที่เกิดในเดือน ต้องตรงกับรายงานภาษีขาย/ซื้อ ตรวจใบกำกับภาษีครบและถูกเดือน',
    status: vOk ? 'ok' : 'bad', detail:'ภาษีขาย บัญชี ' + M(glOut) + ' / รายงาน ' + M(v.out) + ' · ภาษีซื้อ บัญชี ' + M(glIn) + ' / รายงาน ' + M(v.inp), action:['รายงานภาษีรายเดือน', "go('tax','monthly')"] });
  push({ id:'pp30', group:'ภาษี', title:'ยื่นและชำระ ภ.พ.30 (ภายในวันที่ 15 เดือนถัดไป / e-Filing 23)', how:'ภาษีที่ต้องชำระ = ภาษีขาย − ภาษีซื้อ บันทึกการยื่นและชำระในเมนูภาษี',
    status: v.ret && v.ret.filedDate ? (v.bal > 0 ? 'warn' : 'ok') : (v.n ? 'bad' : 'ok'), detail: (v.ret && v.ret.filedDate ? 'ยื่นแล้ว ' + fmtDateNum(v.ret.filedDate) + (v.bal > 0 ? ' · ค้างชำระ ' + M(v.bal) : '') : (v.n ? 'ยังไม่ได้ยื่น · ต้องชำระ ' + M(Math.max(v.due, 0)) : 'ไม่มีรายการ VAT ในเดือนนี้')), action:['ไปที่ภาษี', "go('tax','overview')"] });
  var pendOut = balAt(SYS.vatOutPend, end), pendIn = balAt(SYS.vatInPend, end);
  push({ id:'vatPend', group:'ภาษี', title:'ทบทวนภาษีขาย/ซื้อรอเรียกเก็บ (2125 / 1155)', how:'ค่าบริการรับรู้ภาษีเมื่อรับ/จ่ายเงิน ยอดคงค้างต้องเท่ากับ VAT ของใบแจ้งหนี้/บิลค่าบริการที่ยังไม่ชำระ',
    status:'manual', detail:'ภาษีขายรอเรียกเก็บ ' + M(-pendOut) + ' · ภาษีซื้อรอเรียกเก็บ ' + M(pendIn), action:['ดูบัญชีแยกประเภท', "openReport('gl')"] });
  var whtL = linesIn(SYS.whtPay, ym), whtM = round2(sumLines(whtL, 'cr') - sumLines(whtL, 'dr'));
  push({ id:'wht', group:'ภาษี', title:'นำส่งภาษีหัก ณ ที่จ่าย ภ.ง.ด.3 / ภ.ง.ด.53 (ภายในวันที่ 7 / e-Filing 15)', how:'ยอดหัก ณ ที่จ่ายเดือนนี้ในบัญชี 2130 ต้องตรงกับหนังสือรับรอง 50 ทวิที่ออก และนำส่งแล้วล้างบัญชีด้วยสมุดรายวัน',
    status: whtM > 0 ? 'manual' : 'ok', detail:'หัก ณ ที่จ่ายเดือนนี้ ' + M(whtM) + ' · ยอดค้างนำส่ง ณ สิ้นเดือน ' + M(-balAt(SYS.whtPay, end)), action:['สมุดรายวัน', "openDocForm('journalEntry')"] });
  push({ id:'sso', group:'ภาษี', title:'เงินเดือน ภ.ง.ด.1 และประกันสังคม (สปส.1-10)', how:'บันทึกค่าจ้าง ภาษีหัก ณ ที่จ่ายพนักงาน และเงินสมทบประกันสังคม นำส่งภายในวันที่ 7 และ 15 ของเดือนถัดไป', status:'manual', detail:'ตรวจด้วยตนเอง', action:['สมุดรายวัน', "openDocForm('journalEntry')"] });
  // --- Accruals / adjustments
  var hasDep = STORE.documents.some(function(d) { return d.type === 'journalEntry' && (d.date || '').slice(0, 7) === ym && (d.items || []).some(function(r) { return /^1220|ค่าเสื่อม/.test(String(r.account)); }); });
  var hasFA = balAt('1210', end) > 0;
  push({ id:'dep', group:'รายการปรับปรุง', title:'บันทึกค่าเสื่อมราคาประจำเดือน', how:'Dr ค่าเสื่อมราคา / Cr ค่าเสื่อมราคาสะสม (1220) ตามทะเบียนทรัพย์สิน', status: !hasFA ? 'ok' : hasDep ? 'ok' : 'bad', detail: !hasFA ? 'ไม่มีสินทรัพย์ถาวร' : hasDep ? 'พบรายการค่าเสื่อมในเดือนนี้' : 'ยังไม่พบรายการค่าเสื่อมเดือนนี้', action:['บันทึกสมุดรายวัน', "openDocForm('journalEntry')"] });
  push({ id:'accrual', group:'รายการปรับปรุง', title:'ตั้งค่าใช้จ่ายค้างจ่าย / รายได้ค้างรับ', how:'ค่าน้ำ ค่าไฟ ค่าบริการ ดอกเบี้ย ที่เกิดแล้วแต่ยังไม่ได้รับบิล ให้ตั้งค้างจ่าย และกลับรายการต้นเดือนถัดไป', status:'manual', detail:'ตรวจด้วยตนเอง', action:['บันทึกสมุดรายวัน', "openDocForm('journalEntry')"] });
  push({ id:'prepaid', group:'รายการปรับปรุง', title:'ตัดจ่ายค่าใช้จ่ายล่วงหน้า / รายได้รับล่วงหน้า', how:'เบี้ยประกัน ค่าเช่าล่วงหน้า ค่าบริการรายปี ให้ตัดเป็นค่าใช้จ่ายของเดือนนี้', status:'manual', detail:'ตรวจด้วยตนเอง', action:['บันทึกสมุดรายวัน', "openDocForm('journalEntry')"] });
  var stockVal = round2(STORE.products.filter(function(p) { return p.kind !== 'service'; }).reduce(function(s, p) { return s + productStock(p) * (Number(p.cost) || 0); }, 0)), invGL = balAt(SYS.inv, end);
  push({ id:'inv', group:'รายการปรับปรุง', title:'ตรวจนับและกระทบยอดสินค้าคงเหลือ (1140)', how:'มูลค่าสต็อกตามทะเบียนสินค้า (จำนวน × ต้นทุน) ต้องเท่ากับบัญชีสินค้าคงเหลือ ปรับปรุงผลต่างเข้าต้นทุนขาย',
    status: !stockVal && !invGL ? 'ok' : Math.abs(stockVal - invGL) < 0.01 ? 'ok' : 'warn', detail:'ทะเบียนสินค้า ' + M(stockVal) + ' · บัญชี ' + M(invGL), action:['ใบงานตรวจนับสต็อก', 'openStockCount()'] });
  // --- Review
  var tb = accountBalances(), dr = 0, cr = 0; Object.keys(tb).forEach(function(k) { dr += tb[k].dr; cr += tb[k].cr; });
  push({ id:'tb', group:'ตรวจทานและปิดงวด', title:'งบทดลองสมดุล', how:'ผลรวมเดบิตต้องเท่ากับเครดิต', status: Math.abs(dr - cr) < 0.01 ? 'ok' : 'bad', detail:'เดบิต ' + M(round2(dr)) + ' · เครดิต ' + M(round2(cr)), action:['งบทดลอง', "openReport('tb')"] });
  var noAcc = STORE.documents.filter(function(d) { return (d.date || '').slice(0, 7) === ym && DOC_TYPES[d.type] && DOC_TYPES[d.type].flow && !(d.extra && (d.extra.account || d.extra.incomeCat || d.extra.expCategory)); });
  push({ id:'uncat', group:'ตรวจทานและปิดงวด', title:'รายการที่ยังไม่ระบุบัญชี', how:'เอกสารที่ไม่เลือกบัญชีจะลง 4110/5290 อัตโนมัติ ควรจัดหมวดหมู่ให้ถูกต้อง', status: noAcc.length ? 'warn' : 'ok', detail: noAcc.length ? noAcc.length + ' รายการ: ' + noAcc.slice(0, 4).map(function(d) { return d.docNo; }).join(', ') + (noAcc.length > 4 ? ' …' : '') : 'ทุกรายการระบุบัญชีแล้ว', action:['การจัดหมวดหมู่', "go('billing','expenseTx')"] });
  var misc = round2(sumLines(linesIn('5290', ym), 'dr') - sumLines(linesIn('5290', ym), 'cr'));
  push({ id:'suspense', group:'ตรวจทานและปิดงวด', title:'ทบทวนบัญชีพัก / ค่าใช้จ่ายเบ็ดเตล็ด', how:'ยอดใน 5290 ค่าใช้จ่ายเบ็ดเตล็ด ควรย้ายไปบัญชีที่เหมาะสม ไม่ควรมียอดสูงผิดปกติ', status: misc > 0 ? 'warn' : 'ok', detail:'5290 เดือนนี้ ' + M(misc), action:['บัญชีแยกประเภท', "openReport('gl')"] });
  push({ id:'pl', group:'ตรวจทานและปิดงวด', title:'วิเคราะห์งบกำไรขาดทุนเทียบเดือนก่อน', how:'ดูรายได้/ค่าใช้จ่ายที่เปลี่ยนแปลงผิดปกติ หาสาเหตุ และแก้ไขรายการที่ลงผิด', status:'manual', detail:'ตรวจด้วยตนเอง', action:['งบกำไรขาดทุน', "pageState.repPeriod='custom';pageState.pFrom='" + start + "';pageState.pTo='" + end + "';openReport('pl')"] });
  push({ id:'bs', group:'ตรวจทานและปิดงวด', title:'ทบทวนงบดุล ทุกบัญชีมีเอกสารประกอบยอด', how:'ทุกบัญชีสินทรัพย์/หนี้สินควรมีรายละเอียดรองรับ (ใบแจ้งยอด, ทะเบียน, รายงานอายุ)', status:'manual', detail:'ตรวจด้วยตนเอง', action:['งบดุล', "pageState.repPeriod='custom';pageState.pFrom='0000-01-01';pageState.pTo='" + end + "';openReport('bs')"] });
  var locked = lockDate() >= end;
  push({ id:'lock', group:'ตรวจทานและปิดงวด', title:'ปิดงวด (ล็อกข้อมูลถึงสิ้นเดือน)', how:'เมื่อทุกข้อเรียบร้อย ล็อกงวดเพื่อป้องกันการแก้ไขหรือเพิ่มรายการย้อนหลัง', status: locked ? 'ok' : 'bad', detail: lockDate() ? 'ล็อกถึง ' + fmtDateNum(lockDate()) : 'ยังไม่ได้ล็อกงวด', action: locked ? (canEditLegal() ? ['ปลดล็อก', 'unlockPeriod()'] : null) : ['ล็อกงวดนี้', "lockPeriod('" + end + "')"] });
  if (locked && !canEditLegal()) out[out.length - 1].detail += ' · ปลดล็อกได้เฉพาะเจ้าของบริษัท';
  return out;
}
var MC_ST = { ok:['✓','เรียบร้อย','mc-ok'], warn:['!','ควรตรวจ','mc-warn'], bad:['✕','ต้องทำ','mc-bad'], manual:['○','ตรวจเอง','mc-man'] };
function monthCloseShell() {
  return '<div class="coa-bar"><div><h1 class="section-title" style="margin:0">ปิดงบรายเดือน</h1><p class="section-sub">รายการกระทบยอดและตรวจสอบที่นักบัญชีควรทำทุกเดือนก่อนปิดงวด ระบบตรวจให้อัตโนมัติเท่าที่ทำได้</p></div>' +
    '<div class="coa-actions"><label class="date-chip">งวด: <input type="month" id="mcYm" value="' + mc.ym + '"></label></div></div>';
}
function monthCloseData() {
  var ym = mc.ym, cd = closeDoc(ym), checks = closeChecks(ym);
  checks.forEach(function(c) { if (cd.done && cd.done[c.id]) c.userDone = true; });
  var isDone = function(c) { return c.status === 'ok' || c.userDone; };
  var n = checks.filter(isDone).length, pct = Math.round(n / checks.length * 100);
  var groups = []; checks.forEach(function(c) { var g = groups.find(function(x) { return x[0] === c.group; }); if (!g) groups.push(g = [c.group, []]); g[1].push(c); });
  return '<div class="mc-top"><div class="mc-prog"><div class="mc-prog-lbl"><b>' + n + ' / ' + checks.length + '</b> รายการเรียบร้อย · งวด ' + fmtMonthTh(ym) + '</div><div class="mc-bar"><span style="width:' + pct + '%"></span></div></div>' +
    '<div class="mc-legend">' + ['bad','warn','manual','ok'].map(function(k) { return '<span class="mc-chip ' + MC_ST[k][2] + '">' + MC_ST[k][0] + ' ' + MC_ST[k][1] + '</span>'; }).join('') + '</div></div>' +
    groups.map(function(g) {
      return '<div class="page-block mc-group"><h2>' + esc(g[0]) + '</h2>' + g[1].map(function(c) {
        var st = c.userDone && c.status !== 'ok' ? ['✓','ทำแล้ว','mc-ok'] : MC_ST[c.status];
        var note = (cd.notes || {})[c.id] || '';
        return '<div class="mc-item"><span class="mc-ic ' + st[2] + '" title="' + st[1] + '">' + st[0] + '</span><div class="mc-body"><div class="mc-title">' + esc(c.title) + '</div><div class="mc-detail">' + esc(c.detail) + '</div>' +
          '<details' + (mc.open[c.id] ? ' open' : '') + ' data-mcopen="' + c.id + '"><summary>วิธีตรวจ / บันทึก</summary><p class="small muted">' + esc(c.how) + '</p><input class="mc-note" data-mcnote="' + c.id + '" value="' + esc(note) + '" placeholder="หมายเหตุ / เลขอ้างอิงเอกสารประกอบ"></details></div>' +
          '<div class="mc-act">' + (c.action ? '<button type="button" class="btn btn-outline btn-sm" data-mcgo="' + esc(c.action[1]) + '">' + esc(c.action[0]) + '</button>' : '') +
          (c.status !== 'ok' ? '<label class="mc-tick"><input type="checkbox" data-mcdone="' + c.id + '"' + (c.userDone ? ' checked' : '') + '> ทำแล้ว</label>' : '') + '</div></div>';
      }).join('') + '</div>';
    }).join('');
}
function fmtMonthTh(ym) { var m = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][Number(ym.slice(5, 7)) - 1]; return m + ' ' + (Number(ym.slice(0, 4)) + 543); }
function bindMonthClose() {
  var y = byId('mcYm'); if (y && !y._b) { y._b = 1; y.onchange = function() { if (y.value) { mc.ym = y.value; refreshPageData(); } }; }
  var c = byId('pageData'); if (!c) return;
  c.querySelectorAll('[data-mcgo]').forEach(function(b) { b.onclick = function() { try { (new Function(b.dataset.mcgo))(); } catch (e) { showToast('เปิดไม่สำเร็จ'); } }; });
  c.querySelectorAll('[data-mcdone]').forEach(function(cb) { cb.onchange = async function() { var d = Object.assign({}, closeDoc(mc.ym).done || {}); d[cb.dataset.mcdone] = cb.checked; await saveSettings('close_' + mc.ym, { done: d }); refreshPageData(); }; });
  c.querySelectorAll('[data-mcopen]').forEach(function(el) { el.addEventListener('toggle', function() { mc.open[el.dataset.mcopen] = el.open; }); });
  c.querySelectorAll('[data-mcnote]').forEach(function(inp) { inp.onchange = async function() { var n = Object.assign({}, closeDoc(mc.ym).notes || {}); n[inp.dataset.mcnote] = inp.value.trim(); await saveSettings('close_' + mc.ym, { notes: n }); }; });
}
// ผู้แก้ไขล็อกงวดได้ ปลดล็อกได้เฉพาะเจ้าของ; โหมด Firebase บันทึก audit ทุกครั้ง (บังคับใน firestore.rules)
async function setLockDate(to, action) {
  if (FB_MODE) return fbSetLockDate(to, action);
  await saveSettings('company', { lockDate: to });
}
async function lockPeriod(end) {
  try { await setLockDate(end, 'period_lock'); showToast('ล็อกงวดถึง ' + fmtDateNum(end) + ' แล้ว'); } catch (e) { showToast(writeError(e)); }
  refreshPageData();
}
async function unlockPeriod() {
  if (!canEditLegal()) { showToast('ปลดล็อกงวดได้เฉพาะเจ้าของบริษัท'); return; }
  try { await setLockDate('', 'period_unlock'); showToast('ปลดล็อกงวดแล้ว'); } catch (e) { showToast(writeError(e)); }
  refreshPageData();
}
