const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:1100}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>loadStandardCoa()); await p.waitForTimeout(200);
  await p.evaluate(async()=>{ const t=todayStr();
    await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'มิน',date:t,docNo:'INV-1',items:[{name:'ก',qty:1,price:1000}],vatMode:'exclusive',subtotal:1000,vat:70,total:1070,net:1070,extra:{account:'4120'},status:'unpaid',createdAt:1});
    await addRec('documents',{type:'bill',typeLabel:'บิลซื้อ',group:'supplier',party:'ร้าน',date:t,docNo:'BL-1',items:[{name:'x',qty:1,price:500}],vatMode:'exclusive',subtotal:500,vat:35,total:535,net:535,extra:{account:'5220'},status:'unpaid',createdAt:2});
    await addRec('documents',{type:'expense',typeLabel:'ค่าใช้จ่าย',group:'supplier',party:'ไฟฟ้า',date:t,docNo:'EX-1',subtotal:200,vat:14,total:214,wht:0,net:214,extra:{method:'เงินสด',account:'5230'},status:'done',createdAt:3});
    await addRec('documents',{type:'receipt',typeLabel:'ใบเสร็จรับเงิน',group:'customer',party:'สด',date:t,docNo:'RE-9',subtotal:300,vat:21,total:321,wht:9,net:312,extra:{method:'โอนเงิน'},status:'done',createdAt:4});
    await addRec('documents',{type:'journalEntry',typeLabel:'สมุดรายวันทั่วไป',group:'other',party:'ทุน',date:t,docNo:'JV-1',items:[{account:'1120',debit:10000,credit:0},{account:'3110',debit:0,credit:10000}],total:10000,createdAt:5});
    openDocDetail(STORE.documents.find(x=>x.type==='invoice')._id); });
  await p.click('#modalFoot >> text=รับชำระเงิน'); await p.click('[data-whtr="3"]'); await p.click('.modal-foot .btn-dark'); await p.waitForTimeout(200);
  const r = await p.evaluate(()=>{ const bal=accountBalances(); let d=0,c=0; Object.values(bal).forEach(b=>{d+=b.dr;c+=b.cr;}); const bs=bsData('9999-12-31'); const sum=k=>bs[k].reduce((a,x)=>a+x.v,0); return {dr:round2(d),cr:round2(c),A:round2(sum('asset')),LE:round2(sum('liability')+sum('equity')), ar:bal['1130']}; });
  await p.evaluate(()=>openReport('bs')); await p.screenshot({path:'bs2.png', fullPage:true});
  console.log(JSON.stringify(r), errs); await b.close();
})();
