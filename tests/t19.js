const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:1000}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'มิน',date:todayStr(),docNo:'INV-1',items:[{name:'ก',qty:1,price:1000}],vatMode:'exclusive',subtotal:1000,vat:70,total:1070,net:1070,extra:{},status:'unpaid',createdAt:1}); openDocDetail(STORE.documents[0]._id); });
  // A: pay via payment modal (auto receipt)
  await p.click('#modalFoot >> text=รับชำระเงิน'); await p.fill('#p_amount','500'); await p.click('.modal-foot .btn-dark'); await p.waitForTimeout(200);
  let r = await p.evaluate(()=>{ const i=STORE.documents.find(x=>x.type==='invoice'); const rc=STORE.documents.filter(x=>x.type==='receipt'); return [docBal(i), rc.length, rc[0]&&rc[0].net, plTotals(STORE.documents).rev]; });
  // B: manual receipt via convert
  await p.evaluate(()=>{ openDocDetail(STORE.documents.find(x=>x.type==='invoice')._id); });
  await p.click('#modalFoot >> text=สร้างต่อ ▾'); await p.click('#rowMenu >> text=ออกใบเสร็จรับเงิน'); await p.waitForTimeout(100);
  await p.click('.modal-foot .btn-primary'); await p.waitForTimeout(200);
  let r2 = await p.evaluate(()=>{ const i=STORE.documents.find(x=>x.type==='invoice'); return [docBal(i), docStatus(i), STORE.documents.filter(x=>x.type==='receipt').length, plTotals(STORE.documents).rev, i.payments.length]; });
  // C: delete a receipt
  await p.evaluate(()=>{ openDocDetail(STORE.documents.find(x=>x.type==='receipt')._id); }); await p.click('#modalFoot >> text=ลบ'); await p.click('#modalFoot >> text=กดอีกครั้ง'); await p.waitForTimeout(200);
  let r3 = await p.evaluate(()=>{ const i=STORE.documents.find(x=>x.type==='invoice'); return [docBal(i), i.payments.length]; });
  console.log(r, r2, r3, errs); await b.close();
})();
