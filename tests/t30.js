const { chromium } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:900}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ loadStandardCoa && loadStandardCoa(); }); await p.waitForTimeout(500);
  await p.click('#gearBtn'); await p.click('text=นำเข้าข้อมูล'); await p.waitForTimeout(300);
  await p.screenshot({path:'imp1.png'});
  const tests = [
   ['invoices','เลขที่,วันที่,ลูกค้า,รายละเอียด,จำนวน,ราคา,VAT\nINV-9,01/09/2026,บริษัท A,งาน1,2,500,7\nINV-9,01/09/2026,บริษัท A,งาน2,1,1000,7\n,2026-09-05,บริษัท B,ค่าบริการ,1,300,0\n'],
   ['customers','Customer,Email,Tax ID\nบริษัท A,a@x.com,0105561234567\nบริษัท C,c@x.com,123\n'],
   ['bank','Date,Description,Amount\n2026-09-02,รับเงิน,5000\n2026-09-03,ค่าไฟ,-1200\n'],
   ['bills','Bill No,Date,Vendor,Amount\nB1,2026-09-01,ร้าน X,2000\n'],
   ['products','Product/Service Name,Type,Sales Price\nบริการ X,Service,1500\n']];
  for (const [k,csv] of tests) {
    await p.click('[data-imp="'+k+'"]'); await p.waitForTimeout(200);
    await p.setInputFiles('#impWFile',{name:'a.csv',mimeType:'text/csv',buffer:Buffer.from(csv)}); await p.waitForTimeout(300);
    if (k==='invoices') await p.screenshot({path:'imp2.png'});
    console.log(k, await p.evaluate(()=>byId('impPrev').innerText.split('\n')[1]));
    await p.click('#modalFoot >> text=นำเข้า'); await p.waitForTimeout(400);
  }
  console.log(await p.evaluate(()=>JSON.stringify([STORE.documents.map(d=>[d.type,d.docNo,d.total,d.vat,(d.items||[]).length]), STORE.contacts.length, STORE.products.length, (()=>{const t=accountBalances();return [t['1120'],t['4110']]})()])));
  console.log(errs); await b.close();
})();
