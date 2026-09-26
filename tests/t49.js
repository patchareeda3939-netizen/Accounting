const { chromium } = require('playwright'); const fs=require('fs');
(async () => { const b = await chromium.launch(); const ctx=await b.newContext({viewport:{width:1300,height:700}}); await ctx.addInitScript({content: fs.readFileSync(__dirname+'/mockdb.js','utf8')}); const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/t_view.html'); await p.waitForTimeout(500);
  await p.click('#gearBtn'); await p.click('text=สลับ / เพิ่มบริษัท'); await p.waitForTimeout(300);
  await p.screenshot({path:'cosw.png'}); console.log(errs); await b.close(); })();
