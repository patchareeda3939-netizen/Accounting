const { chromium } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:1100}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ loadStandardCoa(); await saveSettings('company',{name:'PSM',legalName:'บริษัท ตัวอย่าง จำกัด',taxId:'0105550000007',legalAddress:'กรุงเทพฯ 10400',branch:'สำนักงานใหญ่'});
    await addRec('contacts',{name:'ร้านผู้รับจ้าง',kind:'supplier',entity:'person',taxId:'1100000000008',address:'นนทบุรี'});
    await addRec('documents',{type:'bill',typeLabel:'บิลซื้อ',group:'supplier',party:'ร้านผู้รับจ้าง',date:'2026-09-01',docNo:'BL-1',items:[{name:'ค่าจ้าง',qty:1,price:10000}],vatMode:'none',whtRate:3,subtotal:10000,vat:0,total:10000,wht:300,net:9700,extra:{},status:'unpaid',createdAt:1}); });
  await p.waitForTimeout(300);
  await p.evaluate(()=>openPayment(STORE.documents.find(d=>d.type==='bill'))); await p.waitForTimeout(300);
  const ids = await p.evaluate(()=>Array.from(document.querySelectorAll('#modalBody input,#modalBody select')).map(e=>e.id+'='+e.value).join(' '));
  console.log(ids);
  await p.fill('#p_date','2026-09-15'); 
  await p.click('#modalFoot >> text=บันทึก'); await p.waitForTimeout(1500);
  console.log(await p.evaluate(()=>byId('modalTitle').innerText));
  await p.screenshot({path:'wt2.png', fullPage:false});
  console.log(await p.evaluate(()=>{ const b=STORE.documents.find(d=>d.type==='bill'); const t=accountBalances(); return JSON.stringify([docBal(b), b.status, t['2110'], t['2130']]); }));
  console.log(await p.evaluate(()=>{ const v=byId('wtView'); return v? v.innerText.match(/ลงชื่อ[\s\S]{0,120}/)[0] : ''; }), errs); await b.close();
})();
