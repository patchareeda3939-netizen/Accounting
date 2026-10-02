
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
function ocrData() {
  if (!ocr.items.length) return '<p class="empty-hint">ยังไม่มีเอกสารที่อ่าน</p>';
  return ocr.items.map(function(it, i) {
    var h = '<div class="page-block ocr-card"><div class="ocr-head"><b>' + esc(it.name) + '</b><span class="small ' + (it.err ? 'neg-text' : 'muted') + '">' + (it.err ? esc(it.err) : it.status) + '</span></div>';
    if (it.thumb) h += '<div class="ocr-body"><img class="ocr-thumb" src="' + it.thumb + '" alt="ตัวอย่างเอกสาร">';
    else h += '<div class="ocr-body"><div></div>';
    if (it.data) {
      var d = it.data, v = function(k, val, type, w) { return '<input data-ocr="' + i + ':' + k + '" value="' + esc(val == null ? '' : val) + '"' + (type ? ' type="' + type + '"' : '') + (w ? ' style="width:' + w + '"' : '') + '>'; };
      h += '<div class="ocr-form"><div class="grid-2">' +
        '<div class="field"><label>สร้างเป็น</label><select data-ocr="' + i + ':kind"><option value="expense"' + (d.kind !== 'bill' ? ' selected' : '') + '>ค่าใช้จ่าย (จ่ายแล้ว)</option><option value="bill"' + (d.kind === 'bill' ? ' selected' : '') + '>บิลซื้อ (ยังไม่จ่าย)</option></select></div>' +
        '<div class="field"><label>บัญชีค่าใช้จ่าย</label><select data-ocr="' + i + ':account"><option value="">— ค่าเริ่มต้น —</option>' + accountsFor('supplier').map(function(a) { return '<option value="' + esc(a.code) + '"' + (d.account === a.code ? ' selected' : '') + '>' + esc(a.code + ' ' + a.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>ผู้ขาย</label>' + v('vendorName', d.vendorName) + '</div><div class="field"><label>เลขผู้เสียภาษีผู้ขาย</label>' + v('vendorTaxId', d.vendorTaxId) + '</div>' +
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
  c.querySelectorAll('[data-ocr]').forEach(function(el) { el.onchange = function() { var s = el.dataset.ocr.split(':'), it = ocr.items[Number(s[0])]; it.data[s[1]] = el.value; refreshPageData(); }; });
  c.querySelectorAll('[data-ocri]').forEach(function(el) { el.onchange = function() { var s = el.dataset.ocri.split(':'), r = ocr.items[Number(s[0])].data.items[Number(s[1])]; r[s[2]] = s[2] === 'name' ? el.value : Number(el.value) || 0; refreshPageData(); }; });
  c.querySelectorAll('[data-ocrdel]').forEach(function(b) { b.onclick = function() { var s = b.dataset.ocrdel.split(':'); ocr.items[Number(s[0])].data.items.splice(Number(s[1]), 1); refreshPageData(); }; });
  c.querySelectorAll('[data-ocradd]').forEach(function(b) { b.onclick = function() { ocr.items[Number(b.dataset.ocradd)].data.items.push({ name:'', qty:1, price:0 }); refreshPageData(); }; });
  c.querySelectorAll('[data-ocrrm]').forEach(function(b) { b.onclick = function() { ocr.items.splice(Number(b.dataset.ocrrm), 1); refreshPageData(); }; });
  c.querySelectorAll('[data-ocrsave]').forEach(function(b) { b.onclick = function() { ocrCreate(Number(b.dataset.ocrsave), b); }; });
  c.querySelectorAll('[data-ocropen]').forEach(function(b) { b.onclick = function() { openDocDetail(ocr.items[Number(b.dataset.ocropen)].docId); }; });
}
async function fileToImages(f) {
  var out = [], text = '';
  if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
    var lib = await loadPdfJs(), pdf = await lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
    for (var p = 1; p <= Math.min(pdf.numPages, 3); p++) {
      var page = await pdf.getPage(p), vp = page.getViewport({ scale: 2 }), cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      out.push(await new Promise(function(r) { cv.toBlob(r, 'image/jpeg', 0.85); }));
      try { text += (await page.getTextContent()).items.map(function(x) { return x.str; }).join(' ') + '\n'; } catch (e) {}
    }
  } else {
    var url = URL.createObjectURL(f), img = new Image();
    await new Promise(function(res, rej) { img.onload = res; img.onerror = function() { rej(new Error('เปิดรูปไม่ได้ (ลองแปลงเป็น JPG)')); }; img.src = url; });
    var sc = Math.min(1, 2000 / Math.max(img.width, img.height)), cv2 = document.createElement('canvas'); cv2.width = Math.round(img.width * sc); cv2.height = Math.round(img.height * sc);
    cv2.getContext('2d').drawImage(img, 0, 0, cv2.width, cv2.height); URL.revokeObjectURL(url);
    out.push(await new Promise(function(r) { cv2.toBlob(r, 'image/jpeg', 0.85); }));
  }
  return { images: out, text: text.trim() };
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
          var text = r.text && r.text.replace(/\s/g, '').length > 40 ? r.text : '';
          if (!text) text = await tessRead(r.images, function(pct) { it.status = 'Tesseract กำลังอ่าน… ' + pct + '%'; refreshPageData(); });
          text = normThaiOcr(text); it.rawText = text;
          j = parseReceiptText(text); via = r.text && text === r.text ? 'ข้อความใน PDF' : 'Tesseract';
        }
        var items = Array.isArray(j.items) && j.items.length ? j.items.map(function(x) { return { name: String(x.name || ''), qty: Number(x.qty) || 1, price: Number(x.price) || 0 }; }) : [{ name: j.category || 'ค่าใช้จ่ายตามเอกสาร', qty: 1, price: Number(j.subtotal || j.total) || 0 }];
        var acc = ocrGuessAccount(j.category, j.vendorName, items);
        it.data = { kind: j.paid === false ? 'bill' : 'expense', vendorName: j.vendorName || '', vendorTaxId: String(j.vendorTaxId || '').replace(/\D/g, ''), vendorAddress: j.vendorAddress || '', vendorBranch: j.vendorBranch || '', docNo: j.docNo || '', date: /^\d{4}-\d{2}-\d{2}$/.test(j.date || '') ? j.date : todayStr(), dueDate: j.dueDate || '', items: items, vatMode: ['exclusive','inclusive','none'].indexOf(j.vatMode) >= 0 ? j.vatMode : 'none', total: Number(j.total) || 0, whtRate: Number(j.whtRate) || 0, account: acc };
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
  var prompt = OCR_PROMPT + (r.text ? '\n\nข้อความที่ดึงได้จาก PDF (ใช้ช่วยอ่าน):\n' + r.text.slice(0, 6000) : '');
  return await s.json(prompt, Object.assign({ modelTier: 'default' }, canImg ? { images: r.images.slice(0, (lim && lim.images && lim.images.maxCount) || 3) } : {}));
}
/* ---- Tesseract.js (runs in the browser, Thai + English) ---- */
var TESS_CDN = 'https://cdn.jsdelivr.net/npm/', _tessWorker = null;
async function tessWorker(progress) {
  if (_tessWorker) return _tessWorker;
  await loadScriptOnce(TESS_CDN + 'tesseract.js@5.1.1/dist/tesseract.min.js', function() { return !!window.Tesseract; });
  _tessWorker = window.Tesseract.createWorker('tha', 1, {
    workerPath: TESS_CDN + 'tesseract.js@5.1.1/dist/worker.min.js',
    corePath: TESS_CDN + 'tesseract.js-core@5.1.1',
    langPath: TESS_CDN + '@tesseract.js-data/tha@1.0.0/4.0.0_best_int',
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
function ocrNum(s) { var n = Number(String(s).replace(/[,\s฿]/g, '').replace(/[oO]/g, '0')); return isFinite(n) ? n : NaN; }
function normThaiOcr(t) {
  return String(t || '').replace(/\u0e4d\u0e32/g, '\u0e33').replace(/\u0e32\u0e4d/g, '\u0e33').replace(/[๐-๙]/g, function(c) { return String(c.charCodeAt(0) - 0x0e50); }).replace(/น้ามัน/g, 'น้ำมัน').replace(/จ[ํ]?ากัด/g, 'จำกัด');
}
function parseReceiptText(text) {
  text = normThaiOcr(text);
  var lines = text.split(/\r?\n/).map(function(l) { return l.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
  var all = lines.join('\n'), own = String(companySettings().taxId || '');
  var j = { items: [], vatMode: 'none' };
  // tax id: 13 digits (spaces / dashes allowed), not ours
  var tids = (all.match(/\d[\d\s-]{11,20}\d/g) || []).map(function(x) { return x.replace(/\D/g, ''); }).filter(function(x) { return x.length === 13 && x !== own; });
  j.vendorTaxId = tids[0] || '';
  // vendor: first line that looks like a business name
  var vn = lines.find(function(l) { return /บริษัท|บจก|หจก|ห้างหุ้นส่วน|ร้าน|Co\.|Ltd|Limited|Company/i.test(l) && !/ลูกค้า|customer|ผู้ซื้อ/i.test(l); }) || lines[0] || '';
  j.vendorName = vn.replace(/^(ชื่อ|ผู้ขาย|Seller)\s*[:：]?\s*/i, '').replace(/\s*(เลขประจำตัว|Tax ?ID).*$/i, '').slice(0, 120);
  var br = all.match(/(สำนักงานใหญ่|สาขา(?:ที่)?\s*\d{3,5})/); j.vendorBranch = br ? br[1] : '';
  // document number
  var dn = all.match(/(?:ใบกำกับภาษี\s*)?(?:เลขที่|เล่มที่\/เลขที่|No\.?|Invoice\s*No\.?|Receipt\s*No\.?|Doc(?:ument)?\s*No\.?)\s*[:#：]?\s*[@©®]?\s*([A-Z0-9][A-Z0-9\-\/\.]{2,})/i);
  j.docNo = dn ? dn[1] : '';
  // date
  for (var i = 0; i < lines.length && !j.date; i++) { var words = lines[i].split(' '); for (var k = 0; k < words.length; k++) { var dt = pdfDate(words.slice(k).join(' ')); if (dt) { j.date = dt.iso; break; } } }
  // money lines
  var numsOf = function(l) { return (l.match(/\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2}/g) || []).map(ocrNum).filter(function(n) { return !isNaN(n); }); };
  var pick = function(re) { var best = null; lines.forEach(function(l) { if (re.test(l)) { var ns = numsOf(l); if (ns.length) { var v = ns[ns.length - 1]; if (best == null || v > best) best = v; } } }); return best; };
  var total = pick(/รวมทั้งสิ้น|ยอดสุทธิ|จำนวนเงินรวม|ยอดรวมทั้งหมด|Grand\s*Total|Net\s*Total|Total\s*Amount|รวมเงินทั้งสิ้น|ยอดชำระ|TOTAL/i);
  var vat = null; lines.forEach(function(l) { if (/ภาษีมูลค่าเพิ่ม|VAT/i.test(l) && !/รวม.*VAT|incl/i.test(l)) { var ns = numsOf(l).filter(function(n) { return n !== 7; }); if (ns.length) vat = ns[ns.length - 1]; } });
  var sub = pick(/มูลค่าสินค้า|ก่อนภาษี|Sub\s*Total|รวมเงิน(?!ทั้งสิ้น)|Amount\s*before/i);
  if (total == null) { var mx = 0; lines.forEach(function(l) { numsOf(l).forEach(function(n) { if (n > mx) mx = n; }); }); total = mx || 0; }
  j.total = total;
  var incl = /รวม\s*(ภาษี|VAT)|VAT\s*incl|ราคารวมภาษี/i.test(all);
  if (vat && total && Math.abs(vat - total * 7 / 107) < Math.max(1, total * 0.01)) { j.vatMode = incl ? 'inclusive' : 'exclusive'; }
  else if (vat && sub && Math.abs(sub * 0.07 - vat) < 1) j.vatMode = 'exclusive';
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
function ocrGuessAccount(cat, vendor, items) {
  var txt = [cat, vendor].concat((items || []).map(function(x) { return x.name; })).join(' ');
  var list = accountsFor('supplier');
  var hit = list.find(function(a) { return a.name && txt.indexOf(a.name.replace(/^ค่า/, '')) >= 0; });
  if (hit) return hit.code;
  var map = [[/น้ำมัน|ปตท|PTT|บางจาก|เชลล์|Shell|Caltex/i, /น้ำมัน|เดินทาง|พาหนะ/], [/เช่า/, /เช่า/], [/ไฟฟ้า|ประปา|ค่าน้ำ(?!มัน)|โทรศัพท์|อินเทอร์เน็ต|\bAIS\b|\bTrue\b|\bDTAC\b/i, /สาธารณูปโภค|ไฟฟ้า|โทรศัพท์/], [/อาหาร|เครื่องดื่ม|กาแฟ|ร้านอาหาร/, /รับรอง|อาหาร/], [/เครื่องเขียน|กระดาษ|หมึก|สำนักงาน/, /วัสดุ|สำนักงาน/]];
  for (var i = 0; i < map.length; i++) if (map[i][0].test(txt)) { var a = list.find(function(x) { return map[i][1].test(x.name); }); return a ? a.code : ''; }
  return '';
}
async function ocrCreate(i, btn) {
  var it = ocr.items[i], d = it.data; if (!d) return;
  if (!d.vendorName) { showToast('ใส่ชื่อผู้ขายก่อน'); return; }
  btn.disabled = true; btn.textContent = 'กำลังสร้าง…';
  try {
    if (!STORE.contacts.some(function(c) { return c.name === d.vendorName; })) await addRec('contacts', { name: d.vendorName, kind:'supplier', entity: /บริษัท|หจก|ห้างหุ้นส่วน|จำกัด/.test(d.vendorName) ? 'company' : 'person', taxId: /^\d{13}$/.test(d.vendorTaxId) ? d.vendorTaxId : '', branch: d.vendorBranch || '', address: d.vendorAddress || '', createdAt: Date.now() });
    var att = [];
    var A = await getAssets();
    if (A) { try { att.push(attRecord(await A.upload(it.file), it.file)); } catch (e) {} }
    var t = ocrTotals(d), type = d.kind === 'bill' ? 'bill' : 'expense', def = DOC_TYPES[type], a = d.account && STORE.accounts.find(function(x) { return x.code === d.account; });
    var extra = { supInvNo: d.docNo, supInvDate: d.date, account: a ? a.code : '', expCategory: a ? a.name : '', attachments: att, note: 'อ่านจากเอกสาร ' + it.file.name, ocr: true };
    if (type === 'expense') extra.method = 'โอนเงิน'; else if (d.dueDate) extra.dueDate = d.dueDate;
    var rec = { type: type, typeLabel: def.label, group:'supplier', party: d.vendorName, date: d.date, docNo: nextDocNo(type, d.date), items: def.template === 'itemized' ? d.items.map(function(r) { return { name: r.name, qty: Number(r.qty) || 0, price: Number(r.price) || 0 }; }) : null,
      vatMode: d.vatMode, whtRate: Number(d.whtRate) || 0, subtotal: t.subtotal, vat: t.vat, total: t.total, wht: t.wht, net: t.net, extra: extra, status: def.status ? 'unpaid' : 'done', createdAt: Date.now() };
    it.docId = await addRec('documents', rec);
    if (!it.docId) { var f = STORE.documents.find(function(x) { return x.docNo === rec.docNo; }); it.docId = f && f._id; }
    showToast(def.label + ' ' + rec.docNo + ' สร้างแล้ว');
  } catch (e) { showToast('สร้างไม่สำเร็จ: ' + (e.message || e)); btn.disabled = false; btn.textContent = 'สร้างเอกสาร'; }
  refreshPageData();
}
