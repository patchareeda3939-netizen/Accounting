const { chromium } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:1100}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdnjs.cloudflare.com/**', r=>{ const u=r.request().url(); const f = /html2canvas/.test(u)?'/tmp/h2c/package/dist/html2canvas.min.js':'/tmp/jsp/package/dist/jspdf.umd.min.js'; r.fulfill({path:f, contentType:'text/javascript'}); });
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ await saveSettings('company',{name:'บริษัท ตัวอย่าง จำกัด',taxId:'0105550000007',legalAddress:'กรุงเทพฯ 10000',branch:'สำนักงานใหญ่'});
    await addRec('contacts',{name:'บริษัท ผู้รับจ้าง จำกัด',kind:'supplier',entity:'company',taxId:'0105550000015',address:'กรุงเทพฯ 10000'});
    await addRec('documents',{type:'expense',typeLabel:'ค่าใช้จ่าย',group:'supplier',party:'บริษัท ผู้รับจ้าง จำกัด',date:'2026-07-04',docNo:'EX-202607-001',vatMode:'none',whtRate:3,subtotal:1000,vat:0,total:1000,wht:30,net:970,extra:{method:'โอนเงิน'},createdAt:1});
    window._s=null; getDownloads=async()=>({save:async o=>{window._s=o;}}); });
  await p.evaluate(()=>openDocDetail(STORE.documents[0]._id)); await p.waitForTimeout(200);
  await p.click('#modalFoot >> text=50 ทวิ'); await p.waitForTimeout(400);
  await p.screenshot({path:'wt1.png'});
  await p.click('#modalFoot >> text=⬇ ดาวน์โหลด PDF'); await p.waitForTimeout(4000);
  const r = await p.evaluate(()=>window._s ? [window._s.filename, window._s.data.length] : null); console.log(r);
  if (r) fs.writeFileSync('/tmp/wt.pdf', Buffer.from(await p.evaluate(()=>Array.from(window._s.data))));
  await p.evaluate(()=>{closeModal(); go('tax','wht');}); await p.waitForTimeout(300);
  console.log(await p.evaluate(()=>byId('pageData').innerText.slice(0,200)), errs); await b.close();
})();
