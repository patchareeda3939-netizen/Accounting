/* ================= Settings (gear) ================= */
function companySettings() { return STORE.settings.find(function(s) { return s._id === 'company'; }) || {}; }
function companyName() { return companySettings().name || 'บริษัทของฉัน'; }
function applyCompany() {
  if (typeof renderCoSwitch === 'function') renderCoSwitch(); else { var el = byId('companyPill'); if (el) el.textContent = companyName(); }
  if (typeof syncCompanyRegistry === 'function') syncCompanyRegistry();
  var cs = companySettings();
  if (cs.defaultReportPeriod && !pageState._repPeriodSet) { pageState.repPeriod = cs.defaultReportPeriod; pageState._repPeriodSet = true; }
}
async function saveSettings(id, patch) {
  var cur = STORE.settings.find(function(s) { return s._id === id; });
  var rec = Object.assign({}, cur ? strip(cur) : {}, patch, { updatedAt: Date.now() });
  if (db) { await db.doc(cname('settings') + '/' + id).set(rec); return; }
  STORE.settings = STORE.settings.filter(function(s) { return s._id !== id; }).concat([Object.assign(rec, { _id: id })]);
  onData();
}
function soon() { showToast('ฟีเจอร์นี้จะเปิดให้ใช้งานเร็ว ๆ นี้'); }
var GEAR_MENU = [
  ['บริษัทของคุณ', [['บัญชีและการตั้งค่า', function() { go('settings', 'company'); }], ['สลับ / เพิ่มบริษัท', function() { setTimeout(toggleCoMenu, 0); }], ['จัดการผู้ใช้', function() { openUsersInfo(); }], ['รูปแบบฟอร์มกำหนดเอง', function() { go('settings', 'forms'); }], ['การตั้งค่ารายงานเริ่มต้น', function() { openReportDefaults(); }], ['ผังบัญชี', function() { go('accounting', 'coa'); }], ['ข้อมูลเพิ่มเติม', function() { go('settings', 'company'); }, true]]],
  ['รายการ', [['รายการทั้งหมด', function() { go('alldocs'); }], ['ผลิตภัณฑ์และบริการ', function() { go('sales', 'products'); }], ['รายการเกิดซ้ำ', function() { go('accounting', 'recurring'); }], ['สิ่งที่แนบ', function() { go('alldocs'); }], ['ช่องที่กำหนดเอง', soon], ['กฎ', function() { go('accounting', 'rules'); }]]],
  ['เครื่องมือ', [['จัดการกระแสงาน', soon], ['การจัดหมวดหมู่ธุรกรรมอีกครั้ง', function() { go('billing', 'expenseTx'); }], ['นำเข้าข้อมูล', function() { go('settings', 'import'); }], ['ส่งออกข้อมูล', function() { exportAllData(); }], ['กระทบยอด', function() { go('accounting', 'reconcile'); }], ['การจัดทำงบประมาณ', function() { go('reports', 'budget'); }], ['บันทึกการตรวจสอบ', function() { openReport('recentTx'); }], ['สำรองข้อมูลบริษัท', function() { backupData(); }], ['แชร์หน้าจอ', soon]]],
  ['โปรไฟล์', [['การสมัครสมาชิกและการเรียกเก็บเงิน', soon], ['ข้อเสนอแนะ', function() { openFeedback(); }], ['ความเป็นส่วนตัว', function() { openPrivacy(); }], ['ตัวเลือกความเป็นส่วนตัวของคุณ', function() { openPrivacy(); }]]]
];
function buildGear() {
  var p = byId('gearPanel'), btn = byId('gearBtn');
  p.innerHTML = '<div class="gear-cols">' + GEAR_MENU.map(function(col, ci) {
    return '<div><h3>' + col[0] + '</h3>' + col[1].map(function(it, ii) { return '<button type="button" role="menuitem" data-gear="' + ci + ':' + ii + '">' + it[0] + (it[2] ? '<span class="gear-dot" aria-hidden="true"></span>' : '') + '</button>'; }).join('') + '</div>';
  }).join('') + '</div><div class="gear-foot"><button type="button" id="gearVideo">▶ วิดีโอสอนใช้งาน</button><button type="button" id="gearView">เปลี่ยนจากมุมมองนักบัญชีเป็นมุมมองธุรกิจ</button></div>';
  function toggle(open) { p.hidden = !open; btn.setAttribute('aria-expanded', String(open)); }
  btn.addEventListener('click', function(e) { e.stopPropagation(); toggle(p.hidden); });
  p.addEventListener('click', function(e) {
    e.stopPropagation();
    var b = e.target.closest('[data-gear]'); if (!b) return;
    var ix = b.dataset.gear.split(':'); toggle(false); GEAR_MENU[ix[0]][1][ix[1]][1]();
  });
  byId('gearVideo').addEventListener('click', soon);
  byId('gearView').addEventListener('click', function() { toggle(false); showHome(); showToast('เปลี่ยนเป็นมุมมองธุรกิจแล้ว'); });
  document.addEventListener('click', function() { toggle(false); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') toggle(false); });
}
var COMPANY_FIELDS = [
  { key:'name', label:'ชื่อบริษัท', required:true },
  { key:'legalName', label:'ชื่อตามกฎหมาย (สำหรับเอกสาร)' },
  { key:'taxId', label:'เลขประจำตัวผู้เสียภาษี (13 หลัก)' },
  { key:'branch', label:'สาขา', placeholder:'สำนักงานใหญ่' },
  { key:'address', label:'ที่อยู่' },
  { key:'phone', label:'โทรศัพท์' },
  { key:'email', label:'อีเมล', type:'email' },
  { key:'vatRegistered', label:'จดทะเบียนภาษีมูลค่าเพิ่ม', type:'select', options:[['yes','จด VAT'],['no','ไม่ได้จด VAT']] },
  { key:'fiscalStart', label:'เดือนเริ่มต้นรอบบัญชี', type:'select', options:['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'].map(function(m, i) { return [String(i + 1), m]; }) }
];
function openCompanySettings() {
  var cs = Object.assign({ name: companyName(), vatRegistered:'yes', fiscalStart:'1' }, companySettings());
  openModal({ title:'บัญชีและการตั้งค่า', body: '<p class="small muted" style="margin:0">ข้อมูลนี้ใช้เป็นหัวรายงานและชื่อที่แสดงด้านบน</p>' + COMPANY_FIELDS.map(function(f) { return fieldHTML(f, cs[f.key], 's_'); }).join('') + '<div class="form-error" id="formError" hidden></div>',
    buttons:[CANCEL_BTN, { label:'บันทึก', cls:'btn-dark', onClick: function(b) {
      var out = {}; COMPANY_FIELDS.forEach(function(f) { if (canEditLegal() || LEGAL_FIELDS.indexOf(f.key) < 0) out[f.key] = byId('s_' + f.key).value.trim(); });
      var err = canEditLegal() && !out.name ? 'กรุณาระบุชื่อบริษัท' : (out.taxId && !/^\d{13}$/.test(out.taxId.replace(/[\s-]/g, '')) ? 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก' : '');
      if (err) { var e = byId('formError'); e.textContent = err; e.hidden = false; return; }
      runSave(b, async function() { await saveSettings('company', out); showToast('บันทึกการตั้งค่าบริษัทแล้ว'); closeModal(); });
    } }] });
  if (!canEditLegal()) LEGAL_FIELDS.forEach(function(k) { var el = byId('s_' + k); if (el) { el.disabled = true; el.title = 'แก้ได้เฉพาะเจ้าของบริษัท'; } });
}
function openReportDefaults() {
  var cur = companySettings().defaultReportPeriod || pageState.repPeriod;
  openModal({ title:'การตั้งค่ารายงานเริ่มต้น', body: fieldHTML({ key:'rp', label:'ช่วงเวลาเริ่มต้นเมื่อเปิดรายงาน', type:'select', options:[['month','เดือนนี้'],['quarter','ไตรมาสนี้'],['year','ปีนี้'],['last12','12 เดือนล่าสุด'],['all','ทั้งหมด']] }, cur, 's_'),
    buttons:[CANCEL_BTN, { label:'บันทึก', cls:'btn-dark', onClick: function(b) {
      var v = byId('s_rp').value; pageState.repPeriod = v;
      runSave(b, async function() { await saveSettings('company', { defaultReportPeriod: v }); showToast('บันทึกค่าเริ่มต้นรายงานแล้ว'); closeModal(); });
    } }] });
}
function openUsersInfo() {
  if (FB_MODE) return fbOpenMembers();
  openModal({ title:'จัดการผู้ใช้', focus:false, body: '<p style="margin:0;line-height:1.7">ผู้ใช้และสิทธิ์จัดการจากเมนู <b>Share</b> ของหน้านี้บน claude.ai</p><ul style="margin:0;padding-left:20px;line-height:1.9;font-size:14px"><li><b>Contributor</b> สร้างและแก้ไขเอกสาร ผังบัญชี และข้อมูลทั้งหมด</li><li><b>Viewer / Commenter</b> ดูข้อมูลได้อย่างเดียว</li><li><b>Editor</b> ทำได้ทุกอย่างรวมถึงเผยแพร่เวอร์ชันใหม่</li></ul><p class="small muted" style="margin:0">ผู้ที่เปิดหน้านี้ได้ต้องอยู่ในองค์กรเดียวกันกับเจ้าของ</p>', buttons:[{ label:'ปิด', cls:'btn-primary', onClick: closeModal }] });
}
function openPrivacy() {
  openModal({ title:'ความเป็นส่วนตัว', focus:false, body: '<p style="margin:0;line-height:1.7">ข้อมูลบัญชีทั้งหมดเก็บในฐานข้อมูลของหน้านี้ เปิดเห็นได้เฉพาะคนที่ได้รับแชร์ ส่วนรายการโปรดของรายงานเก็บในเบราว์เซอร์ของคุณเท่านั้น</p><p class="small muted" style="margin:0">ต้องการลบข้อมูลทั้งหมด ให้สำรองข้อมูลก่อน แล้วลบหน้านี้จากคลังผลงานบน claude.ai</p>', buttons:[{ label:'ปิด', cls:'btn-primary', onClick: closeModal }] });
}
function openFeedback() {
  openModal({ title:'ข้อเสนอแนะ', body: '<div class="field"><label for="fbText">อยากให้ปรับปรุงอะไร</label><textarea id="fbText" class="imp-text" rows="5" placeholder="เช่น อยากให้มีรายงานยอดขายรายสาขา"></textarea></div>',
    buttons:[CANCEL_BTN, { label:'ส่ง', cls:'btn-dark', onClick: function(b) {
      var t = byId('fbText').value.trim(); if (!t) { byId('fbText').focus(); return; }
      runSave(b, async function() { await addRec('feedback', { text: t, createdAt: Date.now() }); showToast('ขอบคุณสำหรับข้อเสนอแนะ'); closeModal(); });
    } }] });
}
STORE.feedback = STORE.feedback || [];
function openImportHub() {
  openModal({ title:'นำเข้าข้อมูล', focus:false, body: '<p class="small muted" style="margin:0">เลือกข้อมูลที่ต้องการนำเข้า</p><div class="toolbar" style="flex-direction:column;align-items:stretch">' +
    '<button type="button" class="btn" id="impCoa">ผังบัญชี (CSV / Excel)</button><button type="button" class="btn" id="impBackup">กู้คืนจากไฟล์สำรองข้อมูล (.json)</button></div>',
    buttons:[{ label:'ปิด', onClick: closeModal }], onMount: function() {
      byId('impCoa').addEventListener('click', function() { go('accounting', 'coa'); openCoaImport(); });
      byId('impBackup').addEventListener('click', openRestore);
    } });
}
var BACKUP_COLLS = ['documents','contacts','products','accounts','employees','taxReturns','settings'];
async function backupData() {
  var data = { app:'PSMacc', company: companyName(), exportedAt: new Date().toISOString() };
  BACKUP_COLLS.forEach(function(c) { data[c] = STORE[c]; });
  var json = JSON.stringify(data, null, 1), dl = await getDownloads();
  if (!dl) { openModal({ title:'สำรองข้อมูลบริษัท', focus:false, body:'<div class="banner info">หน้านี้บันทึกไฟล์ลงเครื่องไม่ได้ในมุมมองนี้ คัดลอกข้อความด้านล่างเก็บไว้แทนได้</div><textarea class="imp-text" rows="10" readonly>' + esc(json) + '</textarea>', buttons:[{ label:'ปิด', onClick: closeModal }] }); return; }
  try { await dl.save({ filename: 'backup-' + companyName() + '-' + todayStr() + '.json', data: json }); showToast('สำรองข้อมูลแล้ว'); } catch (e) { if (!e || e.code !== 'declined') showToast('สำรองข้อมูลไม่สำเร็จ'); }
}
function openRestore() {
  openModal({ title:'กู้คืนจากไฟล์สำรองข้อมูล', body:'<p class="small muted" style="margin:0">เพิ่มรายการจากไฟล์สำรองเข้าไปในข้อมูลปัจจุบัน รายการที่มีรหัสเดียวกันจะถูกเขียนทับ</p><div class="field"><label for="rsFile">ไฟล์ .json</label><input id="rsFile" type="file" accept=".json,application/json"></div><div id="rsInfo"></div><div class="form-error" id="formError" hidden></div>',
    buttons:[CANCEL_BTN, { label:'กู้คืน', cls:'btn-dark', onClick: function(b) {
      var data = openRestore._data; if (!data) { var e = byId('formError'); e.textContent = 'เลือกไฟล์สำรองข้อมูลก่อน'; e.hidden = false; return; }
      runSave(b, async function() {
        var n = 0;
        for (var ci = 0; ci < BACKUP_COLLS.length; ci++) {
          var c = BACKUP_COLLS[ci], list = Array.isArray(data[c]) ? data[c] : [];
          for (var i = 0; i < list.length; i++) {
            var rec = list[i], id = rec._id;
            if (db && id && /^[A-Za-z0-9_\-.~:@+]+$/.test(id)) await db.doc(cname(c) + '/' + id).set(strip(rec));
            else await addRec(c, strip(rec));
            n++; b.textContent = 'กำลังกู้คืน ' + n;
          }
        }
        showToast('กู้คืน ' + n + ' รายการแล้ว'); closeModal();
      });
    } }], onMount: function() {
      openRestore._data = null;
      byId('rsFile').addEventListener('change', async function(e) {
        var f = e.target.files[0]; if (!f) return;
        try { var d = JSON.parse(await f.text()); openRestore._data = d; byId('rsInfo').innerHTML = '<div class="banner ok">' + BACKUP_COLLS.map(function(c) { return c + ' ' + ((d[c] || []).length); }).join(' · ') + '</div>'; }
        catch (err) { var el = byId('formError'); el.textContent = 'ไฟล์นี้ไม่ใช่ไฟล์สำรองข้อมูลที่ถูกต้อง'; el.hidden = false; }
      });
    } });
}
async function exportAllData() {
  var dl = await getDownloads();
  var sheets = [
    ['เอกสาร', ['วันที่','ชนิด','เลขที่','คู่ค้า','ก่อนภาษี','VAT','ยอดรวม','หัก ณ ที่จ่าย','สถานะ'], STORE.documents.map(function(d) { return [d.date, d.typeLabel, d.docNo, d.party, d.subtotal, d.vat, d.total, d.wht, strip2(statusText(d))]; })],
    ['ผู้ติดต่อ', ['ชื่อ','ประเภท','เลขผู้เสียภาษี','โทรศัพท์','อีเมล','ที่อยู่'], STORE.contacts.map(function(c) { return [c.name, c.kind, c.taxId, c.phone, c.email, c.address]; })],
    ['สินค้า', ['ชื่อ','SKU','ประเภท','หน่วย','ราคา','ต้นทุน','คงเหลือ'], STORE.products.map(function(p) { return [p.name, p.sku, p.kind, p.unit, p.price, p.cost, p.kind === 'service' ? '' : productStock(p)]; })],
    ['ผังบัญชี', ['รหัส','ชื่อ','ประเภทบัญชี','ประเภทรายละเอียด'], STORE.accounts.map(function(a) { return [a.code, a.name, subtypeLabel(accSubtype(a)), a.detailType]; })],
    ['พนักงาน', ['ชื่อ','ตำแหน่ง','โทรศัพท์','อีเมล','เริ่มงาน'], STORE.employees.map(function(e) { return [e.name, e.position, e.phone, e.email, e.startDate]; })]
  ];
  if (!dl) { showToast('หน้านี้บันทึกไฟล์ไม่ได้ในมุมมองนี้ ใช้ส่งออกจากแต่ละรายงานแทน'); return; }
  try {
    await loadXlsxLib();
    var wb = XLSX.utils.book_new();
    sheets.forEach(function(s) { XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([s[1]].concat(s[2])), s[0]); });
    await dl.save({ filename: 'ข้อมูล-' + companyName() + '-' + todayStr() + '.xlsx', data: new Uint8Array(XLSX.write(wb, { bookType:'xlsx', type:'array' })) });
    showToast('ส่งออกข้อมูลทั้งหมดแล้ว');
  } catch (e) { if (!e || e.code !== 'declined') showToast('ส่งออกไม่สำเร็จ ลองอีกครั้ง'); }
}
buildGear();
applyCompany();

/* ---- Company settings page ---- */
var CO_SECTIONS = [
  ['ข้อมูลบริษัท', 'ข้อมูลนี้อาจนำไปใช้ในการเรียกเก็บเงินได้', [['name','ชื่อ'],['address','ที่อยู่','area'],['email','อีเมล','email'],['phone','โทรศัพท์'],['website','เว็บไซต์'],['industry','อุตสาหกรรม','select',['ค้าปลีก','ค้าส่ง','การผลิต','ก่อสร้าง','การให้บริการเช่าและการรับจ้าง (ไม่ใช่อสังหาริมทรัพย์)','บริการวิชาชีพ (บัญชี กฎหมาย ที่ปรึกษา)','ร้านอาหารและเครื่องดื่ม','ขนส่งและโลจิสติกส์','เทคโนโลยีสารสนเทศ','อสังหาริมทรัพย์','อื่น ๆ']]]],
  ['ข้อมูลทางกฎหมาย', 'นี่คือข้อมูลที่ธุรกิจของคุณใช้เพื่อวัตถุประสงค์ด้านภาษี', [['legalName','ชื่อธุรกิจจดทะเบียน'],['taxId','เลขประจำตัวผู้เสียภาษี (TIN)'],['branch','สาขา'],['businessType','ประเภทธุรกิจ','select',['บุคคลธรรมดา','ห้างหุ้นส่วนสามัญ','ห้างหุ้นส่วนจำกัด','บริษัทจำกัด','บริษัทมหาชนจำกัด','มูลนิธิ/สมาคม']],['legalAddress','ที่อยู่ตามกฎหมาย','area'],['vatRegistered','จดทะเบียนภาษีมูลค่าเพิ่ม','select',[['yes','จด VAT'],['no','ไม่ได้จด VAT']]],['fiscalStart','เดือนเริ่มต้นรอบบัญชี','select',['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'].map(function(m, i) { return [String(i + 1), m]; })]]],
  ['ข้อมูลติดต่อลูกค้า', 'นี่คือวิธีที่ลูกค้าติดต่อกับคุณ', [['custEmail','อีเมลลูกค้า','email'],['custPhone','โทรศัพท์ลูกค้า'],['custAddress','ที่อยู่ลูกค้า','area']]]
];
var coEditing = null;
function coVal(f) {
  var cs = companySettings(), v = f[0] === 'name' ? companyName() : cs[f[0]];
  if (f[0] === 'custEmail' && !v) v = cs.email;
  if (f[0] === 'legalName' && !v) v = companyName();
  if (f[2] === 'select' && v) { var o = f[3].find(function(x) { return Array.isArray(x) ? x[0] === v : x === v; }); if (o) return Array.isArray(o) ? o[1] : o; }
  return v;
}
function companyPageShell() { return ''; }
function companyPageData() {
  var cs = companySettings();
  var h = '<div class="co-logo-wrap"><label class="co-logo" for="coLogo" title="เปลี่ยนโลโก้">' + (cs.logo ? '<img src="' + esc(cs.logo) + '" alt="โลโก้บริษัท">' : '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 9l1.5-5h13L20 9"/><path d="M4 9a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0 2.7 2.7 0 005.3 0"/><path d="M5 11v9h14v-9"/><path d="M10 20v-5h4v5"/></svg>') +
    '<span class="co-pen">✎</span></label><input type="file" id="coLogo" accept="image/*" hidden>' + (cs.logo ? '<button type="button" class="chip-link" id="coLogoDel">ลบโลโก้</button>' : '') + '</div>';
  if (!canEditLegal()) h += '<div class="banner info" id="coLegalLock">ชื่อบริษัท เลขผู้เสียภาษี และข้อมูลนิติบุคคลหลักแก้ได้เฉพาะเจ้าของบริษัท</div>';
  CO_SECTIONS.forEach(function(sec, si) {
    h += '<section class="co-card"><div class="co-head"><h2>' + sec[0] + '</h2><p>' + sec[1] + '</p></div>';
    sec[2].forEach(function(f) {
      var key = f[0], v = coVal(f);
      if (coEditing === key) {
        var raw = key === 'name' ? companyName() : (companySettings()[key] || (key === 'custEmail' ? cs.email : key === 'legalName' ? companyName() : ''));
        var input = f[2] === 'select' ? '<select id="coInput">' + '<option value="">— เลือก —</option>' + f[3].map(function(o) { var k = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(k) + '"' + (String(raw) === String(k) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>'
          : f[2] === 'area' ? '<textarea id="coInput" rows="3">' + esc(raw) + '</textarea>' : '<input id="coInput" type="' + (f[2] === 'email' ? 'email' : 'text') + '" value="' + esc(raw) + '">';
        h += '<div class="co-row editing"><div class="co-lbl">' + f[1] + '</div><div class="co-edit">' + input + '<div class="form-error" id="coErr" hidden></div><div class="co-btns"><button type="button" class="btn btn-sm" id="coCancel">ยกเลิก</button><button type="button" class="btn btn-sm btn-dark" id="coSave">บันทึก</button></div></div></div>';
      } else {
        var locked = LEGAL_FIELDS.indexOf(key) >= 0 && !canEditLegal();
        h += '<div class="co-row"><div class="co-lbl">' + f[1] + '</div><div class="co-val' + (v ? '' : ' empty') + '">' + (v ? esc(v) : 'ไม่มีในรายการ') + '</div>' + (locked ? '<span class="small muted" title="แก้ได้เฉพาะเจ้าของบริษัท">🔒</span>' : '<button type="button" class="co-editbtn" data-coedit="' + key + '">แก้ไข</button>') + '</div>';
      }
    });
    h += '</section>';
  });
  h += branchesSectionHTML();
  h += '<div class="co-foot"><button type="button" class="chip-link" onclick="openPrivacy()">ความเป็นส่วนตัว</button> | <button type="button" class="chip-link" onclick="openUsersInfo()">การรักษาความปลอดภัย</button> | <button type="button" class="chip-link" onclick="openReportDefaults()">การตั้งค่ารายงานเริ่มต้น</button></div>';
  return h;
}
function bindCompanyPage() {
  var c = byId('pageData');
  bindBranches(c);
  c.querySelectorAll('[data-coedit]').forEach(function(b) { b.addEventListener('click', function() { coEditing = b.dataset.coedit; refreshPageData(); var i = byId('coInput'); if (i) i.focus(); }); });
  var cancel = byId('coCancel'); if (cancel) cancel.addEventListener('click', function() { coEditing = null; refreshPageData(); });
  var save = byId('coSave');
  if (save) {
    var doSave = function() {
      var v = byId('coInput').value.trim(), key = coEditing, err = '';
      if (key === 'name' && !v) err = 'กรุณาระบุชื่อบริษัท';
      if (key === 'taxId' && v && !/^\d{13}$/.test(v.replace(/[\s-]/g, ''))) err = 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก';
      if ((key === 'email' || key === 'custEmail') && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) err = 'รูปแบบอีเมลไม่ถูกต้อง';
      if (err) { var e = byId('coErr'); e.textContent = err; e.hidden = false; return; }
      if (key === 'taxId') v = v.replace(/[\s-]/g, '');
      var patch = {}; patch[key] = v;
      runSave(save, async function() { await saveSettings('company', patch); coEditing = null; showToast('บันทึกแล้ว'); refreshPageData(); });
    };
    save.addEventListener('click', doSave);
    byId('coInput').addEventListener('keydown', function(e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') doSave(); if (e.key === 'Escape') { coEditing = null; refreshPageData(); } });
  }
  var lf = byId('coLogo');
  if (lf) lf.addEventListener('change', function(e) {
    var f = e.target.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function() { var img = new Image(); img.onload = async function() { var k = Math.min(1, 320 / Math.max(img.width, img.height)); var cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); var u = cv.toDataURL('image/png'); if (u.length > 150000) u = cv.toDataURL('image/jpeg', .8); try { await saveSettings('company', { logo: u }); showToast('อัปเดตโลโก้แล้ว'); refreshPageData(); } catch (err) { showToast(writeError(err)); } }; img.onerror = function() { showToast('อ่านรูปภาพไม่ได้'); }; img.src = rd.result; };
    rd.readAsDataURL(f);
  });
  var ld = byId('coLogoDel'); if (ld) ld.addEventListener('click', async function() { try { await saveSettings('company', { logo:'' }); refreshPageData(); } catch (err) { showToast(writeError(err)); } });
}
