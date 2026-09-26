const { chromium } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:900}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdnjs.cloudflare.com/**', r=>{ const u=r.request().url(); const f = /html2canvas/.test(u)?'/tmp/h2c/package/dist/html2canvas.min.js':'/tmp/jsp/package/dist/jspdf.umd.min.js'; r.fulfill({path:f, contentType:'text/javascript'}); });
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'บริษัท ทดสอบ จำกัด',date:'2026-09-05',docNo:'INV-202609-001',items:[{name:'ค่าบริการที่ปรึกษา',qty:2,price:5000}],vatMode:'exclusive',subtotal:10000,vat:700,total:10700,net:10700,extra:{},status:'unpaid',createdAt:1}); window._s=null; getDownloads=async()=>({save:async o=>{window._s=o;}}); });
  await p.evaluate(()=>openDocDetail(STORE.documents[0]._id)); await p.waitForTimeout(200);
  await p.click('#modalFoot >> text=⬇ PDF'); await p.waitForTimeout(4000);
  const r = await p.evaluate(()=>window._s ? [window._s.filename, window._s.data.length] : null); console.log(r);
  if (r) { const d = await p.evaluate(()=>Array.from(window._s.data)); fs.writeFileSync('/tmp/inv.pdf', Buffer.from(d)); }
  await p.evaluate(()=>{ window.print=()=>{ window._printed = document.body.classList.contains('printing-doc') && byId('printStage').innerText.length; }; });
  await p.click('#modalFoot >> text=🖨 พิมพ์'); await p.waitForTimeout(600);
  console.log('print', await p.evaluate(()=>window._printed));
  await p.emulateMedia({media:'print'}); await p.evaluate(()=>{document.body.classList.add('printing-doc'); printStage(STORE.documents[0]);}); await p.screenshot({path:'print.png'});
  console.log(errs); await b.close();
})();
