const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:800}}); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ loadStandardCoa(); await new Promise(r=>setTimeout(r,300));
    for (const [dt,t,amt,acc] of [['2026-01-10','invoice',5000,'4110'],['2026-02-15','expense',1200,'5290'],['2026-03-03','invoice',3000,'4110'],['2026-03-20','expense',800,'5290']]) await addRec('documents',{type:t,typeLabel:t,group:t==='invoice'?'customer':'supplier',party:'X',date:dt,docNo:'D'+dt,items:t==='invoice'?[{name:'a',qty:1,price:amt}]:null,vatMode:'none',subtotal:amt,vat:0,total:amt,net:amt,wht:0,extra:{account:acc,method:'เงินสด'},status:'unpaid',createdAt:Date.now()}); });
  await p.evaluate(()=>{ pageState.repPeriod='year'; openReport('incExpMonthly'); }); await p.waitForTimeout(300);
  await p.screenshot({path:'iem.png'}); console.log(errs); await b.close(); })();
