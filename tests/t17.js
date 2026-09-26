const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:1000}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'มิน',date:todayStr(),docNo:'INV-1',items:[{name:'ก',qty:1,price:1000}],subtotal:1000,vat:70,total:1070,net:1070,extra:{dueDate:todayStr()},status:'unpaid',createdAt:1}); openDocDetail(STORE.documents[0]._id); });
  await p.click('#modalFoot >> text=สร้างต่อ ▾'); await p.click('#rowMenu >> text=ออกใบวางบิล'); await p.waitForTimeout(100);
  await p.click('.modal-foot .btn-primary'); await p.waitForTimeout(100);
  const bn = await p.evaluate(()=>{ const d=STORE.documents.find(x=>x.type==='billingNote'); return d && [d.docNo,d.total,d.items[0].due]; });
  await p.evaluate(()=>{ openDocDetail(STORE.documents.find(x=>x.type==='invoice')._id); });
  await p.click('#modalFoot >> text=สร้างต่อ ▾'); await p.click('#rowMenu >> text=ออกใบเสร็จรับเงิน'); await p.waitForTimeout(100);
  const amt = await p.inputValue('#f_amount');
  console.log(bn, amt, errs); await b.close();
})();
