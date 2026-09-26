const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(async () => {
    await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'มิน',date:'2026-08-10',docNo:'INV-1',subtotal:50000,vat:3500,total:53500,extra:{},status:'unpaid',createdAt:1});
    await addRec('documents',{type:'expense',typeLabel:'ค่าใช้จ่าย',group:'supplier',party:'ร้าน',date:'2026-08-03',docNo:'EX-1',subtotal:1000,vat:0,total:1000,extra:{},createdAt:2});
    go('tax'); });
  await p.click('[data-rmenu="2026-08"]'); await p.waitForTimeout(100);
  await p.screenshot({path:'menu.png'});
  for (const t of ['ดู VAT รายละเอียด','ดูรายละเอียดการยกเว้น','ดูธุรกรรมตามรหัสภาษี','ดูสรุป']) { await p.click('[data-rmenu="2026-08"]'); await p.click('#rowMenu >> text='+t); await p.waitForTimeout(100); if(t==='ดูธุรกรรมตามรหัสภาษี') await p.click('[data-tc="3"]'); await p.click('#modalClose'); }
  console.log(errs); await b.close();
})();
