const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ loadStandardCoa(); await new Promise(r=>setTimeout(r,300));
    const je=(dt,dr,cr,amt,party)=>addRec('documents',{type:'journalEntry',typeLabel:'สมุดรายวันทั่วไป',group:'other',party,date:dt,docNo:'J'+Math.random(),items:[{account:dr,debit:amt,credit:0},{account:cr,debit:0,credit:amt}],total:amt,createdAt:Date.now()});
    await je('2026-09-01','1120','3110',10000,'ทุน'); await je('2026-09-10','5290','1120',1500,'ค่าไฟ'); await je('2026-09-20','1120','4110',3000,'ขาย'); await je('2026-10-02','5290','1120',200,'ต.ค.'); });
  await p.evaluate(()=>go('accounting','reconcile')); await p.waitForTimeout(300);
  await p.screenshot({path:'rec0.png'}); await p.selectOption('#recAcc','1120'); await p.waitForTimeout(100);
  await p.fill('#recEndBal','11450'); await p.fill('#recEnd','2026-09-30'); await p.fill('#recFee','50'); await p.selectOption('#recFeeAcc','5290');
  await p.click('#recStart'); await p.waitForTimeout(400);
  await p.click('[data-rectab="all"]'); 
  const rows = await p.$$eval('[data-recc]', x=>x.length); console.log('rows', rows);
  for (const i of [0,1]) { await p.click(`.rec-row >> nth=${i}`); await p.waitForTimeout(150); }
  await p.screenshot({path:'rec1.png'});
  console.log(await p.evaluate(()=>JSON.stringify(reconCalc())));
  await p.click('.rec-row >> nth=2'); await p.waitForTimeout(150);
  console.log(await p.evaluate(()=>JSON.stringify(reconCalc())), await p.$eval('#recFinish', e=>e.disabled));
  await p.click('#recFinish'); await p.waitForTimeout(400); await p.screenshot({path:'rec2.png'});
  console.log(await p.evaluate(()=>byId('pageData').innerText.slice(0,200)), errs); await b.close();
})();
