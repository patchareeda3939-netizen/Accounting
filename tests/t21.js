const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>loadStandardCoa()); await p.waitForTimeout(200);
  await p.evaluate(async()=>{ await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'มิน',date:todayStr(),docNo:'INV-1',items:[{name:'ก',qty:1,price:1000}],vatMode:'exclusive',subtotal:1000,vat:70,total:1070,net:1070,extra:{account:'4120',incomeCat:'รายได้จากการให้บริการ'},status:'unpaid',createdAt:1}); openDocDetail(STORE.documents[0]._id); });
  await p.click('#modalFoot >> text=รับชำระเงิน'); await p.fill('#p_amount','500'); await p.click('.modal-foot .btn-dark'); await p.waitForTimeout(200);
  await p.evaluate(()=>openDocForm('receipt')); await p.fill('#fx_1','INV-1'); await p.dispatchEvent('#fx_1','change');
  const f = await p.evaluate(()=>[byId('f_party').value, byId('f_acc').value, byId('f_amount').value]);
  await p.evaluate(()=>{ closeModal(); go('sales','salesTx'); }); await p.waitForTimeout(100);
  await p.screenshot({path:'stx.png'});
  console.log(await p.evaluate(()=>STORE.documents.find(x=>x.type==='receipt').extra.account), f, errs); await b.close();
})();
