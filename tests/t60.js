const { chromium } = require('playwright');
const map = u => { const m=u.split('cdn.jsdelivr.net/npm/')[1]; let base='/tmp/tj/';
  if (m.startsWith('tesseract.js@5.1.1/')) return base+'tesseract.js-5.1.1/package/'+m.slice('tesseract.js@5.1.1/'.length);
  if (m.startsWith('tesseract.js-core@5.1.1/')) return base+'tesseract.js-core-5.1.1/package/'+m.slice('tesseract.js-core@5.1.1/'.length);
  if (m.startsWith('@tesseract.js-data/tha@1.0.0/')) return base+'tesseract.js-data-tha-1.0.0/package/'+m.slice('@tesseract.js-data/tha@1.0.0/'.length); };
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:1100}}); const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('console', m=>{ if(m.type()==='error') errs.push('console:'+m.text()); });
  await p.route('https://cdn.jsdelivr.net/**', r=>{ const f=map(r.request().url()); const ct = /\.wasm$/.test(f)?'application/wasm':/\.gz$/.test(f)?'application/gzip':'text/javascript'; r.fulfill({path:f, contentType:ct, headers:{'access-control-allow-origin':'*'}}); });
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300); await p.evaluate(()=>loadStandardCoa()); await p.waitForTimeout(300);
  await p.evaluate(()=>go('accounting','receiptCapture')); await p.waitForTimeout(200);
  await p.setInputFiles('#ocrFile','/tmp/rc_th.jpg');
  for (let i=0;i<60;i++){ await p.waitForTimeout(1000); const s=await p.evaluate(()=>ocr.items[0] && (ocr.items[0].data||ocr.items[0].err)); if (s) break; }
  console.log(await p.evaluate(()=>JSON.stringify([ocr.items[0].err, ocr.items[0].status, ocr.items[0].data, (ocr.items[0].rawText||'').slice(0,400)])));
  await p.screenshot({path:'tess.png'}); console.log(errs.slice(0,5)); await b.close(); })();
