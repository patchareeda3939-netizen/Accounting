const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:800}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(400);
  await p.evaluate(async () => { const t=todayStr();
    await addRec('documents',{type:'expense',typeLabel:'ค่าใช้จ่าย',group:'supplier',party:'ตัวอย่าง ลูกค้า',date:t,docNo:'EX-1',subtotal:393948,vat:0,total:393948,extra:{},status:'done',createdAt:1});
    await addRec('documents',{type:'bill',typeLabel:'บิลซื้อ',group:'supplier',party:'มิน',date:t,docNo:'BL-1',subtotal:2,vat:0,total:2,net:2,extra:{expCategory:'การซื้อ'},status:'unpaid',createdAt:2});
    await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'มิน',date:t,docNo:'INV-1',subtotal:100,vat:7,total:107,net:107,extra:{dueDate:'2026-09-01'},status:'unpaid',createdAt:3});
  });
  await p.click('#pillRow [data-go=billing]'); await p.waitForTimeout(200);
  await p.selectOption('[data-cat] >> nth=0','การซื้อ'); await p.waitForTimeout(200);
  await p.screenshot({path:'exp.png'});
  await p.evaluate(()=>go('sales','salesTx')); await p.click('[data-pay]'); await p.waitForTimeout(200);
  await p.evaluate(()=>go('sales')); await p.waitForTimeout(200);
  console.log(await p.evaluate(()=>STORE.documents.map(d=>d.status+'/'+(d.extra.expCategory||''))), errs); await b.close();
})();
