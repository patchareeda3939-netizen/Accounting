/* ================= หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) ================= */
var WT_INCOME = [
  ['1','1. เงินเดือน ค่าจ้าง เบี้ยเลี้ยง โบนัส ฯลฯ ตามมาตรา 40 (1)'],
  ['2','2. ค่าธรรมเนียม ค่านายหน้า ฯลฯ ตามมาตรา 40 (2)'],
  ['3','3. ค่าแห่งลิขสิทธิ์ ฯลฯ ตามมาตรา 40 (3)'],
  ['4a','4. (ก) ดอกเบี้ย ฯลฯ ตามมาตรา 40 (4) (ก)'],
  ['4b','(ข) เงินปันผล เงินส่วนแบ่งกำไร ฯลฯ ตามมาตรา 40 (4) (ข)'],
  ['4b1','(1) กรณีผู้ได้รับเงินปันผลได้รับเครดิตภาษี โดยจ่ายจากกำไรสุทธิของกิจการที่ต้องเสียภาษีเงินได้นิติบุคคลในอัตราดังนี้', 2],
  ['4b11','(1.1) อัตราร้อยละ 30 ของกำไรสุทธิ', 3],['4b12','(1.2) อัตราร้อยละ 25 ของกำไรสุทธิ', 3],['4b13','(1.3) อัตราร้อยละ 20 ของกำไรสุทธิ', 3],['4b14','(1.4) อัตราอื่น ๆ (ระบุ) ........ ของกำไรสุทธิ', 3],
  ['4b2','(2) กรณีผู้ได้รับเงินปันผลไม่ได้รับเครดิตภาษี เนื่องจากจ่ายจาก', 2],
  ['4b21','(2.1) กำไรสุทธิของกิจการที่ได้รับยกเว้นภาษีเงินได้นิติบุคคล', 3],['4b22','(2.2) เงินปันผลหรือเงินส่วนแบ่งของกำไรที่ได้รับยกเว้นไม่ต้องนำมารวมคำนวณเป็นรายได้เพื่อเสียภาษีเงินได้นิติบุคคล', 3],['4b23','(2.3) กำไรสุทธิส่วนที่ได้หักผลขาดทุนสุทธิยกมาไม่เกิน 5 ปี ก่อนรอบระยะเวลาบัญชีปีปัจจุบัน', 3],['4b24','(2.4) กำไรที่รับรู้ทางบัญชีโดยวิธีส่วนได้เสีย (equity method)', 3],['4b25','(2.5) อื่น ๆ (ระบุ)', 3],
  ['5','5. การจ่ายเงินได้ที่ต้องหักภาษี ณ ที่จ่าย ตามคำสั่งกรมสรรพากรที่ออกตามมาตรา 3 เตรส เช่น รางวัล ส่วนลดหรือประโยชน์ใด ๆ เนื่องจากการส่งเสริมการขาย รางวัลในการประกวด การแข่งขัน การชิงโชค ค่าแสดงของนักแสดงสาธารณะ ค่าจ้างทำของ ค่าโฆษณา ค่าเช่า ค่าขนส่ง ค่าบริการ ค่าเบี้ยประกันวินาศภัย ฯลฯ'],
  ['6','6. อื่น ๆ (ระบุ)']
];
var WT_COPIES = [['ฉบับที่ 1','(สำหรับผู้ถูกหักภาษี ณ ที่จ่าย ใช้แนบแบบแสดงรายการภาษี)'],['ฉบับที่ 2','(สำหรับผู้ถูกหักภาษี ณ ที่จ่าย เก็บไว้เป็นหลักฐาน)'],['ฉบับที่ 3','(สำหรับผู้มีหน้าที่หักภาษี ณ ที่จ่าย ใช้แนบแบบแสดงรายการภาษี)'],['ฉบับที่ 4','(สำหรับผู้มีหน้าที่หักภาษี ณ ที่จ่าย เก็บไว้เป็นหลักฐาน)']];
function renderWhtSet(c, st) {
  var list = [1];
  return list.map(function(n) { return renderWht(c, { copy: n, cfg: st.cfg }); }).join('');
}
function thDate(iso) { if (!iso) return ''; var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + (Number(p[0]) + 543); }
function whtCerts() {
  var out = [];
  STORE.documents.forEach(function(d) {
    if (d.group !== 'supplier' || d.voided) return;
    var rate = Number(d.whtRate) || 0, sub = Number(d.subtotal) || 0;
    if ((d.type === 'expense' || d.type === 'checkPayment') && Number(d.wht) > 0) out.push({ d: d, idx: -1, date: d.date, base: sub, wht: Number(d.wht), rate: rate });
    (d.payments || []).forEach(function(p, i) {
      if (!(Number(p.wht) > 0)) return;
      var base = rate ? round2(Number(p.wht) * 100 / rate) : round2(sub * (Number(p.amount) + Number(p.wht)) / (Number(d.total) || 1));
      out.push({ d: d, idx: i, date: p.date, base: base, wht: Number(p.wht), rate: rate });
    });
  });
  out.sort(function(a, b) { return (a.date || '').localeCompare(b.date || '') || ((a.d.createdAt || 0) - (b.d.createdAt || 0)) || a.idx - b.idx; });
  // numbers are permanent once issued (saved); duplicates keep the earliest-saved, new ones continue the month's running number
  var used = {}, maxSeq = {};
  var saved = out.map(function(c) { var sv = ((c.d.extra || {}).wht50 || {})[String(c.idx)]; return { c: c, sv: sv }; })
    .filter(function(x) { return x.sv && x.sv.no; }).sort(function(a, b) { return (a.sv.savedAt || 0) - (b.sv.savedAt || 0); });
  saved.forEach(function(x) {
    var m = /^WT-(\d{6})-(\d+)$/.exec(x.sv.no); if (!m || used[x.sv.no]) return;
    used[x.sv.no] = 1; x.c.no = x.sv.no; x.c.seq = Number(m[2]); maxSeq[m[1]] = Math.max(maxSeq[m[1]] || 0, Number(m[2]));
  });
  out.forEach(function(c) {
    if (c.no) return;
    var ym = (c.date || '').slice(0, 7).replace('-', ''); maxSeq[ym] = (maxSeq[ym] || 0) + 1;
    c.seq = maxSeq[ym]; c.no = 'WT-' + ym + '-' + String(c.seq).padStart(3, '0');
  });
  return out;
}
function certsForDoc(d) { return whtCerts().filter(function(c) { return c.d._id === d._id; }); }
function tinBoxes(t) {
  var s = String(t || '').replace(/\D/g, '').padEnd(13, ' ').slice(0, 13).split(''), g = [1, 4, 5, 2, 1], h = '', k = 0;
  g.forEach(function(n, gi) { if (gi) h += '<i class="wt-dash">-</i>'; for (var j = 0; j < n; j++) h += '<b class="wt-box">' + esc(s[k++].trim()) + '</b>'; });
  return '<span class="wt-tin">' + h + '</span>';
}
function tin10() { var h = ''; [1,4,4,1].forEach(function(n, gi) { if (gi) h += '<i class="wt-dash">-</i>'; for (var j = 0; j < n; j++) h += '<b class="wt-box"></b>'; }); return '<span class="wt-tin">' + h + '</span>'; }
function ck(on) { return '<span class="wt-ck">' + (on ? '✓' : '') + '</span>'; }
function whtCfg(c) {
  var ex = c.d.extra || {}, sv = (ex.wht50 || {})[String(c.idx)] || {}, ct = STORE.contacts.find(function(x) { return x.name === c.d.party; }) || {};
  return { form: sv.form || ex.whtForm || (ct.entity === 'person' ? '3' : '53'), income: sv.income || ex.whtIncome || '5', payer: sv.payer || ex.whtPayer || '1', other: sv.other != null ? sv.other : (ex.whtOther || ''), saved: !!sv.savedAt };
}
function renderWht(c, opt) {
  opt = opt || {};
  var co = companySettings(), d = c.d, ex = d.extra || {};
  var ct = STORE.contacts.find(function(x) { return x.name === d.party; }) || {};
  var person = ct.entity === 'person', cfg = opt.cfg || whtCfg(c), form = cfg.form, inc = cfg.income;
  var fmt = function(n) { return (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var copy = opt.copy || 1, ci = coInfoFor(d), payerName = ci.name + ' (' + ci.branchName + ')';
  var rows = WT_INCOME.map(function(r) {
    var on = r[0] === inc;
    return '<tr' + (on ? ' class="wt-on"' : '') + '><td class="wt-desc" style="padding-left:' + (r[0] === '4b' ? 22 : r[2] ? 22 + r[2] * 16 : 6) + 'px">' + esc(r[1]) + (on && /ระบุ/.test(r[1]) ? ' <span class="wt-fill" style="min-width:160px">' + esc(cfg.other || '') + '</span>' : '') + '</td><td class="c">' + (on ? thDate(c.date) : '') + '</td><td class="r">' + (on ? fmt(c.base) : '') + '</td><td class="r">' + (on ? fmt(c.wht) : '') + '</td></tr>';
  }).join('');
  var sp = function(v, w) { return '<span class="wt-fill" style="min-width:' + (w || 200) + 'px">' + esc(v || '') + '</span>'; };
  var dt = (c.date || todayStr()).split('-'), mon = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'][Number(dt[1]) - 1];
  return '<div class="wt-paper">' +
    '<div class="wt-top"><div>' + WT_COPIES.slice(0, 2).map(function(l) { return '<div>' + ck(false) + ' <b>' + l[0] + '</b> <small>' + l[1] + '</small></div>'; }).join('') + '</div></div>' +
    '<div class="wt-frame"><div class="wt-head"><div class="wt-title"><b>หนังสือรับรองการหักภาษี ณ ที่จ่าย</b><div>ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร</div></div><div class="wt-no">เล่มที่ ' + sp('', 80) + '<br>เลขที่ ' + sp(c.no, 110) + '</div></div>' +
    '<div class="wt-sec"><div class="wt-row"><b>ผู้มีหน้าที่หักภาษี ณ ที่จ่าย :</b><span class="wt-tinl">เลขประจำตัวผู้เสียภาษีอากร (13 หลัก)* ' + tinBoxes(co.taxId) + '</span></div>' +
    '<div class="wt-row">ชื่อ ' + sp(payerName, 380) + '<span class="wt-tinl">เลขประจำตัวผู้เสียภาษีอากร ' + tin10() + '</span></div><div class="wt-hint">(ให้ระบุว่าเป็น บุคคล นิติบุคคล บริษัท สมาคม หรือคณะบุคคล)</div>' +
    '<div class="wt-row">ที่อยู่ ' + sp(ci.address, 560) + '</div><div class="wt-hint">(ให้ระบุ ชื่ออาคาร/หมู่บ้าน ห้องเลขที่ ชั้นที่ เลขที่ ตรอก/ซอย หมู่ที่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด)</div></div>' +
    '<div class="wt-sec"><div class="wt-row"><b>ผู้ถูกหักภาษี ณ ที่จ่าย :</b><span class="wt-tinl">เลขประจำตัวผู้เสียภาษีอากร (13 หลัก)* ' + tinBoxes(ct.taxId) + '</span></div>' +
    '<div class="wt-row">ชื่อ ' + sp(d.party + (ct.branch ? ' (' + ct.branch + ')' : ''), 380) + '<span class="wt-tinl">เลขประจำตัวผู้เสียภาษีอากร ' + tin10() + '</span></div><div class="wt-hint">(ให้ระบุว่าเป็น บุคคล นิติบุคคล บริษัท สมาคม หรือคณะบุคคล)</div>' +
    '<div class="wt-row">ที่อยู่ ' + sp(ct.address, 560) + '</div><div class="wt-hint">(ให้ระบุ ชื่ออาคาร/หมู่บ้าน ห้องเลขที่ ชั้นที่ เลขที่ ตรอก/ซอย หมู่ที่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด)</div></div>' +
    '<div class="wt-sec wt-forms"><div>ลำดับที่ ' + sp(String(c.seq), 70) + ' ในแบบ</div><div class="wt-fgrid">' + [['1a','(1) ภ.ง.ด.1ก'],['1s','(2) ภ.ง.ด.1ก พิเศษ'],['2','(3) ภ.ง.ด.2'],['3','(4) ภ.ง.ด.3'],['2a','(5) ภ.ง.ด.2ก'],['3a','(6) ภ.ง.ด.3ก'],['53','(7) ภ.ง.ด.53']].map(function(f) { return '<span>' + ck(form === f[0]) + ' ' + f[1] + '</span>'; }).join('') + '</div></div>' +
    '<table class="wt-tbl"><thead><tr><th>ประเภทเงินได้พึงประเมินที่จ่าย</th><th>วัน เดือน<br>หรือปีภาษี ที่จ่าย</th><th>จำนวนเงินที่จ่าย</th><th>ภาษีที่หัก<br>และนำส่งไว้</th></tr></thead><tbody>' + rows + '</tbody>' +
    '<tfoot><tr><td colspan="2" class="r"><b>รวมเงินที่จ่ายและภาษีที่หักนำส่ง</b></td><td class="r"><b>' + fmt(c.base) + '</b></td><td class="r"><b>' + fmt(c.wht) + '</b></td></tr><tr><td colspan="4"><b>รวมเงินภาษีที่หักนำส่ง</b> (ตัวอักษร) <span class="wt-words">' + esc(bahtText(c.wht)) + '</span></td></tr></tfoot></table>' +
    '<div class="wt-sec wt-line">เงินที่จ่ายเข้า กบข./กสจ./กองทุนสงเคราะห์ครูโรงเรียนเอกชน ' + sp('0.00', 40) + ' บาท &nbsp; กองทุนประกันสังคม ' + sp('0.00', 40) + ' บาท &nbsp; กองทุนสำรองเลี้ยงชีพ ' + sp('0.00', 40) + ' บาท</div>' +
    '<div class="wt-sec wt-line"><b>ผู้จ่ายเงิน</b> &nbsp; ' + ck(cfg.payer === '1') + ' (1) หัก ณ ที่จ่าย &nbsp; ' + ck(cfg.payer === '2') + ' (2) ออกให้ตลอดไป &nbsp; ' + ck(cfg.payer === '3') + ' (3) ออกให้ครั้งเดียว &nbsp; ' + ck(cfg.payer === '4') + ' (4) อื่น ๆ (ระบุ) ' + sp('', 90) + '</div>' +
    '<div class="wt-foot"><div class="wt-warn"><b>คำเตือน</b> ผู้มีหน้าที่ออกหนังสือรับรองการหักภาษี ณ ที่จ่าย ฝ่าฝืนไม่ปฏิบัติตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร ต้องรับโทษทางอาญาตามมาตรา 35 แห่งประมวลรัษฎากร</div>' +
    '<div class="wt-sign"><div>ขอรับรองว่าข้อความและตัวเลขดังกล่าวข้างต้นถูกต้องตรงกับความจริงทุกประการ</div><div class="wt-sigline">ลงชื่อ ' + sp('', 200) + ' ผู้จ่ายเงิน</div><div class="wt-payer">( ' + esc(payerName) + ' )</div><div class="wt-sigdate">' + sp(String(Number(dt[2])), 40) + ' / ' + sp(mon, 80) + ' / ' + sp(String(Number(dt[0]) + 543), 60) + '</div><div class="wt-hint">(วัน เดือน ปี ที่ออกหนังสือรับรองฯ)</div><div class="wt-stamp">ประทับตรา<br>นิติบุคคล<br>(ถ้ามี)</div></div></div></div>' +
    '<div class="wt-note"><b>หมายเหตุ</b> เลขประจำตัวผู้เสียภาษีอากร (13 หลัก)* หมายถึง 1. กรณีบุคคลธรรมดาไทย ให้ใช้เลขประจำตัวประชาชนของกรมการปกครอง 2. กรณีนิติบุคคล ให้ใช้เลขทะเบียนนิติบุคคลของกรมพัฒนาธุรกิจการค้า 3. กรณีอื่น ๆ นอกเหนือจาก 1. และ 2. ให้ใช้เลขประจำตัวผู้เสียภาษีอากร (13 หลัก) ของกรมสรรพากร</div></div>';
}
function openWhtCert(c) {
  var d = c.d, ct = STORE.contacts.find(function(x) { return x.name === d.party; }) || {};
  var st = { copy: 0, cfg: whtCfg(c) }, dirty = false;
  var warn = [];
  if (!companySettings().taxId) warn.push('ยังไม่ได้ใส่เลขผู้เสียภาษีของบริษัท (ตั้งค่า → บัญชีและการตั้งค่า)');
  if (!ct.taxId) warn.push('ผู้ขาย "' + d.party + '" ยังไม่มีเลขผู้เสียภาษี/ที่อยู่ในรายชื่อผู้ติดต่อ');
  var needOther = function(k) { return /ระบุ/.test((WT_INCOME.find(function(r) { return r[0] === k; }) || [0, ''])[1]); };
  var body = (warn.length ? '<div class="banner info">' + warn.map(esc).join('<br>') + '</div>' : '') +
    '<div class="wt-ctl">' +
    '<label>แบบ <select id="wtForm">' + [['3','ภ.ง.ด.3 (บุคคลธรรมดา)'],['53','ภ.ง.ด.53 (นิติบุคคล)'],['1a','ภ.ง.ด.1ก'],['1s','ภ.ง.ด.1ก พิเศษ'],['2','ภ.ง.ด.2'],['2a','ภ.ง.ด.2ก'],['3a','ภ.ง.ด.3ก']].map(function(o) { return '<option value="' + o[0] + '"' + (st.cfg.form === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
    '<label>ประเภทเงินได้ <select id="wtInc">' + WT_INCOME.map(function(r) { return '<option value="' + r[0] + '"' + (st.cfg.income === r[0] ? ' selected' : '') + '>' + esc(r[1].slice(0, 52)) + (r[1].length > 52 ? '…' : '') + '</option>'; }).join('') + '</select></label>' +
    '<label id="wtOtherBox"' + (needOther(st.cfg.income) ? '' : ' hidden') + '>ระบุ <input id="wtOther" value="' + esc(st.cfg.other) + '" placeholder="เช่น ค่าจ้างออกแบบ" style="width:220px"></label>' +
    '<label>ผู้จ่ายเงิน <select id="wtPayer">' + [['1','หัก ณ ที่จ่าย'],['2','ออกให้ตลอดไป'],['3','ออกให้ครั้งเดียว']].map(function(o) { return '<option value="' + o[0] + '"' + (st.cfg.payer === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
    '<span id="wtSaved" class="small ' + (st.cfg.saved ? 'pos-text' : 'muted') + '">' + (st.cfg.saved ? '✓ บันทึกแล้ว' : 'ยังไม่ได้บันทึก') + '</span></div>' +
    '<div class="pf-scroll" id="wtView">' + renderWhtSet(c, st) + '</div>';
  async function save(btn) {
    var fresh = STORE.documents.find(function(x) { return x._id === d._id; }) || d;
    var ex = Object.assign({}, fresh.extra || {}), w = Object.assign({}, ex.wht50 || {});
    w[String(c.idx)] = { form: st.cfg.form, income: st.cfg.income, payer: st.cfg.payer, other: st.cfg.other, no: c.no, date: c.date, base: c.base, wht: c.wht, savedAt: Date.now() };
    ex.wht50 = w;
    if (btn) btn.disabled = true;
    try { await setRec('documents', d._id, Object.assign({}, strip(fresh), { extra: ex, updatedAt: Date.now() })); d.extra = ex; dirty = false; var s = byId('wtSaved'); if (s) { s.textContent = '✓ บันทึกแล้ว'; s.className = 'small pos-text'; } showToast('บันทึก 50 ทวิ ' + c.no + ' แล้ว'); }
    catch (e) { showToast('บันทึกไม่สำเร็จ'); }
    finally { if (btn) btn.disabled = false; }
  }
  openModal({ title:'หนังสือรับรองการหักภาษี ณ ที่จ่าย ' + c.no, body: body, focus:false, buttons:[
    { label:'💾 บันทึก', cls:'btn-dark', onClick: function(el) { save(el); } },
    { label:'🖨 พิมพ์', onClick: function() { if (dirty) save(); printDoc(d, renderWhtSet(c, st), '50ทวิ-' + c.no + '.pdf'); } },
    { label:'⬇ ดาวน์โหลด PDF', onClick: function(el) { if (dirty) save(); downloadDocPdf(d, el, renderWhtSet(c, st), '50ทวิ-' + c.no + '.pdf'); } },
    { label:'ปิด', cls:'btn-primary', onClick: closeModal }], onMount: function() {
      byId('overlay').querySelector('.modal').classList.add('modal-wide');
      var upd = function() {
        st.cfg = { form: byId('wtForm').value, income: byId('wtInc').value, payer: byId('wtPayer').value, other: byId('wtOther').value.trim() };
        byId('wtOtherBox').hidden = !needOther(st.cfg.income);
        byId('wtView').innerHTML = renderWhtSet(c, st);
        dirty = true; var s = byId('wtSaved'); if (s) { s.textContent = 'มีการแก้ไข ยังไม่ได้บันทึก'; s.className = 'small neg-text'; }
      };
      ['wtForm','wtInc','wtPayer'].forEach(function(id) { byId(id).addEventListener('change', upd); });
      byId('wtOther').addEventListener('input', upd);
    } });
}
/* list page: tax:wht */
function whtListShell() { return pageHead('หนังสือรับรอง 50 ทวิ', 'ออกให้อัตโนมัติจากค่าใช้จ่าย เช็คจ่าย และการจ่ายชำระบิลที่มีหัก ณ ที่จ่าย เลขที่เรียงตามเดือน'); }
function whtListData() {
  var list = whtCerts().reverse();
  if (!list.length) return '<p class="empty-hint">ยังไม่มีรายการหัก ณ ที่จ่าย — บันทึกค่าใช้จ่ายหรือจ่ายบิลโดยเลือกอัตราหัก ณ ที่จ่าย ระบบจะออก 50 ทวิ ให้อัตโนมัติ</p>';
  var byM = {}; list.forEach(function(c) { var m = c.date.slice(0, 7); (byM[m] = byM[m] || { n:0, wht:0 }); byM[m].n++; byM[m].wht += c.wht; });
  return '<div class="items-wrap"><table class="data-table"><thead><tr><th>เลขที่</th><th>วันที่จ่าย</th><th>ผู้ถูกหักภาษี</th><th>แบบ</th><th>เอกสารอ้างอิง</th><th class="r">จำนวนเงินที่จ่าย</th><th class="r">ภาษีที่หัก</th><th></th></tr></thead><tbody>' +
    list.map(function(c, i) { var ct = STORE.contacts.find(function(x) { return x.name === c.d.party; }) || {}, f = whtCfg(c).form; return '<tr><td class="num">' + esc(c.no) + '</td><td class="num">' + fmtDateNum(c.date) + '</td><td>' + esc(c.d.party) + '</td><td>ภ.ง.ด.' + esc(f) + '</td><td class="num">' + esc(c.d.docNo || '') + '</td><td class="r">' + fmtMoney(c.base) + '</td><td class="r">' + fmtMoney(c.wht) + '</td><td><button type="button" class="linkish" data-wtopen="' + esc(c.no) + '">เปิด / พิมพ์</button></td></tr>'; }).join('') +
    '</tbody></table></div><p class="small muted">รวมทั้งหมด ' + list.length + ' ฉบับ · นำส่งภาษีหัก ณ ที่จ่ายภายในวันที่ 7 ของเดือนถัดไป (e-Filing วันที่ 15)</p>';
}
function bindWhtList() { var c = byId('pageData'); if (!c) return; c.querySelectorAll('[data-wtopen]').forEach(function(b) { b.onclick = function() { var x = whtCerts().find(function(k) { return k.no === b.dataset.wtopen; }); if (x) openWhtCert(x); }; }); }
