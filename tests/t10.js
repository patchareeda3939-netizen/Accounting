const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:800}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(async () => { const t=todayStr();
    await addRec('employees',{name:'สมหญิง ดี',position:'บัญชี',empType:'full',salary:25000,active:'yes',startDate:'2025-01-02'});
    await addRec('documents',{type:'weeklyTimesheet',typeLabel:'บันทึกงานรายสัปดาห์',group:'team',party:'สมหญิง ดี',date:t,docNo:'TS-1',extra:{hours:40},total:0,status:'done',createdAt:1});
    await addRec('documents',{type:'project',typeLabel:'โปรเจกต์',group:'project',party:'ติดตั้งระบบ ABC',date:'2026-09-01',docNo:'PJ-1',extra:{client:'มิน',budget:100000,endDate:'2026-10-15',manager:'สมหญิง ดี'},total:100000,status:'unpaid',createdAt:2});
    await addRec('documents',{type:'invoice',typeLabel:'ใบแจ้งหนี้',group:'customer',party:'มิน',date:t,docNo:'INV-1',subtotal:40000,vat:0,total:40000,extra:{},status:'unpaid',createdAt:3});
    go('team'); });
  await p.screenshot({path:'emp.png'});
  await p.evaluate(()=>go('project')); await p.waitForTimeout(100); await p.screenshot({path:'proj.png'});
  await p.evaluate(()=>go('project','list')); await p.click('[data-pay]'); await p.waitForTimeout(100);
  console.log(await p.evaluate(()=>STORE.documents.find(d=>d.type==='project').status), errs); await b.close();
})();
