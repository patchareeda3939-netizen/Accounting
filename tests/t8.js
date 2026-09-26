const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:1000}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(async () => {
    await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'มิน',date:'2026-07-10',docNo:'INV-1',subtotal:50000,vat:3500,total:53500,extra:{},status:'unpaid',createdAt:1});
    await addRec('documents',{type:'bill',typeLabel:'บิลซื้อ',group:'supplier',party:'ร้าน',date:'2026-08-03',docNo:'BL-1',subtotal:10000,vat:700,total:10700,extra:{},status:'unpaid',createdAt:2});
    go('tax'); });
  await p.click('[data-prep="2026-07"]'); await p.click('.modal-foot .btn-dark'); await p.waitForTimeout(200);
  await p.click('.tax-act[data-pay="2026-07"]'); await p.click('.modal-foot .btn-dark'); await p.waitForTimeout(200);
  await p.screenshot({path:'tax.png'});
  console.log(await p.evaluate(()=>JSON.stringify(STORE.taxReturns)), errs); await b.close();
})();
