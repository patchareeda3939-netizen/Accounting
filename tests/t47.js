const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:1300}}); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ await addRec('documents',{type:'expense',typeLabel:'ค่าใช้จ่าย',group:'supplier',party:'X',date:'2026-07-04',docNo:'EX1',vatMode:'none',whtRate:3,subtotal:1000,vat:0,total:1000,wht:30,net:970,extra:{},createdAt:1}); openWhtCert(whtCerts()[0]); });
  
  const rowOf = () => p.evaluate(()=>{ const tr=document.querySelector('#wtView tr.wt-on'); return tr ? tr.innerText.replace(/\s+/g,' ').slice(0,90) : 'none'; });
  for (const v of ['1','3','4a']) { await p.selectOption('#wtInc', v); await p.waitForTimeout(100); console.log(v, await rowOf()); }
  await p.selectOption('#wtInc','6'); await p.fill('#wtOther','ค่าจ้างออกแบบโลโก้'); await p.waitForTimeout(100); console.log('6', await rowOf());
  await p.click('#modalFoot >> text=💾 บันทึก'); await p.waitForTimeout(400);
  await p.evaluate(()=>{ closeModal(); openWhtCert(whtCerts()[0]); });  await p.waitForTimeout(200);
  console.log('reopen', await rowOf(), await p.evaluate(()=>byId('wtSaved').innerText), errs); await b.close(); })();
