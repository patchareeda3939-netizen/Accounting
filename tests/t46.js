const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:1300}}); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ await addRec('documents',{type:'expense',typeLabel:'ค่าใช้จ่าย',group:'supplier',party:'X',date:'2026-07-04',docNo:'EX1',vatMode:'none',whtRate:3,subtotal:1000,vat:0,total:1000,wht:30,net:970,extra:{},createdAt:1}); openWhtCert(whtCerts()[0]); });
  await p.selectOption('#wtCopy','1'); await p.selectOption('#wtInc','6'); await p.fill('#wtOther','ค่าจ้างออกแบบโลโก้'); await p.waitForTimeout(300);
  await p.press('#wtOther','Tab'); await p.waitForTimeout(300); const h = await p.evaluate(()=>byId('wtView').innerHTML); await p.setContent('<meta charset=utf-8><style>'+await p.evaluate(()=>Array.from(document.querySelectorAll('style')).map(s=>s.textContent).join(''))+'</style>'+h); const el = await p.$('.wt-tbl'); await el.screenshot({path:'wt6.png'});
  console.log(errs); await b.close(); })();
