const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ for (const r of [['4120','รายได้ค่าบริการ','รายได้'],['5310','ค่าเช่า','ค่าใช้จ่าย'],['1120','เงินฝากธนาคาร','ธนาคาร']]) await addRec('accounts',{code:r[0],name:r[1],type:r[2]});
    await addRec('documents',{type:'invoice',group:'customer',party:'A',date:todayStr(),docNo:'I1',subtotal:1000,vat:0,total:1000,net:1000,extra:{account:'4120'},status:'unpaid',createdAt:1});
    await addRec('documents',{type:'expense',group:'vendor',party:'B',date:todayStr(),docNo:'E1',subtotal:300,vat:0,total:300,net:300,extra:{account:'5310',method:'เงินสด'},createdAt:2});
    await addRec('documents',{type:'journalEntry',group:'other',party:'-',date:todayStr(),docNo:'J1',items:[{account:'5310',debit:50},{account:'1110',credit:50}],total:50,createdAt:3}); });
  await p.waitForTimeout(300);
  console.log(await p.evaluate(()=>JSON.stringify([plTotals(STORE.documents), plRows(STORE.documents), bsData('9999-12-31').equity.slice(-1)])), errs);
  for (const k of ['reports']) { try { await p.evaluate(k=>showPage(k),k); } catch(e){} }
  await b.close();
})();
