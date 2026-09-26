const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:800}}); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ loadStandardCoa(); await new Promise(r=>setTimeout(r,300));
    await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'A',date:'2026-01-10',docNo:'I1',items:[{name:'a',qty:1,price:5000}],vatMode:'exclusive',subtotal:5000,vat:350,total:5350,net:5350,extra:{account:'4110'},payments:[{date:'2026-02-05',method:'โอนเงิน',amount:5350,wht:0,fee:0}],status:'paid',createdAt:1});
    await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'B',date:'2026-02-10',docNo:'I2',items:[{name:'a',qty:1,price:9000}],vatMode:'none',subtotal:9000,vat:0,total:9000,net:9000,extra:{account:'4110'},status:'unpaid',createdAt:2});
    await addRec('documents',{type:'expense',typeLabel:'ค่าใช้จ่าย',group:'supplier',party:'X',date:'2026-03-03',docNo:'E1',vatMode:'none',subtotal:1000,vat:0,total:1000,wht:30,net:970,extra:{account:'5290',method:'เงินสด'},createdAt:3});
    await addRec('documents',{type:'journalEntry',typeLabel:'JE',group:'other',party:'โอน',date:'2026-03-04',docNo:'J1',items:[{account:'1110',debit:500,credit:0},{account:'1120',debit:0,credit:500}],total:500,createdAt:4}); });
  console.log(await p.evaluate(()=>JSON.stringify(cashFlowLines().map(f=>[f.date,f.amt,f.cat])))); console.log(errs); await b.close(); })();
