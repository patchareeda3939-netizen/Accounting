const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>loadStandardCoa()); await p.waitForTimeout(400);
  await p.evaluate(()=>go('accounting','batchTx')); await p.waitForTimeout(300);
  await p.fill('[data-bi="0"][data-bk="party"]','บริษัท A'); await p.fill('[data-bi="0"][data-bk="amount"]','1000'); await p.press('[data-bi="0"][data-bk="amount"]','Tab');
  await p.fill('[data-bi="1"][data-bk="party"]','บริษัท B'); await p.fill('[data-bi="1"][data-bk="amount"]','2140'); await p.selectOption('[data-bi="1"][data-bk="vat"]','inclusive');
  await p.fill('[data-bi="2"][data-bk="amount"]','50');
  await p.waitForTimeout(200); await p.screenshot({path:'batch1.png'});
  await p.click('#batchSave'); await p.waitForTimeout(300);
  console.log(await p.evaluate(()=>byId('pageData').innerText.slice(0,120)));
  await p.fill('[data-bi="2"][data-bk="party"]','C'); await p.click('#batchSave'); await p.waitForTimeout(600);
  await p.screenshot({path:'batch2.png'});
  console.log(await p.evaluate(()=>JSON.stringify([STORE.documents.map(d=>[d.docNo,d.party,d.total]), accountBalances()['4110']])), errs); await b.close();
})();
