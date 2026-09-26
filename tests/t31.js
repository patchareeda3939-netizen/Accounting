const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:900}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdnjs.cloudflare.com/**', r=>r.fulfill({path: require('path').join(require.resolve('xlsx'),'../dist/xlsx.full.min.js'), contentType:'text/javascript'}));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ loadStandardCoa(); await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'A',date:'2026-09-05',docNo:'I1',subtotal:1000,vat:70,total:1070,net:1070,extra:{account:'4110'},status:'unpaid',createdAt:1}); window._saved=null; getDownloads=async()=>({save:async o=>{window._saved=o;}}); });
  await p.click('#gearBtn'); await p.click('text=ส่งออกข้อมูล'); await p.waitForTimeout(300);
  await p.screenshot({path:'exp1.png'});
  await p.click('#modalFoot >> text=ส่งออกไปยัง Excel'); await p.waitForTimeout(1500);
  console.log(await p.evaluate(()=>{ const o=window._saved; if(!o) return 'none'; const wb=XLSX.read(o.data,{type:'array'}); return [o.filename, wb.SheetNames, XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[3]]).slice(0,300)]; }));
  console.log(errs); await b.close();
})();
