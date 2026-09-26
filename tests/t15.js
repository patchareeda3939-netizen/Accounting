const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:1000}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>loadStandardCoa()); await p.waitForTimeout(200);
  await p.evaluate(()=>openDocForm('invoice'));
  await p.fill('#f_party','มิน'); await p.fill('[data-f=name]','ออกแบบ'); await p.fill('[data-f=price]','1000');
  await p.selectOption('#f_acc','4120'); await p.selectOption('#f_vat','exclusive');
  await p.click('.modal-foot .btn-primary'); await p.waitForTimeout(200);
  const id = await p.evaluate(()=>STORE.documents[0]._id);
  await p.evaluate(id=>openDocDetail(id), id); await p.click('#modalFoot >> text=รับชำระเงิน');
  await p.click('[data-whtr="3"]'); await p.fill('#p_ref','TRX123'); await p.fill('#p_amount','500');
  await p.screenshot({path:'pay.png'});
  await p.click('.modal-foot .btn-dark'); await p.waitForTimeout(200);
  await p.evaluate(id=>openDocDetail(id), id); await p.waitForTimeout(100);
  await p.screenshot({path:'detail.png'});
  console.log(await p.evaluate(()=>{const d=STORE.documents[0]; return [d.extra.account,d.extra.incomeCat,docStatus(d),docBal(d)]}), errs); await b.close();
})();
