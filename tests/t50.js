const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:800}}); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>go('alldocs')); await p.waitForTimeout(200); console.log('A', (await p.evaluate(()=>byId('sectionContent').innerText)).slice(0,60));
  await p.evaluate(()=>go('alldocs','batch')); await p.waitForTimeout(200); console.log('B', (await p.evaluate(()=>byId('sectionContent').innerText)).slice(0,60));
  await p.evaluate(()=>go('accounting','batchTx')); await p.waitForTimeout(200); console.log('C', (await p.evaluate(()=>byId('sectionContent').innerText)).slice(0,80));
  await p.click('#sidebarFeedBtn'); await p.waitForTimeout(200); await p.screenshot({path:'ad.png'}); console.log(errs); await b.close(); })();
