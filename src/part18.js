/* ================= Opening balances from prior-year statements (accounting:opening) ================= */
var ob = { date: '', vals: null, toRE: true };
function obDoc() { return STORE.documents.find(function(d) { return d.extra && d.extra.openingAll; }); }
function obBankFixed() { var m = {}; STORE.documents.forEach(function(d) { if (d.extra && d.extra.openingFor) (d.items || []).forEach(function(r) { var c = String(r.account).split(' ')[0]; if (c === d.extra.openingFor) m[c] = round2((m[c] || 0) + (Number(r.debit) || 0) - (Number(r.credit) || 0)); }); }); return m; }
function obAccounts() {
  var order = { asset:1, liability:2, equity:3 };
  return STORE.accounts.filter(function(a) { var b = subtypeBase(accSubtype(a)); return order[b] && a.code !== '3900'; })
    .sort(function(a, b) { return order[subtypeBase(accSubtype(a))] - order[subtypeBase(accSubtype(b))] || String(a.code).localeCompare(String(b.code)); });
}
function obInit() {
  if (ob.vals) return;
  var d = obDoc(), y = Number(todayStr().slice(0, 4));
  ob.date = d ? d.date : (y + '-01-01'); ob.vals = {};
  if (d) (d.items || []).forEach(function(r) { var c = String(r.account).split(' ')[0]; if (c === '3120' && d.extra.reLine) return; ob.vals[c] = { dr: Number(r.debit) || 0, cr: Number(r.credit) || 0 }; });
}
function obShell() {
  return '<div class="coa-bar"><div><h1 class="section-title" style="margin:0">ยอดยกมา (จากงบปีก่อน)</h1><p class="section-sub">ใส่ยอดคงเหลือของบัญชีงบดุล ณ วันสิ้นปีก่อน (จากงบทดลอง/งบแสดงฐานะการเงินปีก่อน) ระบบจะลงสมุดรายวันยอดยกมาให้ 1 รายการ</p></div>' +
    '<div class="coa-actions"><label class="btn btn-outline" style="cursor:pointer">นำเข้าจาก Excel/CSV<input type="file" id="obFile" accept=".csv,.xlsx,.xls" hidden></label></div></div>';
}
function obData() {
  obInit();
  var fixed = obBankFixed(), dr = 0, cr = 0, rows = '', cur = '';
  var lbl = { asset:'สินทรัพย์', liability:'หนี้สิน', equity:'ส่วนของเจ้าของ' };
  obAccounts().forEach(function(a) {
    var b = subtypeBase(accSubtype(a));
    if (b !== cur) { cur = b; rows += '<tr class="group-row"><td colspan="4">' + lbl[b] + '</td></tr>'; }
    var v = ob.vals[a.code] || { dr:0, cr:0 };
    if (fixed[a.code] != null && !obDoc()) { rows += '<tr><td>' + esc(a.code + ' ' + a.name) + '</td><td class="r muted">' + (fixed[a.code] > 0 ? fmtMoney(fixed[a.code]) : '') + '</td><td class="r muted">' + (fixed[a.code] < 0 ? fmtMoney(-fixed[a.code]) : '') + '</td><td class="small muted">ตั้งไว้ในบัญชีธนาคารแล้ว</td></tr>'; return; }
    if (fixed[a.code] != null) { rows += '<tr><td>' + esc(a.code + ' ' + a.name) + '</td><td colspan="2" class="r muted small">ตั้งยอดยกมาไว้ที่ธุรกรรมธนาคาร ' + fmtMoney(fixed[a.code]) + '</td><td></td></tr>'; return; }
    dr += Number(v.dr) || 0; cr += Number(v.cr) || 0;
    rows += '<tr><td>' + esc(a.code + ' ' + a.name) + '</td><td class="r"><input type="number" step="0.01" min="0" class="r" data-ob="' + esc(a.code) + ':dr" value="' + (v.dr || '') + '"></td><td class="r"><input type="number" step="0.01" min="0" class="r" data-ob="' + esc(a.code) + ':cr" value="' + (v.cr || '') + '"></td><td class="small muted">' + esc(subtypeLabel(accSubtype(a))) + '</td></tr>';
  });
  dr = round2(dr); cr = round2(cr); var diff = round2(dr - cr);
  var d = obDoc();
  return (d ? '<div class="banner info">มียอดยกมาอยู่แล้ว (' + esc(d.docNo) + ' ณ ' + fmtDateNum(d.date) + ') แก้ไขตัวเลขแล้วกดบันทึกเพื่อปรับปรุง</div>' : '') +
    '<div class="coa-bar"><div class="field" style="margin:0"><label for="obDate">วันที่ยอดยกมา (วันแรกของปีบัญชีนี้)</label><input type="date" id="obDate" value="' + esc(ob.date) + '"></div>' +
    '<label class="se-chk"><input type="checkbox" id="obRE"' + (ob.toRE ? ' checked' : '') + '> ลงส่วนต่างเข้า 3120 กำไรสะสม อัตโนมัติ</label></div>' +
    '<div class="items-wrap"><table class="data-table ob-table"><thead><tr><th>บัญชี</th><th class="r">เดบิต</th><th class="r">เครดิต</th><th></th></tr></thead><tbody>' + rows + '</tbody>' +
    '<tfoot><tr class="rep-total"><td>รวม</td><td class="r">' + fmtMoney(dr) + '</td><td class="r">' + fmtMoney(cr) + '</td><td></td></tr>' +
    '<tr><td>ส่วนต่าง</td><td colspan="2" class="r ' + (diff ? 'neg-text' : 'pos-text') + '">' + (diff ? fmtMoney(Math.abs(diff)) + (diff > 0 ? ' (เดบิตมากกว่า)' : ' (เครดิตมากกว่า)') : '✓ สมดุล') + '</td><td class="small muted">' + (diff && ob.toRE ? 'จะลงเข้า 3120 กำไรสะสม' : '') + '</td></tr></tfoot></table></div>' +
    '<p class="small muted">ใส่ยอดสินทรัพย์ฝั่งเดบิต หนี้สินและทุนฝั่งเครดิต (ค่าเสื่อมราคาสะสมใส่ฝั่งเครดิต) · ลูกหนี้/เจ้าหนี้รายตัวที่ยังค้าง ควรบันทึกเป็นใบแจ้งหนี้/บิลยกมาแทน เพื่อให้ตามเก็บ/จ่ายได้</p>' +
    '<div class="toolbar"><button type="button" class="btn btn-dark" id="obSave">บันทึกยอดยกมา</button>' + (d ? '<button type="button" class="btn btn-outline" id="obDel">ลบยอดยกมา</button>' : '') + '</div>';
}
function bindOb() {
  var c = byId('pageData'); if (!c) return;
  c.querySelectorAll('[data-ob]').forEach(function(el) { el.onchange = function() { var s = el.dataset.ob.split(':'), v = ob.vals[s[0]] = ob.vals[s[0]] || { dr:0, cr:0 }; v[s[1]] = Number(el.value) || 0; if (v[s[1]] && s[1] === 'dr') v.cr = 0; if (v[s[1]] && s[1] === 'cr') v.dr = 0; refreshPageData(); }; });
  var dt = byId('obDate'); if (dt) dt.onchange = function() { ob.date = dt.value; };
  var re = byId('obRE'); if (re) re.onchange = function() { ob.toRE = re.checked; refreshPageData(); };
  var f = byId('obFile'); if (f && !f._b) { f._b = 1; f.onchange = async function() { var file = f.files[0]; f.value = ''; if (file) await obImport(file); }; }
  var sv = byId('obSave'); if (sv) sv.onclick = obSave;
  var dl = byId('obDel'); if (dl) dl.onclick = async function() { var d = obDoc(); if (d) { await delRec('documents', d._id); ob.vals = null; showToast('ลบยอดยกมาแล้ว'); } };
}
async function obImport(file) {
  try {
    var rows;
    if (/\.xlsx?$/i.test(file.name)) { await loadXlsxLib(); var wb = XLSX.read(await file.arrayBuffer(), { type:'array' }); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header:1, defval:'', raw:false }); }
    else rows = parseCsv((await file.text()).replace(/^﻿/, ''));
    var n = 0, byName = {}; STORE.accounts.forEach(function(a) { byName[String(a.name).trim()] = a.code; });
    rows.forEach(function(r) {
      var cells = r.map(function(x) { return String(x).trim(); }), code = null;
      cells.forEach(function(x) { var m = x.match(/^(\d{4,6})\b/); if (!code && m && STORE.accounts.some(function(a) { return a.code === m[1]; })) code = m[1]; });
      if (!code) cells.forEach(function(x) { if (!code && byName[x]) code = byName[x]; });
      if (!code) return;
      var nums = cells.map(function(x) { var t = x.replace(/[,\s฿]/g, '').replace(/^\((.*)\)$/, '-$1'); return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null; }).filter(function(x, i) { return x != null && cells[i] !== code; });
      if (!nums.length) return;
      var drv = 0, crv = 0;
      if (nums.length >= 2) { drv = nums[nums.length - 2]; crv = nums[nums.length - 1]; } else { var base = subtypeBase(accSubtype(STORE.accounts.find(function(a) { return a.code === code; }))); var v1 = nums[0]; if ((base === 'asset') === (v1 >= 0)) drv = Math.abs(v1); else crv = Math.abs(v1); }
      var net = round2(drv - crv); ob.vals[code] = { dr: net > 0 ? net : 0, cr: net < 0 ? -net : 0 }; n++;
    });
    showToast(n ? 'นำเข้า ' + n + ' บัญชี ตรวจสอบแล้วกดบันทึก' : 'ไม่พบรหัสบัญชีที่ตรงกับผังบัญชีในไฟล์'); refreshPageData();
  } catch (e) { showToast('อ่านไฟล์ไม่ได้: ' + (e.message || e)); }
}
async function obSave(ev) {
  var btn = ev && ev.target; ob.date = (byId('obDate') || {}).value || ob.date;
  if (!ob.date) { showToast('ใส่วันที่ยอดยกมา'); return; }
  var items = [], dr = 0, cr = 0, fixed = obBankFixed();
  Object.keys(ob.vals).forEach(function(code) { var v = ob.vals[code]; if (fixed[code] != null) return; var a = round2(Number(v.dr) || 0), b = round2(Number(v.cr) || 0); if (!a && !b) return; dr += a; cr += b; items.push({ account: code + ' ' + acctName(code), debit: a, credit: b }); });
  if (!items.length) { showToast('ยังไม่ได้ใส่ยอด'); return; }
  var diff = round2(dr - cr), reLine = false;
  if (diff) {
    if (!ob.toRE) { showToast('ยอดเดบิต/เครดิตไม่สมดุล ต่าง ' + fmtMoney(Math.abs(diff))); return; }
    if (!STORE.accounts.some(function(a) { return a.code === '3120'; })) await addRec('accounts', { code:'3120', name:'กำไรสะสม', accType:'equity', type:'equity', createdAt: Date.now() });
    items.push({ account: '3120 ' + (acctName('3120') || 'กำไรสะสม'), debit: diff < 0 ? -diff : 0, credit: diff > 0 ? diff : 0 }); reLine = true;
  }
  var tot = round2(Math.max(dr, cr)), d = obDoc();
  if (btn) btn.disabled = true;
  var rec = { type:'journalEntry', typeLabel: DOC_TYPES.journalEntry.label, group:'other', party:'ยอดยกมาจากงบปีก่อน', date: ob.date, items: items, total: tot, extra: { openingAll: true, reLine: reLine }, status:'done' };
  if (d) await setRec('documents', d._id, Object.assign({}, strip(d), rec, { docNo: d.docNo, updatedAt: Date.now() }));
  else await addRec('documents', Object.assign(rec, { docNo: nextDocNo('journalEntry', ob.date), createdAt: Date.now() }));
  if (btn) btn.disabled = false; showToast('บันทึกยอดยกมาแล้ว');
}
