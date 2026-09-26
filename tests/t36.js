const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:1600}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ loadStandardCoa(); await new Promise(r=>setTimeout(r,300));
    await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'A',date:'2026-08-05',docNo:'I1',subtotal:1000,vat:70,total:1070,net:1070,extra:{dueDate:'2026-08-20'},status:'unpaid',createdAt:1});
    await addRec('documents',{type:'bill',typeLabel:'บิลซื้อ',group:'supplier',party:'S',date:'2026-08-06',docNo:'B1',subtotal:500,vat:35,total:535,net:535,extra:{account:'5290'},status:'unpaid',createdAt:2}); });
  await p.evaluate(()=>go('accounting','monthClose')); await p.waitForTimeout(400);
  await p.screenshot({path:'mc.png'});
  await p.click('[data-mcgo*="lockPeriod"]'); await p.waitForTimeout(300);
  await p.evaluate(()=>openDocForm('expense')); await p.waitForTimeout(200);
  console.log('dbg', errs, await p.evaluate(()=>[byId('modalFoot').innerText, lockDate()]));
  await p.fill('#f_party','X'); await p.fill('#f_date','2026-08-10'); await p.fill('#f_amount','100').catch(()=>{});
  await p.click('#modalFoot >> text=บันทึก'); await p.waitForTimeout(200);
  console.log(await p.evaluate(()=>byId('formError').innerText));
  console.log(await p.evaluate(()=>closeChecks('2026-08').map(c=>c.id+':'+c.status+' '+c.detail).join('\n')), errs); await b.close();
})();
