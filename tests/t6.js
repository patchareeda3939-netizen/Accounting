const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:600}});
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(async () => { await addRec('documents',{type:'bill',typeLabel:'บิลซื้อ',group:'supplier',party:'มิน',date:todayStr(),docNo:'BL-1',subtotal:2,vat:0,total:2,extra:{},status:'unpaid',createdAt:2}); go('billing'); });
  console.log(await p.evaluate(()=>[document.documentElement.scrollWidth, document.querySelector('.main').scrollWidth, document.querySelector('.section-content').scrollWidth]));
  await p.screenshot({path:'exp2.png'}); await b.close();
})();
