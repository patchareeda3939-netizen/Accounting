/* ================= Print & PDF for documents ================= */
function loadScriptOnce(src, test) {
  if (test()) return Promise.resolve();
  return new Promise(function(res, rej) { var s = document.createElement('script'); s.src = src; s.onload = function() { res(); }; s.onerror = function() { rej(new Error('โหลดไลบรารีไม่สำเร็จ')); }; document.head.appendChild(s); });
}
function pdfLibs() {
  return Promise.all([
    loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', function() { return !!window.html2canvas; }),
    loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', function() { return !!(window.jspdf && window.jspdf.jsPDF); })
  ]);
}
function docFileName(d) { return ((d.typeLabel || 'เอกสาร') + '-' + (d.docNo || d.date || '')).replace(/[\\\/:*?"<>|\s]+/g, '_') + '.pdf'; }
function printStage(d, html) {
  ensureFormFonts();
  var st = byId('printStage');
  if (!st) { st = document.createElement('div'); st.id = 'printStage'; document.body.appendChild(st); }
  st.innerHTML = html || renderForm(d, styleFor(d.type));
  return st;
}
function printDoc(d, html, fname) {
  var st = printStage(d, html), body = st.innerHTML;
  // Open a clean print window (escapes the sandboxed frame) and send it straight to the printer dialog
  var css = Array.from(document.querySelectorAll('style')).map(function(s) { return s.textContent; }).join('\n');
  var links = Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(function(l) { return '<link rel="stylesheet" href="' + l.href + '">'; }).join('');
  var title = (d && (d.typeLabel || '') + ' ' + (d.docNo || '')) || 'เอกสาร';
  var doc = '<!doctype html><html lang="th"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' + links + '<style>' + css + '\n@page{size:A4;margin:10mm}html,body{background:#fff!important;margin:0}.pf-paper,.wt-paper{border:0!important;box-shadow:none!important;min-width:0!important;width:100%!important;margin:0 auto}@media screen{body{padding:16px}}</style></head><body>' + body +
    '<script>function go(){setTimeout(function(){window.focus();window.print();},250);}if(document.fonts&&document.fonts.ready){document.fonts.ready.then(go);}else{window.onload=go;}window.onafterprint=function(){setTimeout(function(){window.close();},200);};<\/script></body></html>';
  st.innerHTML = '';
  var w = null;
  try { var url = URL.createObjectURL(new Blob([doc], { type:'text/html' })); w = window.open(url, '_blank'); setTimeout(function() { URL.revokeObjectURL(url); }, 60000); } catch (e) { w = null; }
  if (!w) { try { w = window.open('', '_blank'); if (w) { w.document.open(); w.document.write(doc); w.document.close(); } } catch (e) { w = null; } }
  if (w) { showToast('เปิดหน้าต่างพิมพ์แล้ว เลือกเครื่องพิมพ์แล้วกดพิมพ์'); return; }
  // last resort: in-page print
  printStage(d, html); document.body.classList.add('printing-doc');
  var done = function() { document.body.classList.remove('printing-doc'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(function() { try { window.print(); } catch (e) {} setTimeout(done, 1500); }, 300);
  showToast('หากหน้าต่างพิมพ์ไม่ขึ้น ให้อนุญาตป๊อปอัปสำหรับหน้านี้ แล้วกดพิมพ์อีกครั้ง');
}
async function makeDocPdf(d, html) {
  await pdfLibs();
  var st = printStage(d, html);
  st.classList.add('pdf-render');
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await new Promise(function(r) { setTimeout(r, 200); });
    var papers = st.querySelectorAll('.pf-paper, .wt-paper');
    var pdf = new window.jspdf.jsPDF({ unit:'mm', format:'a4', orientation:'portrait' }), first = true;
    for (var pi = 0; pi < papers.length; pi++) {
      var canvas = await window.html2canvas(papers[pi], { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 794 });
      var pw = 210, ph = 297, m = 8, iw = pw - m * 2, ih = canvas.height * iw / canvas.width, maxH = ph - m * 2;
      var single = papers[pi].classList.contains('wt-paper');
      if (single || ih <= maxH) {
        var sc = ih > maxH ? maxH / ih : 1;
        if (!first) pdf.addPage(); first = false;
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', m + (iw - iw * sc) / 2, m, iw * sc, ih * sc);
        continue;
      }
      var pxPerMm = canvas.width / iw, pageHpx = Math.floor(maxH * pxPerMm);
      for (var y = 0; y < canvas.height; y += pageHpx) {
        var h = Math.min(pageHpx, canvas.height - y); if (h < 20 && y) break;
        var c = document.createElement('canvas'); c.width = canvas.width; c.height = h;
        c.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if (!first) pdf.addPage(); first = false;
        pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', m, m, iw, h / pxPerMm);
      }
    }
    return pdf.output('arraybuffer');
  } finally { st.classList.remove('pdf-render'); st.innerHTML = ''; }
}
async function downloadDocPdf(d, btn, html, fname) {
  var label = btn && btn.textContent; if (btn) { btn.disabled = true; btn.textContent = 'กำลังสร้าง PDF…'; }
  try {
    var data = new Uint8Array(await makeDocPdf(d, html)), name = fname || docFileName(d), dl = await getDownloads();
    if (dl) await dl.save({ filename: name, data: data });
    else { var u = URL.createObjectURL(new Blob([data], { type:'application/pdf' })), a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(function() { URL.revokeObjectURL(u); }, 5000); }
    showToast('สร้าง PDF แล้ว');
  } catch (e) { if (!e || e.code !== 'declined') showToast('สร้าง PDF ไม่สำเร็จ: ' + ((e && e.message) || e)); }
  finally { if (btn) { btn.disabled = false; btn.textContent = label; } }
}
function openPrintViewer(d, html, fname) {
  ensureFormFonts();
  html = html || (renderForm(Object.assign({}, d, { _copy:'original' }), styleFor(d.type)) + renderForm(Object.assign({}, d, { _copy:'copy' }), styleFor(d.type)));
  var ov = document.createElement('div');
  ov.className = 'att-viewer';
  ov.innerHTML = '<div class="att-vbox pv-box"><div class="att-vhead"><b>' + esc((d.typeLabel || 'เอกสาร') + ' ' + (d.docNo || '')) + '</b><span class="pv-btns"><button type="button" class="btn btn-dark" data-pv="print">🖨 พิมพ์</button> <button type="button" class="btn btn-outline" data-pv="pdf">⬇ PDF</button> <button type="button" class="btn btn-outline" data-pv="close">ปิด</button></span></div><div class="att-vbody pv-body">' + html + '</div></div>';
  document.body.appendChild(ov);
  var close = function() { ov.remove(); document.removeEventListener('keydown', esc1); };
  var esc1 = function(e) { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esc1);
  ov.addEventListener('click', function(e) {
    if (e.target === ov) return close();
    var a = e.target.closest && e.target.closest('[data-pv]'); if (!a) return;
    if (a.dataset.pv === 'close') close();
    else if (a.dataset.pv === 'print') printDoc(d, html, fname);
    else if (a.dataset.pv === 'pdf') downloadDocPdf(d, a, html, fname);
  });
}
