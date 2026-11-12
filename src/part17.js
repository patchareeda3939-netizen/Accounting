
/* ================= Document reading (OCR via Claude) — accounting:receiptCapture ================= */
var ocr = { items: [], busy: false };
function ocrEngine() { try { return localStorage.getItem('psm_ocr') || 'tess'; } catch (e) { return 'tess'; } }
var SAMPLE = null;
function getSample() { if (SAMPLE) return Promise.resolve(SAMPLE); return (window.claude && window.claude.use ? window.claude.use('sample') : Promise.resolve(null)).then(function(s) { SAMPLE = s; return s; }).catch(function() { return null; }); }
function ocrShell() {
  return '<div class="coa-bar"><div><h1 class="section-title" style="margin:0">อ่านเอกสาร (OCR)</h1><p class="section-sub">อัปโหลดรูปใบเสร็จ ใบกำกับภาษี หรือบิล (รูปภาพ/PDF) ระบบจะอ่านผู้ขาย เลขที่ วันที่ รายการ VAT และยอดรวม แล้วสร้างเป็นค่าใช้จ่ายหรือบิลให้</p></div></div>' +
    '<div class="coa-filters"><label class="date-chip">ตัวอ่าน OCR: <select id="ocrEngine"><option value="tess"' + (ocrEngine() === 'tess' ? ' selected' : '') + '>Tesseract (อ่านในเครื่อง ฟรี)</option><option value="auto"' + (ocrEngine() === 'auto' ? ' selected' : '') + '>Claude ก่อน ถ้าไม่ได้ใช้ Tesseract</option><option value="claude"' + (ocrEngine() === 'claude' ? ' selected' : '') + '>Claude อย่างเดียว</option></select></label></div>' +
    '<label class="ocr-drop" id="ocrDrop"><input type="file" id="ocrFile" accept="image/*,application/pdf" multiple hidden><span class="ocr-ic">📄</span><b>ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</b><span class="small muted">JPG, PNG, HEIC หรือ PDF · เลือกได้หลายไฟล์</span></label>';
}
var OCR_DESTINATIONS = [['expense', 'บันทึกค่าใช้จ่าย (จ่ายแล้ว)'], ['bill', 'บิลซื้อ (ยังไม่จ่าย)'], ['advance', 'เงินทดรองจ่าย (เคลียร์ใบเสร็จ)'], ['pettyCash', 'เงินสดย่อย']];
function ocrDestinationFields(d, i) {
  var html = '<div class="field"><label>บันทึกไปที่</label><select data-ocr="' + i + ':kind"' + (d._saved ? ' disabled' : '') + '>' + OCR_DESTINATIONS.map(function(x) { return '<option value="' + x[0] + '"' + (d.kind === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>';
  if (d.kind === 'pettyCash') {
    html += '<div class="field"><label>กองทุนเงินสดย่อย</label><select data-ocr="' + i + ':pettyFund"><option value="">— เลือกกองทุน —</option>' + pcFunds().map(function(f) { return '<option value="' + esc(f.id) + '"' + (d.pettyFund === f.id ? ' selected' : '') + '>' + esc(f.name) + '</option>'; }).join('') + '</select>' + (!pcFunds().length ? '<span class="small muted">ตั้งกองทุนในเมนูเงินสดย่อยก่อนบันทึก</span>' : '') + '</div>';
  } else if (d.kind === 'advance') {
    var advances = STORE.documents.filter(function(a) { return a.type === 'advance' && !a.voided && advInfo(a).st !== 'done'; });
    html += '<div class="field"><label>รายการเงินทดรองที่ใช้จ่าย</label><select data-ocr="' + i + ':advanceId"><option value="">— เลือกเงินทดรอง —</option>' + advances.map(function(a) { return '<option value="' + esc(a._id) + '"' + (d.advanceId === a._id ? ' selected' : '') + '>' + esc((a.docNo || '') + ' · ' + a.party) + '</option>'; }).join('') + '</select><span class="small muted">บันทึกใบเสร็จเป็นค่าใช้จ่ายเพื่อเคลียร์เงินทดรองที่เลือก</span></div>';
  }
  return html;
}
function ocrPaymentExtra(d) {
  if (!OCR_DESTINATIONS.some(function(x) { return x[0] === d.kind; })) throw new Error('เลือกปลายทางเอกสารก่อน');
  if (d.kind === 'bill') return d.dueDate ? { dueDate: d.dueDate } : {};
  if (d.kind === 'pettyCash') {
    var f = pcFund(d.pettyFund);
    if (!f || !f.acc) throw new Error('เลือกกองทุนเงินสดย่อยก่อน');
    return { method: 'เงินสด', bankAcc: f.acc, pettyFund: f.id };
  }
  if (d.kind === 'advance') {
    var a = STORE.documents.find(function(x) { return x._id === d.advanceId && x.type === 'advance' && !x.voided; });
    if (!a || !a.extra || !a.extra.advAcc || advInfo(a).st === 'done') throw new Error('เลือกเงินทดรองที่ยังไม่เคลียร์ก่อน');
    if (d.date < a.date) throw new Error('วันที่ค่าใช้จ่ายต้องไม่ก่อนวันที่จ่ายเงินทดรอง');
    return { method: 'เงินสด', bankAcc: a.extra.advAcc, advanceId: a._id };
  }
  return { method: 'โอนเงิน' };
}
function ocrTaxId(value) { return String(value || '').replace(/[\s-]/g, ''); }
function ocrBranchNo(value) {
  var text = String(value || '').trim();
  if (/สำนักงานใหญ่/.test(text)) return '00000';
  var m = text.match(/^(?:สาขา(?:ที่)?\s*[:：]?\s*)?(\d{1,5})$/);
  return m ? m[1].padStart(5, '0') : '';
}
function ocrVendorMatch(d) {
  return STORE.contacts.find(function(c) {
    if (d.vendorTaxId) return ocrTaxId(c.taxId) === ocrTaxId(d.vendorTaxId) && ocrBranchNo(c.branch) === ocrBranchNo(d.vendorBranch);
    return c.name === d.vendorName && ocrBranchNo(c.branch) === ocrBranchNo(d.vendorBranch);
  });
}
function ocrUseVendor(i, id) {
  var it = ocr.items[i], c = STORE.contacts.find(function(x) { return x._id === id; });
  if (!it || !it.data || it.docId || !c) return;
  Object.assign(it.data, { vendorName:c.name || '', vendorTaxId:c.taxId || '', vendorBranch:c.branch || '', vendorAddress:c.address || '' });
  refreshPageData();
}
async function ocrSaveVendor(i, btn) {
  var it = ocr.items[i]; if (!it || !it.data || it.docId) return;
  var d = it.data, tax = ocrTaxId(d.vendorTaxId), name = String(d.vendorName || '').trim();
  if (!name) throw new Error('ใส่ชื่อผู้ขายก่อน');
  if (tax && !/^\d{13}$/.test(tax)) throw new Error('เลขผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก');
  if (ocrVendorMatch(d)) return showToast('มีผู้ขายและสาขานี้ในรายชื่อแล้ว');
  if (btn) btn.disabled = true;
  try {
    await addRec('contacts', { name:name, kind:'supplier', entity:/บริษัท|หจก|ห้างหุ้นส่วน|จำกัด/.test(name) ? 'company' : 'person', taxId:tax, branch:d.vendorBranch || '', address:d.vendorAddress || '', createdAt:Date.now() });
    showToast('เพิ่มรายชื่อผู้ขายแล้ว'); refreshPageData();
  } finally { if (btn) btn.disabled = false; }
}
// RD's public VAT-search page uses this AES encoding for its public query parameters.
// These published format constants are not credentials; no API key is stored here.
async function ocrRdParam(value) {
  var enc = new TextEncoder(), key = await crypto.subtle.importKey('raw', enc.encode('V7wfrGb5XJDgdfs3'), {name:'AES-CBC'}, false, ['encrypt']);
  var result = await crypto.subtle.encrypt({name:'AES-CBC', iv:enc.encode('DwDvDB1fJlNKIlPt')}, key, enc.encode(value));
  return encodeURIComponent(btoa(String.fromCharCode.apply(null, new Uint8Array(result))));
}
function ocrRdVendor(rows, tax, branch) {
  if (!Array.isArray(rows)) throw new Error('รูปแบบผลค้นหาจากกรมสรรพากรไม่ถูกต้อง');
  var matches = rows.filter(function(r) { return r.nid === tax && ocrBranchNo(r.branchNo) === branch && !r.closeDate; });
  if (matches.length !== 1) throw new Error('ไม่พบผู้ประกอบการ VAT ที่เปิดใช้งานตรงกับเลขผู้เสียภาษีและสาขานี้');
  var r = matches[0], a = r.addressInformation || {};
  var name = r.fullName || [r.titleCode, r.firstName, r.midName, r.surName].filter(Boolean).join(' ').trim();
  if (!name) throw new Error('ผลค้นหาไม่มีชื่อผู้ประกอบการ');
  var address = [['',a.addNo],['อาคาร ',a.building],['ชั้น ',a.floorNo],['หมู่ ',a.mooNo],['ซอย ',a.soiName],['ถนน ',a.thnName],['ตำบล/แขวง ',a.tamName],['อำเภอ/เขต ',a.ampName],['จังหวัด ',a.provName],['',a.postCode]].filter(function(x) { return x[1] && x[1] !== '-'; }).map(function(x) { return x[0] + x[1]; }).join(' ');
  return {vendorName:name, vendorTaxId:tax, vendorBranch:branch === '00000' ? 'สำนักงานใหญ่' : 'สาขาที่ ' + branch, vendorAddress:address};
}
async function ocrLookupVendor(i, btn) {
  var it = ocr.items[i]; if (!it || !it.data || it.docId) return;
  var d = it.data, tax = ocrTaxId(d.vendorTaxId), branch = ocrBranchNo(d.vendorBranch);
  if (!/^\d{13}$/.test(tax)) throw new Error('ใส่เลขผู้เสียภาษี 13 หลักก่อนค้นหา');
  if (!branch) throw new Error('ระบุสาขา เช่น 00056 หรือสำนักงานใหญ่ ก่อนค้นหา');
  btn.disabled = true;
  var controller = new AbortController(), timer = setTimeout(function() { controller.abort(); }, 20000);
  try {
    var url = 'https://eservice.rd.go.th/rd-ves-service/vesweb/search/vatRegistrantsIn/1?nid=' + await ocrRdParam(tax) + '&braNo=' + await ocrRdParam(String(Number(branch)));
    var res = await fetch(url, {signal:controller.signal, credentials:'omit'});
    if (!res.ok) throw new Error('กรมสรรพากรตอบกลับ ' + res.status);
    var vendor = ocrRdVendor(await res.json(), tax, branch);
    if (ocrTaxId(d.vendorTaxId) !== tax || ocrBranchNo(d.vendorBranch) !== branch || it.docId) return;
    Object.assign(d, vendor); it.vendorLookup = 'ค้นจากกรมสรรพากรแล้ว ตรวจสอบข้อมูลก่อนเพิ่มรายชื่อ'; refreshPageData();
  } catch (e) { throw new Error('ค้นกรมสรรพากรไม่สำเร็จ: ' + (e.name === 'AbortError' ? 'หมดเวลารอ' : e.message) + ' · ใช้ลิงก์เว็บกรมสรรพากรเพื่อตรวจสอบได้'); }
  finally { clearTimeout(timer); btn.disabled = false; }
}
function ocrVendorFields(d, it, i, v) {
  return '<div class="field"><label>เลือกผู้ขายจากรายชื่อ</label><select data-ocrvendor="' + i + '"><option value="">— เลือกรายชื่อเดิม —</option>' + STORE.contacts.filter(function(c) { return c.kind !== 'customer'; }).map(function(c) { return '<option value="' + esc(c._id) + '">' + esc(c.name + ' · ' + (c.taxId || '') + ' · ' + (c.branch || 'ไม่ระบุสาขา')) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label>ผู้ขาย</label>' + v('vendorName', d.vendorName) + '</div><div class="field"><label>เลขผู้เสียภาษีผู้ขาย</label>' + v('vendorTaxId', d.vendorTaxId) + '</div>' +
    '<div class="field"><label>สาขาผู้ขาย</label>' + v('vendorBranch', d.vendorBranch) + '</div><div class="field"><label>ที่อยู่ผู้ขาย</label>' + v('vendorAddress', d.vendorAddress) + '</div>' +
    '<div class="field"><div><button type="button" class="btn btn-outline" data-ocrrd="' + i + '">ค้นจากกรมสรรพากร</button> <button type="button" class="btn btn-outline" data-ocrvendoradd="' + i + '">+ เพิ่มรายชื่อผู้ขาย</button></div><a class="small" href="https://eservice.rd.go.th/rd-ves-web/search/vat" target="_blank" rel="noopener noreferrer">เปิดเว็บตรวจสอบ VAT กรมสรรพากร</a>' + (it.vendorLookup ? '<span class="small muted">' + esc(it.vendorLookup) + '</span>' : '') + '</div>';
}
function ocrData() {
  if (!ocr.items.length) return '<p class="empty-hint">ยังไม่มีเอกสารที่อ่าน</p>';
  return ocr.items.map(function(it, i) {
    var h = '<div class="page-block ocr-card"><div class="ocr-head"><b>' + esc(it.name) + '</b><span class="small ' + (it.err ? 'neg-text' : 'muted') + '">' + (it.err ? esc(it.err) : it.status) + '</span></div>';
    if (it.thumb) h += '<div class="ocr-body"><img class="ocr-thumb" src="' + it.thumb + '" alt="ตัวอย่างเอกสาร">';
    else h += '<div class="ocr-body"><div></div>';
    if (it.data) {
      var d = it.data, v = function(k, val, type, w) { return '<input data-ocr="' + i + ':' + k + '" value="' + esc(val == null ? '' : val) + '"' + (type ? ' type="' + type + '"' : '') + (w ? ' style="width:' + w + '"' : '') + '>'; };
      h += '<div class="ocr-form"><div class="grid-2">' +
        ocrDestinationFields(d, i) +
        '<div class="field"><label>บัญชีค่าใช้จ่าย</label><select data-ocr="' + i + ':account"><option value="">— ค่าเริ่มต้น —</option>' + accountsFor('supplier').map(function(a) { return '<option value="' + esc(a.code) + '"' + (d.account === a.code ? ' selected' : '') + '>' + esc(a.code + ' ' + a.name) + '</option>'; }).join('') + '</select>' + ocrAccountHint(d, it.rawText, i) + '</div>' +
        ocrVendorFields(d, it, i, v) +
        '<div class="field"><label>เลขที่ใบกำกับ/บิล</label>' + v('docNo', d.docNo) + '</div><div class="field"><label>วันที่</label>' + v('date', d.date, 'date') + '</div>' +
        '<div class="field"><label>ราคาในเอกสาร</label><select data-ocr="' + i + ':vatMode"><option value="exclusive"' + (d.vatMode === 'exclusive' ? ' selected' : '') + '>ยังไม่รวม VAT</option><option value="inclusive"' + (d.vatMode === 'inclusive' ? ' selected' : '') + '>รวม VAT แล้ว</option><option value="none"' + (d.vatMode === 'none' ? ' selected' : '') + '>ไม่มี VAT</option></select></div>' +
        '<div class="field"><label>หัก ณ ที่จ่าย (%)</label>' + v('whtRate', d.whtRate || 0, 'number') + '</div></div>' +
        '<table class="data-table ocr-items"><thead><tr><th>รายการ</th><th class="r">จำนวน</th><th class="r">ราคา/หน่วย</th><th class="r">รวม</th><th></th></tr></thead><tbody>' +
        (d.items || []).map(function(r, k) { return '<tr><td><input data-ocri="' + i + ':' + k + ':name" value="' + esc(r.name) + '"></td><td class="r"><input type="number" step="any" data-ocri="' + i + ':' + k + ':qty" value="' + esc(r.qty) + '" style="width:70px"></td><td class="r"><input type="number" step="any" data-ocri="' + i + ':' + k + ':price" value="' + esc(r.price) + '" style="width:110px"></td><td class="r">' + fmtMoney((Number(r.qty) || 0) * (Number(r.price) || 0)) + '</td><td><button type="button" class="icon-btn" data-ocrdel="' + i + ':' + k + '" aria-label="ลบ">✕</button></td></tr>'; }).join('') +
        '</tbody></table><button type="button" class="linkish" data-ocradd="' + i + '">+ เพิ่มรายการ</button>';
      var t = ocrTotals(d);
      h += (it.rawText ? '<details class="ocr-raw"><summary>ข้อความที่อ่านได้ (OCR)</summary><pre>' + esc(it.rawText) + '</pre></details>' : '') + '<div class="ocr-sum">ก่อน VAT <b>' + fmtMoney(t.subtotal) + '</b> · VAT <b>' + fmtMoney(t.vat) + '</b> · รวม <b>' + fmtMoney(t.total) + '</b>' + (d.total && Math.abs(Number(d.total) - t.total) > 0.05 ? ' <span class="neg-text small">(เอกสารระบุ ' + fmtMoney(d.total) + ')</span>' : '') + '</div>' +
        '<div class="toolbar">' + (it.docId ? '<span class="pos-text">✓ สร้างแล้ว</span> <button type="button" class="btn btn-outline" data-ocropen="' + i + '">เปิดเอกสาร</button>' : '<button type="button" class="btn btn-dark" data-ocrsave="' + i + '">สร้างเอกสาร</button>') + '<button type="button" class="btn btn-outline" data-ocrrm="' + i + '">นำออก</button></div></div>';
    } else h += '<div class="ocr-form"><div class="small muted">' + (it.err ? '' : '<span class="ocr-spin"></span> กำลังอ่านเอกสาร…') + '</div>' + (it.err ? '<button type="button" class="btn btn-outline" data-ocrrm="' + i + '">นำออก</button>' : '') + '</div>';
    return h + '</div></div>';
  }).join('');
}
function ocrTotals(d) {
  var base = round2((d.items || []).reduce(function(s, r) { return s + (Number(r.qty) || 0) * (Number(r.price) || 0); }, 0)), sub = base, vat = 0;
  if (d.vatMode === 'exclusive') vat = round2(base * VAT_RATE); else if (d.vatMode === 'inclusive') { sub = round2(base / (1 + VAT_RATE)); vat = round2(base - sub); }
  var total = round2(sub + vat), wht = round2(sub * (Number(d.whtRate) || 0) / 100);
  return { subtotal: sub, vat: vat, total: total, wht: wht, net: round2(total - wht) };
}
function bindOcr() {
  var eg = byId('ocrEngine'); if (eg && !eg._b) { eg._b = 1; eg.onchange = function() { try { localStorage.setItem('psm_ocr', eg.value); } catch (e) {} }; }
  var inp = byId('ocrFile'), drop = byId('ocrDrop');
  if (inp && !inp._b) {
    inp._b = 1; inp.onchange = function() { ocrAddFiles(Array.from(inp.files || [])); inp.value = ''; };
    ['dragover','dragenter'].forEach(function(ev) { drop.addEventListener(ev, function(e) { e.preventDefault(); drop.classList.add('on'); }); });
    ['dragleave','drop'].forEach(function(ev) { drop.addEventListener(ev, function(e) { e.preventDefault(); drop.classList.remove('on'); }); });
    drop.addEventListener('drop', function(e) { ocrAddFiles(Array.from(e.dataTransfer.files || [])); });
  }
  var c = byId('pageData'); if (!c) return;
  c.querySelectorAll('[data-ocr]').forEach(function(el) { el.onchange = function() { var s = el.dataset.ocr.split(':'), it = ocr.items[Number(s[0])]; it.data[s[1]] = el.value; if (/^(kind|vatMode|whtRate)$/.test(s[1])) { el.onchange = null; refreshPageData(); } }; });
  c.querySelectorAll('[data-ocrvendor]').forEach(function(el) { el.onchange = function() { ocrUseVendor(Number(el.dataset.ocrvendor), el.value); }; });
  [['data-ocrrd','ocrrd',ocrLookupVendor], ['data-ocrvendoradd','ocrvendoradd',ocrSaveVendor]].forEach(function(action) {
    c.querySelectorAll('[' + action[0] + ']').forEach(function(b) { b.onclick = async function() { try { await action[2](Number(b.dataset[action[1]]), b); } catch (e) { showToast(e.message); } }; });
  });
  c.querySelectorAll('[data-ocracc]').forEach(function(b) { b.onclick = function() { var s = b.dataset.ocracc.split(':'), it = ocr.items[Number(s[0])]; if (it && it.data && !it.docId) { it.data.account = s.slice(1).join(':'); refreshPageData(); } }; });
  c.querySelectorAll('[data-ocri]').forEach(function(el) { el.onchange = function() { var s = el.dataset.ocri.split(':'), r = ocr.items[Number(s[0])].data.items[Number(s[1])]; r[s[2]] = s[2] === 'name' ? el.value : Number(el.value) || 0; refreshPageData(); }; });
  c.querySelectorAll('[data-ocrdel]').forEach(function(b) { b.onclick = function() { var s = b.dataset.ocrdel.split(':'); ocr.items[Number(s[0])].data.items.splice(Number(s[1]), 1); refreshPageData(); }; });
  c.querySelectorAll('[data-ocradd]').forEach(function(b) { b.onclick = function() { ocr.items[Number(b.dataset.ocradd)].data.items.push({ name:'', qty:1, price:0 }); refreshPageData(); }; });
  c.querySelectorAll('[data-ocrrm]').forEach(function(b) { b.onclick = function() { ocr.items.splice(Number(b.dataset.ocrrm), 1); refreshPageData(); }; });
  c.querySelectorAll('[data-ocrsave]').forEach(function(b) { b.onclick = function() { ocrCreate(Number(b.dataset.ocrsave), b); }; });
  c.querySelectorAll('[data-ocropen]').forEach(function(b) { b.onclick = function() { openDocDetail(ocr.items[Number(b.dataset.ocropen)].docId); }; });
}
// PDF.js emits positioned fragments, not necessarily one item per line.
function ocrPdfText(items) {
  var lines = [], line = [], y = null;
  function flush() { if (line.length) lines.push(line.join(' ')); line = []; }
  items.forEach(function(x) {
    if (typeof x.str !== 'string') return;
    var nextY = x.transform && x.transform[5];
    if (line.length && y != null && nextY != null && Math.abs(nextY - y) > 2) flush();
    if (x.str) line.push(x.str);
    y = nextY;
    if (x.hasEOL) flush();
  });
  flush();
  return lines.join('\n');
}
function ocrCanvasBlob(canvas) {
  return new Promise(function(resolve, reject) {
    canvas.toBlob(function(blob) { if (blob) resolve(blob); else reject(new Error('แปลงรูปไม่สำเร็จ')); }, 'image/png');
  });
}
async function fileToImages(f) {
  var out = [], texts = [];
  if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
    var lib = await loadPdfJs(), pdf = await lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
    try {
      for (var p = 1; p <= pdf.numPages; p++) {
        var page = await pdf.getPage(p);
        try {
          var vp = page.getViewport({ scale: 2 }), cv = document.createElement('canvas');
          cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
          await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
          out.push(await ocrCanvasBlob(cv));
          try { texts.push(ocrPdfText((await page.getTextContent()).items)); } catch (e) { texts.push(''); }
          cv.width = cv.height = 0;
        } finally { page.cleanup(); }
      }
    } finally { await pdf.destroy(); }
  } else {
    // Send the original pixels to OCR; a preview must not reduce OCR resolution.
    out.push(f); texts.push('');
  }
  return { images: out, pageTexts: texts, text: texts.join('\n\n').trim() };
}
async function ocrReadText(r, progress) {
  var texts = [];
  for (var i = 0; i < r.images.length; i++) {
    var text = (r.pageTexts || [])[i] || '';
    if (text.replace(/\s/g, '').length < 10) text = await tessRead([r.images[i]], progress);
    texts.push(text);
  }
  return texts.join('\n\n');
}
var OCR_PROMPT = 'คุณคือผู้ช่วยบัญชีไทย อ่านเอกสารซื้อ (ใบเสร็จ ใบกำกับภาษี บิล) จากรูป แล้วตอบเป็น JSON อย่างเดียว ไม่มีข้อความอื่น รูปแบบ:\n' +
  '{"vendorName":"ชื่อผู้ขาย/ร้าน","vendorTaxId":"เลขผู้เสียภาษี 13 หลักของผู้ขาย (ตัวเลขล้วน) หรือ \\"\\"","vendorAddress":"","vendorBranch":"เช่น สำนักงานใหญ่ หรือ สาขาที่ 00001","docNo":"เลขที่ใบกำกับ/ใบเสร็จ","date":"YYYY-MM-DD (แปลง พ.ศ. เป็น ค.ศ.)","dueDate":"YYYY-MM-DD หรือ \\"\\"",' +
  '"items":[{"name":"ชื่อรายการ","qty":1,"price":0}],"vatMode":"exclusive|inclusive|none","subtotal":0,"vat":0,"total":0,"whtRate":0,"paid":true,"category":"หมวดค่าใช้จ่ายสั้นๆ เช่น ค่าน้ำมัน ค่าอาหาร ค่าเช่า ค่าบริการ วัสดุสำนักงาน"}\n' +
  'กติกา: price เป็นราคาต่อหน่วยตามที่พิมพ์ในเอกสาร; ถ้าราคาในรายการรวม VAT แล้วให้ vatMode="inclusive"; ถ้าแยก VAT 7% ท้ายบิลให้ "exclusive"; ถ้าไม่มี VAT ให้ "none"; ถ้าเป็นใบแจ้งหนี้/บิลที่ยังไม่ชำระให้ paid=false; ตัวเลขเป็น number ไม่มีคอมมา; อ่านไม่ออกให้เว้นว่าง';
async function ocrAddFiles(files) {
  if (!files.length) return;
  var engine = (byId('ocrEngine') || {}).value || ocrEngine();
  files.forEach(function(f) {
    var it = { name: f.name, file: f, status: 'กำลังอ่าน…', data: null, err: '' };
    ocr.items.unshift(it); refreshPageData();
    (async function() {
      try {
        var r = await fileToImages(f);
        it.thumb = URL.createObjectURL(r.images[0]); refreshPageData();
        var j = null, via = '';
        if (engine !== 'tess') {
          try { j = await ocrByClaude(r); via = 'Claude'; }
          catch (ce) { if (engine === 'claude') throw ce; it.status = 'Claude อ่านไม่ได้ (' + (ce.message || ce) + ') กำลังใช้ Tesseract…'; refreshPageData(); }
        }
        if (!j) {
          var text = await ocrReadText(r, function(pct) { it.status = 'Tesseract กำลังอ่าน… ' + pct + '%'; refreshPageData(); });
          var nativeText = text === r.text; text = normThaiOcr(text); it.rawText = text;
          j = parseReceiptText(text); via = nativeText ? 'ข้อความใน PDF' : 'Tesseract';
        }
        var items = Array.isArray(j.items) && j.items.length ? j.items.map(function(x) { return { name: String(x.name || ''), qty: Number(x.qty) || 1, price: Number(x.price) || 0 }; }) : [{ name: j.category || 'ค่าใช้จ่ายตามเอกสาร', qty: 1, price: Number(j.subtotal || j.total) || 0 }];
        var acc = ocrGuessAccount(j.category, j.vendorName, items, it.rawText);
        it.data = { category: j.category || '', kind: j.paid === false ? 'bill' : 'expense', vendorName: j.vendorName || '', vendorTaxId: String(j.vendorTaxId || '').replace(/\D/g, ''), vendorAddress: j.vendorAddress || '', vendorBranch: j.vendorBranch || '', docNo: j.docNo || '', date: /^\d{4}-\d{2}-\d{2}$/.test(j.date || '') ? j.date : todayStr(), dueDate: j.dueDate || '', items: items, vatMode: ['exclusive','inclusive','none'].indexOf(j.vatMode) >= 0 ? j.vatMode : 'none', total: Number(j.total) || 0, whtRate: Number(j.whtRate) || 0, account: acc };
        var knownVendor = ocrVendorMatch(it.data);
        if (knownVendor) Object.assign(it.data, { vendorName:knownVendor.name || it.data.vendorName, vendorTaxId:knownVendor.taxId || it.data.vendorTaxId, vendorBranch:knownVendor.branch || it.data.vendorBranch, vendorAddress:knownVendor.address || it.data.vendorAddress });
        it.status = 'อ่านด้วย ' + via + ' แล้ว ตรวจสอบก่อนกดสร้างเอกสาร';
      } catch (e) { it.err = 'อ่านไม่สำเร็จ: ' + ((e && (e.message || e.code)) || e); }
      refreshPageData();
    })();
  });
}
async function ocrByClaude(r) {
  var s = await getSample();
  if (!s) throw new Error('ไม่ได้รับอนุญาตให้ถาม Claude');
  var lim = null; try { lim = await s.limits(); } catch (e) {}
  var canImg = !lim || lim.images;
  if (!canImg && !r.text) throw new Error('ส่งรูปให้ Claude ไม่ได้');
  // If image limits exclude pages, supply their complete text instead.
  var maxImages = canImg ? ((lim && lim.images && lim.images.maxCount) || r.images.length) : 0;
  var fullText = r.images.length > maxImages ? await ocrReadText(r) : r.text;
  var prompt = OCR_PROMPT + (fullText ? '\n\nข้อความจากเอกสารทุกหน้า (ใช้ช่วยอ่าน):\n' + fullText : '');
  return await s.json(prompt, Object.assign({ modelTier: 'default' }, canImg ? { images: r.images.slice(0, maxImages) } : {}));
}
/* ---- Tesseract.js (runs in the browser, Thai + English) ---- */
var TESS_CDN = 'https://cdn.jsdelivr.net/npm/', _tessWorker = null;
async function tessWorker(progress) {
  if (_tessWorker) return _tessWorker;
  await loadScriptOnce(TESS_CDN + 'tesseract.js@5.1.1/dist/tesseract.min.js', function() { return !!window.Tesseract; });
  _tessWorker = window.Tesseract.createWorker('tha+eng', 1, {
    workerPath: TESS_CDN + 'tesseract.js@5.1.1/dist/worker.min.js',
    corePath: TESS_CDN + 'tesseract.js-core@5.1.1',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    logger: function(m) { if (progress && m && m.status === 'recognizing text') progress(Math.round((m.progress || 0) * 100)); }
  });
  try { return await _tessWorker; } catch (e) { _tessWorker = null; throw new Error('โหลดตัวอ่าน Tesseract ไม่สำเร็จ'); }
}
var _tessProg = null;
async function tessRead(images, progress) {
  _tessProg = progress;
  var w = await tessWorker(function(p) { if (_tessProg) _tessProg(p); });
  var out = [];
  for (var i = 0; i < images.length; i++) { var res = await w.recognize(images[i]); out.push(res.data.text || ''); }
  var t = out.join('\n');
  if (t.replace(/\s/g, '').length < 10) throw new Error('อ่านข้อความจากรูปไม่ได้ ลองถ่ายให้ชัดและตรงขึ้น');
  return t;
}
/* ---- turn raw OCR text into document fields ---- */
function ocrNum(s) { var value = String(s).replace(/[,\s฿]/g, '').replace(/[oO]/g, '0'); if (/^\d{1,3}(?:\.\d{3})+\.\d{2}$/.test(value)) { var dot = value.lastIndexOf('.'); value = value.slice(0, dot).replace(/\./g, '') + value.slice(dot); } var n = Number(value); return isFinite(n) ? n : NaN; }
function normThaiOcr(t) {
  return String(t || '').replace(/\u0e4d\u0e32/g, '\u0e33').replace(/\u0e32\u0e4d/g, '\u0e33').replace(/[๐-๙]/g, function(c) { return String(c.charCodeAt(0) - 0x0e50); }).replace(/น้ามัน/g, 'น้ำมัน').replace(/จ[ํ]?ากัด/g, 'จำกัด');
}
// Prefer document labels, then an unlabelled identifier directly below the title.
// Branch, register, customer and telephone numbers are not invoice identifiers.
function ocrDocNo(lines) {
  var id = '([A-Z0-9][A-Z0-9\\/.-]{2,})';
  var labelled = new RegExp('(?:Invoice|Receipt|Doc(?:ument)?)\\s*(?:Number|No\\.?|#)\\s*[:#：]?\\s*' + id + '|(?:เลขที่ใบกำกับ(?:ภาษี)?|เลขที่ใบกํากับ(?:ภาษี)?|เลขใบกำกับ(?:ภาษี)?|เลขที่ใบเสร็จ|เลขที่เอกสาร|เล่มที่/เลขที่)\\s*[:#：]?\\s*' + id, 'i');
  for (var i = 0; i < lines.length; i++) {
    var m = lines[i].match(labelled);
    if (m) return m[1] || m[2];
  }
  for (var h = 0; h < lines.length; h++) {
    if (!/ใบกำกับภาษี|ใบเสร็จรับเงิน|tax\s*invoice|receipt/i.test(lines[h])) continue;
    for (var n = h + 1; n <= h + 2 && n < lines.length; n++) {
      var candidate = lines[n].match(/^([A-Z0-9][A-Z0-9/-]{5,})(?:\s+\d{3,})?$/i);
      if (candidate && /\d/.test(candidate[1]) && (/[A-Z]/i.test(candidate[1]) || /^\d{8,}$/.test(candidate[1]))) return candidate[1];
    }
  }
  var generic = new RegExp('(?:^|\\s)(?:เลขที่|No\\.?)\\s*[:#：]?\\s*' + id + '(?=\\s|$)', 'i');
  for (var k = 0; k < lines.length; k++) {
    if (/Tax\s*ID|Client\s*ID|สาขา|branch|Tel\s*:/i.test(lines[k])) continue;
    var found = lines[k].match(generic);
    if (found) return found[1];
  }
  for (var a = 0; a < Math.min(lines.length, 12); a++) {
    if (/Client\s*ID|ลูกค้า|ผู้ซื้อ|รายการ|description/i.test(lines[a])) break;
    if (/Tax\s*ID|เลข.*ภาษี|สาขา|branch|Tel|ที่อยู่|address/i.test(lines[a])) continue;
    var tokens = lines[a].match(/[A-Z0-9]{6,}(?:\s+[A-Z]\d{3,})?/ig) || [];
    for (var b = 0; b < tokens.length; b++) {
      var token = tokens[b].replace(/\s/g, '');
      if (/^[A-Z]\d{6,}(?:[A-Z]\d+)?$/i.test(token) && (token.match(/\d/g) || []).length >= 8) return token;
    }
  }
  return '';
}
function parseReceiptText(text) {
  text = normThaiOcr(text);
  var lines = text.split(/\r?\n/).map(function(l) { return l.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
  var all = lines.join('\n'), own = String(companySettings().taxId || '');
  var j = { items: [], vatMode: 'none' };
  var buyerAt = lines.findIndex(function(l) { return /ชื่อลูกค้า|ข้อมูลลูกค้า|ผู้ซื้อ|Client\s*ID|Customer(?:\s*Name)?|Bill\s*To/i.test(l); });
  var sellerLines = buyerAt >= 0 ? lines.slice(0, buyerAt) : lines;
  var sellerText = sellerLines.join('\n');
  var tids = (sellerText.match(/(?<!\d)\d(?:[ \t-]*\d){12}(?!\d)/g) || []).map(function(x) { return x.replace(/\D/g, ''); }).filter(function(x) { return x !== own; });
  j.vendorTaxId = tids[0] || '';
  var vn = sellerLines.find(function(l) { return /บริ[ษส]ั?ท|บริษัท|บจก|หจก|ห้างหุ้นส่วน|ร้าน|Co\.|Ltd|Limited|Company/i.test(l); }) || sellerLines[0] || '';
  j.vendorName = vn.replace(/^(ชื่อ|ผู้ขาย|Seller)\s*[:：]?\s*/i, '').replace(/\s*(เลขประจำตัว|เลขที่ประจำตัว|Tax ?ID).*$/i, '').slice(0, 160);
  var br = sellerText.match(/(สาขา(?:ที่)?\s*[:：]?\s*\d{1,5}|สำนักงานใหญ่)/);
  j.vendorBranch = br ? br[1] : '';
  // document number
  j.docNo = ocrDocNo(lines);
  // date
  for (var i = 0; i < lines.length && !j.date; i++) { var words = lines[i].split(' '); for (var k = 0; k < words.length; k++) { var dt = pdfDate(words.slice(k).join(' ')); if (dt) { j.date = dt.iso; break; } } }
  // Repair dotted thousands only inside complete money tokens.
  lines = lines.map(function(l) { return l.replace(/\b\d{1,3}(?:\.\d{3})+\.\d{2}\b/g, function(m) { return ocrNum(m).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }); });
  // Thermal receipts often place VAT on the left and TOTAL/CASH on the right.
  // Split labelled fields before selecting amounts so VAT Amt. cannot take TOTAL.
  var moneyLines = [];
  lines.forEach(function(l) {
    if (/^(?:CASH|CHANGE|TENDERED|PAYMENT|เงินสด|เงินทอน|รับเงิน)\b/i.test(l)) { moneyLines.push(l); return; }
    l.split(/(?=\bVAT\b|\b(?:GRAND\s+|NET\s+|SUB\s*)?TOTAL\b|\bCASH\b|\bCHANGE\b|\bW\/T\b)/i).forEach(function(part) {
      if (part.trim()) moneyLines.push(part.trim());
    });
  });
  var paymentLine = /เงินสด|เงินทอน|รับเงิน|cash|change|tendered|payment/i;
  var numsOf = function(l) { return (l.match(/\d[\d,]*\.\d{2}/g) || []).map(ocrNum).filter(function(n) { return !isNaN(n); }); };
  var pick = function(re, isTotal) { var best = null; moneyLines.forEach(function(l) { if (!paymentLine.test(l) && (!isTotal || !/sub\s*total|ก่อนภาษี|total\s*disc/i.test(l)) && re.test(l)) { var ns = numsOf(l); if (ns.length) { var v = ns[ns.length - 1]; if (best == null || v > best) best = v; } } }); return best; };
  var total = pick(/รวมทั้งสิ้น|ยอดสุทธิ|จำนวนเงินรวม|ยอดรวมทั้งหมด|Grand\s*Total|Net\s*Total|Total\s*Amount|รวมเงินทั้งสิ้น|ยอดชำระ/i, true);
  if (total == null) total = pick(/ยอดรวม|(?:^|\s)TOTAL\b/i, true);
  var vat = null;
  moneyLines.forEach(function(l) {
    if (/ภาษีมูลค่าเพิ่ม|\bVAT\b/i.test(l) && !/ก่อนภาษี|รวม.*VAT|incl|VAT\s*(?:Exc|Excl|Exclusive|Base)/i.test(l)) {
      var ns = numsOf(l); if (ns.length) vat = ns[ns.length - 1];
    }
  });
  var sub = pick(/มูลค่าสินค้า|ก่อนภาษี|Sub\s*Total|รวมเงิน(?!ทั้งสิ้น)|Amount\s*before|VAT\s*(?:Exc|Excl|Exclusive|Base)/i);
  if (total == null && sub != null && vat != null) total = round2(sub + vat);
  if (total == null) { var mx = 0; moneyLines.forEach(function(l) { if (paymentLine.test(l) || /ภาษี|VAT|sub\s*total|total\s*disc/i.test(l)) return; numsOf(l).forEach(function(n) { if (n > mx) mx = n; }); }); total = mx || 0; }
  j.total = total;
  j.vat = vat == null ? 0 : vat;
  var incl = /รวม\s*(ภาษี|VAT)|VAT\s*incl|ราคารวมภาษี/i.test(all);
  if (vat > 0 && total && Math.abs(vat - total * 7 / 107) <= 0.05) { j.vatMode = incl ? 'inclusive' : 'exclusive'; }
  else if (vat > 0 && sub && Math.abs(sub * 0.07 - vat) <= 0.05 && Math.abs(sub + vat - total) <= 0.05) j.vatMode = 'exclusive';
  // item lines: name  qty  unit price  amount
  lines.forEach(function(l) {
    if (/รวม|total|ภาษี|vat|ส่วนลด|discount|เงินทอน|change|cash|เงินสด/i.test(l)) return;
    var m = l.match(/^(.*?[^\d\s].*?)\s+(\d+(?:\.\d+)?)\s*(?:x|X|@|ชิ้น|หน่วย)?\s+(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})\s+(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})$/);
    if (m) { var q = ocrNum(m[2]), pr = ocrNum(m[3]), am = ocrNum(m[4]); if (q > 0 && Math.abs(q * pr - am) < 1) j.items.push({ name: m[1].replace(/^\d+[\.\)]\s*/, ''), qty: q, price: pr }); }
  });
  var itemsSum = j.items.reduce(function(s, r) { return s + r.qty * r.price; }, 0);
  if (!j.items.length || (total && itemsSum > total * 1.2)) {
    j.items = [];
    var base = j.vatMode === 'exclusive' ? (sub || (vat ? total - vat : total)) : total;
    j.subtotal = round2(base || 0);
  } else if (j.vatMode === 'none' && vat && Math.abs(itemsSum + vat - total) < 1) j.vatMode = 'exclusive';
  else if (j.vatMode === 'none' && vat && Math.abs(itemsSum - total) < 1) j.vatMode = 'inclusive';
  j.paid = !/ใบแจ้งหนี้|Invoice(?!.*Receipt)|ครบกำหนด|Due\s*Date/i.test(all) || /ใบเสร็จ|Receipt|ชำระแล้ว|PAID/i.test(all);
  j.category = '';
  return j;
}
// Rank against the company's own expense accounts; descriptions outrank vendors.
function ocrAccountSuggestions(cat, vendor, items, rawText) {
  var list = accountsFor('supplier'), found = {};
  var rules = [
    [/โทรศัพท์|ค่าโทร|มือถือ|แพ็กเกจ|telephone|mobile|\bAIS\b|\bDTAC\b/i, [/โทรศัพท์|สื่อสาร/, /สาธารณูปโภค/], 'ค่าโทรศัพท์'],
    [/อินเทอร์เน็ต|อินเตอร์เน็ต|internet|broadband|wifi/i, [/อินเทอร์เน็ต|อินเตอร์เน็ต/, /สื่อสาร|โทรศัพท์/, /สาธารณูปโภค/], 'ค่าอินเทอร์เน็ต'],
    [/ค่าไฟ|ไฟฟ้า|electricity/i, [/ไฟฟ้า/, /สาธารณูปโภค/], 'ค่าไฟฟ้า'],
    [/ค่าน้ำ(?!มัน)|ประปา|water bill/i, [/ประปา|ค่าน้ำ(?!มัน)/, /สาธารณูปโภค/], 'ค่าน้ำประปา'],
    [/น้ำมัน|ปตท|\bPTT\b|บางจาก|Shell|Caltex|fuel/i, [/น้ำมัน/, /เดินทาง|พาหนะ/], 'ค่าน้ำมัน'],
    [/ค่าเช่า|rent(?:al)?/i, [/เช่า/], 'ค่าเช่า'],
    [/อาหาร|เครื่องดื่ม|กาแฟ|restaurant|coffee/i, [/อาหาร|เครื่องดื่ม/, /รับรอง/], 'ค่าอาหารและเครื่องดื่ม'],
    [/เครื่องเขียน|กระดาษ|หมึกพิมพ์|วัสดุสำนักงาน|stationery/i, [/วัสดุสำนักงาน|เครื่องเขียน/, /วัสดุ/], 'วัสดุสำนักงาน'],
    [/ค่าเดินทาง|แท็กซี่|taxi|ค่าทางด่วน|ค่าที่พัก|โรงแรม/i, [/เดินทาง|พาหนะ/, /ที่พัก/], 'ค่าเดินทาง'],
    [/ซ่อม|บำรุงรักษา|repair|maintenance/i, [/ซ่อม|บำรุง/], 'ค่าซ่อมบำรุง'],
    [/โฆษณา|advertising/i, [/โฆษณา|การตลาด/], 'ค่าโฆษณา'],
    [/ค่าธรรมเนียม|bank fee/i, [/ธรรมเนียม/], 'ค่าธรรมเนียม']
  ];
  var sources = [[cat || '', 100, 'หมวดที่อ่านได้'], [(items || []).map(function(x) { return x.name || ''; }).filter(function(n) { return !/^(ค่าใช้จ่ายตามเอกสาร|ค่าบริการ)$/.test(n); }).join(' '), 90, 'รายการในเอกสาร'], [rawText || '', 60, 'ข้อความ OCR'], [vendor || '', 40, 'ชื่อผู้ขาย']];
  function add(a, score, reason) { if (!found[a.code] || found[a.code].score < score) found[a.code] = { code: a.code, name: a.name, score: score, reason: reason }; }
  sources.forEach(function(src) {
    if (!src[0]) return;
    // Raw text includes buyer addresses. Only category/items may directly match names.
    if (src[1] >= 90) list.forEach(function(a) {
      var name = String(a.name || '').replace(/^ค่า/, '').trim();
      if (name.length >= 4 && !/^(ใช้จ่าย|บริการ|อื่นๆ|อื่น ๆ)$/.test(name) && src[0].indexOf(name) >= 0) add(a, src[1] + 5, src[2] + 'ตรงกับ ' + a.name);
    });
    rules.forEach(function(rule) {
      if (!rule[0].test(src[0])) return;
      for (var i = 0; i < rule[1].length; i++) {
        var matches = list.filter(function(a) { return rule[1][i].test(a.name || ''); });
        if (matches.length) { matches.forEach(function(a) { add(a, src[1] - i * 2, src[2] + 'ระบุ' + rule[2]); }); break; }
      }
    });
  });
  return Object.keys(found).map(function(k) { return found[k]; }).sort(function(a, b) { return b.score - a.score || String(a.code).localeCompare(String(b.code)); }).slice(0, 3);
}
function ocrGuessAccount(cat, vendor, items, rawText) {
  var suggestions = ocrAccountSuggestions(cat, vendor, items, rawText);
  // Ambiguous recommendations remain suggestions until the user chooses.
  return suggestions.length && (!suggestions[1] || suggestions[0].score > suggestions[1].score) ? suggestions[0].code : '';
}
function ocrAccountHint(d, rawText, i) {
  var suggestions = ocrAccountSuggestions(d.category, d.vendorName, d.items, rawText);
  if (!suggestions.length) return '<span class="small muted">ยังไม่มีข้อมูลพอแนะนำบัญชี เลือกบัญชีค่าใช้จ่ายเองได้</span>';
  return '<div class="small muted">บัญชีที่แนะนำ (เลือกเปลี่ยนได้)</div>' + suggestions.map(function(a) { return '<div class="small"><button type="button" class="linkish" data-ocracc="' + i + ':' + esc(a.code) + '">' + esc(a.code + ' ' + a.name) + '</button> · ' + esc(a.reason) + '</div>'; }).join('');
}
async function ocrCreate(i, btn) {
  var it = ocr.items[i], d = it.data; if (!d || it.docId) return;
  if (!d.vendorName) { showToast('ใส่ชื่อผู้ขายก่อน'); return; }
  var payment;
  try { payment = ocrPaymentExtra(d); } catch (e) { showToast(e.message); return; }
  btn.disabled = true; btn.textContent = 'กำลังสร้าง…';
  try {
    if (!ocrVendorMatch(d)) await addRec('contacts', { name: d.vendorName, kind:'supplier', entity: /บริษัท|หจก|ห้างหุ้นส่วน|จำกัด/.test(d.vendorName) ? 'company' : 'person', taxId: /^\d{13}$/.test(d.vendorTaxId) ? d.vendorTaxId : '', branch: d.vendorBranch || '', address: d.vendorAddress || '', createdAt: Date.now() });
    var att = [];
    var A = await getAssets();
    if (A) { try { att.push(attRecord(await A.upload(it.file), it.file)); } catch (e) {} }
    var t = ocrTotals(d), type = d.kind === 'bill' ? 'bill' : 'expense', def = DOC_TYPES[type], a = d.account && STORE.accounts.find(function(x) { return x.code === d.account; });
    var extra = { supInvNo: d.docNo, supInvDate: d.date, account: a ? a.code : '', expCategory: a ? a.name : '', attachments: att, note: 'อ่านจากเอกสาร ' + it.file.name, ocr: true };
    Object.assign(extra, payment, { vendorTaxId:ocrTaxId(d.vendorTaxId), vendorBranch:d.vendorBranch || '', vendorAddress:d.vendorAddress || '' });
    var vendorContact = ocrVendorMatch(d);
    var rec = { type: type, typeLabel: def.label, group:'supplier', contactId:vendorContact && vendorContact._id || '', party: d.vendorName, date: d.date, docNo: nextDocNo(type, d.date), items: def.template === 'itemized' ? d.items.map(function(r) { return { name: r.name, qty: Number(r.qty) || 0, price: Number(r.price) || 0 }; }) : null,
      vatMode: d.vatMode, whtRate: Number(d.whtRate) || 0, subtotal: t.subtotal, vat: t.vat, total: t.total, wht: t.wht, net: t.net, extra: extra, status: def.status ? 'unpaid' : 'done', createdAt: Date.now() };
    it.docId = await addRec('documents', rec);
    if (!it.docId) { var f = STORE.documents.find(function(x) { return x.docNo === rec.docNo; }); it.docId = f && f._id; }
    if (it.docId) d._saved = true;
    showToast(def.label + ' ' + rec.docNo + ' สร้างแล้ว');
  } catch (e) { showToast('สร้างไม่สำเร็จ: ' + (e.message || e)); btn.disabled = false; btn.textContent = 'สร้างเอกสาร'; }
  refreshPageData();
}
