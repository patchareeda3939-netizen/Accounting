const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(async () => { const t=todayStr();
    await addRec('contacts',{name:'มิน',kind:'customer',phone:'081'}); await addRec('products',{name:'เหล็ก',kind:'goods',cost:40000,openingQty:3});
    await addRec('employees',{name:'สมหญิง',empType:'full'});
    await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'มิน',date:t,docNo:'INV-1',items:[{name:'เหล็ก',qty:1,price:56000}],subtotal:56000,vat:3920,total:59920,net:59920,extra:{dueDate:'2026-09-01'},status:'unpaid',createdAt:1});
    await addRec('documents',{type:'bill',typeLabel:'บิลซื้อ',group:'supplier',party:'ร้าน',date:t,docNo:'BL-1',items:[{name:'เหล็ก',qty:2,price:40000}],subtotal:80000,vat:5600,total:85600,extra:{},status:'unpaid',createdAt:2});
    await addRec('documents',{type:'journalEntry',typeLabel:'สมุดรายวันทั่วไป',group:'other',party:'ทุนเริ่มต้น',date:t,docNo:'JV-1',items:[{account:'1120',debit:100000,credit:0},{account:'3110',debit:0,credit:100000}],total:100000,createdAt:3});
    await addRec('documents',{type:'weeklyTimesheet',typeLabel:'บันทึกงานรายสัปดาห์',group:'team',party:'สมหญิง',date:t,docNo:'TS-1',extra:{hours:40},createdAt:4});
    go('reports'); });
  await p.click('[data-star="arSum"]'); await p.screenshot({path:'rep.png'});
  const ids = await p.evaluate(()=>Object.keys(REPORT_NAME));
  const bad=[];
  for (const id of ids) { const r = await p.evaluate(id=>{ try { openReport(id); return document.querySelector('.rep-table') ? 'ok' : 'noTable'; } catch(e){ return e.message; } }, id); if (r!=='ok') bad.push(id+':'+r); }
  await p.evaluate(()=>openReport('bs')); await p.screenshot({path:'bs.png'});
  console.log(ids.length, bad, errs); await b.close();
})();
