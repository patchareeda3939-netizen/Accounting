const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1300,height:900}});
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/npd-bkk.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ loadStandardCoa(); }); await p.waitForTimeout(400);
  await p.evaluate(()=>go('accounting','bankTx')); await p.waitForTimeout(300);
  await p.click('text=+ เพิ่มบัญชีธนาคาร'); await p.fill('#baName','กสิกร ออมทรัพย์'); await p.fill('#baBank','ธนาคารกสิกรไทย'); await p.fill('#baNo','123-4-56789-0'); await p.fill('#baOpen','50000');
  await p.click('#modalFoot >> text=บันทึก'); await p.waitForTimeout(500);
  await p.click('[data-banktx="out"]'); await p.fill('#btAmt','1200'); await p.fill('#btParty','ค่าไฟ'); await p.click('#modalFoot >> text=บันทึก'); await p.waitForTimeout(400);
  await p.click('[data-banktx="xfer"]'); await p.selectOption('#btTo','1110'); await p.fill('#btAmt','3000'); await p.click('#modalFoot >> text=บันทึก'); await p.waitForTimeout(400);
  await p.screenshot({path:'bank.png'});
  console.log(await p.evaluate(()=>[bankBal('1121'), bankBal('1110'), bankBal('3900')]), errs); await b.close();
})();
