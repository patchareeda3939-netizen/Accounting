const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:900}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(400);
  await p.evaluate(()=>go('accounting','coa'));
  await p.click('text=นำเข้าจากไฟล์'); await p.click('#impStd'); await p.waitForTimeout(100);
  await p.screenshot({path:'imp.png'});
  await p.click('.modal-foot .btn-dark'); await p.waitForTimeout(500);
  const n1 = await p.evaluate(()=>STORE.accounts.length);
  await p.click('#coaCaret'); await p.click('text=ล้างข้อมูลผังบัญชี >> nth=0'); await p.fill('#clrConfirm','ล้าง');
  await p.click('.modal-foot .btn-danger'); await p.waitForTimeout(500);
  console.log(n1, await p.evaluate(()=>STORE.accounts.length), errs); await b.close();
})();
