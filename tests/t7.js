const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:1000}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(async () => { const t=todayStr();
    await addRec('products',{name:'เหล็ก',kind:'goods',unit:'ตัน',price:56000,cost:40000,openingQty:4});
    await addRec('products',{name:'สายไฟ',kind:'goods',unit:'ม้วน',price:500,openingQty:0});
    await addRec('products',{name:'บริการติดตั้ง',kind:'service',price:500});
    await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'มิน',date:t,docNo:'INV-1',items:[{name:'เหล็ก',qty:1,price:56000},{name:'บริการติดตั้ง',qty:50,price:500.1}],subtotal:81005,total:81005,extra:{},status:'unpaid',createdAt:1});
    await addRec('documents',{type:'purchaseOrder',typeLabel:'ใบสั่งซื้อ',group:'supplier',party:'ร้านวัสดุ',date:t,docNo:'PO-1',items:[],total:1200,extra:{},status:'unpaid',createdAt:2});
    go('inventory'); });
  await p.waitForTimeout(200); await p.screenshot({path:'inv.png', fullPage:true});
  await p.evaluate(()=>openStockCount()); await p.fill('.cnt-in >> nth=0','5'); await p.click('.modal-foot .btn-dark'); await p.waitForTimeout(300);
  console.log(await p.evaluate(()=>STORE.documents.filter(d=>d.type==='inventoryAdjust').map(d=>d.party+d.extra.qtyChange)), errs); await b.close();
})();
