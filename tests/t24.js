const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ for (const r of [['1150','ภาษีซื้อ','curAsset'],['2120','ภาษีขาย','curLiab'],['4120','รายได้จากการให้บริการ','income'],['2125','ภาษีขายยังไม่ถึงกำหนดชำระ','curLiab']]) await addRec('accounts',{code:r[0],name:r[1],accType:r[2],type:subtypeBase(r[2])});
    await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'มิน',date:'2026-08-15',docNo:'INV-OLD',items:[{name:'บริการ',qty:1,price:1000}],vatMode:'exclusive',subtotal:1000,vat:70,total:1070,net:1070,extra:{account:'4120'},status:'unpaid',createdAt:1}); });
  await p.waitForTimeout(1500);
  console.log(await p.evaluate(()=>[vatSummary('2026-08').out, JSON.stringify(accountBalances()['2125']), STORE.accounts.filter(a=>/^(2125|1155)$/.test(a.code)).map(a=>a.name).join(',')]), errs); await b.close();
})();
