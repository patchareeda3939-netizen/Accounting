// Real contact editor with isolated browser storage; no production network or writes.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({...process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{},args:['--no-sandbox']});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const html=fs.readFileSync('dist/index.html','utf8').replace(/^var FIREBASE_CONFIG = (?:null|\{[\s\S]*?\n\});$/m,'var FIREBASE_CONFIG = null;').replace(/^var FIREBASE_EMULATOR_HOST = [^\n]*;$/m,'var FIREBASE_EMULATOR_HOST = null;');
  await page.route('**/*',r=>r.request().url()==='http://127.0.0.1/'?r.fulfill({contentType:'text/html; charset=utf-8',body:html}):r.abort());
  await page.goto('http://127.0.0.1/');await page.waitForFunction(()=>typeof go==='function' && typeof STORE==='object');
  await page.evaluate(()=>go('customers'));
  await page.locator('[data-new="contacts"]').click();await page.locator('#r_name').fill('นาย ก');
  await page.locator('#r_entity').selectOption('person');
  await page.locator('#r_role_customer').uncheck();
  await page.locator('#modalFoot').getByRole('button',{name:'บันทึก',exact:true}).click();
  assert.ok((await page.locator('#formError').innerText()).includes('อย่างน้อยหนึ่ง'));
  assert.equal(await page.evaluate(()=>STORE.contacts.filter(c=>c.name==='นาย ก').length),0);
  await page.locator('#r_role_supplier').check();await page.locator('#r_role_customer').check();
  await page.locator('#modalFoot').getByRole('button',{name:'บันทึก',exact:true}).click();
  await page.waitForFunction(()=>STORE.contacts.some(c=>c.name==='นาย ก'&&c.kind==='both'));
  const id=await page.evaluate(()=>STORE.contacts.find(c=>c.name==='นาย ก')._id);
  for(const tab of ['customer','supplier']){
   await page.locator('[data-tab="'+tab+'"]').click();
   assert.ok(await page.locator('[data-contact="'+id+'"]').isVisible());
  }
  await page.locator('[data-contact="'+id+'"]').click();
  assert.ok(await page.locator('#r_role_supplier').isChecked());assert.ok(await page.locator('#r_role_customer').isChecked());
  await page.locator('#r_role_customer').uncheck();await page.locator('#modalFoot').getByRole('button',{name:'บันทึก',exact:true}).click();
  await page.waitForFunction(()=>STORE.contacts.find(c=>c.name==='นาย ก').kind==='supplier');
  await page.locator('[data-tab="customer"]').click();assert.equal(await page.locator('[data-contact="'+id+'"]').count(),0);
  await page.locator('[data-tab="supplier"]').click();await page.locator('[data-contact="'+id+'"]').click();
  assert.ok(!await page.locator('#r_role_customer').isChecked());
  await page.locator('#r_role_supplier').uncheck();await page.locator('#r_role_customer').check();
  await page.locator('#modalFoot').getByRole('button',{name:'บันทึก',exact:true}).click();
  await page.waitForFunction(()=>STORE.contacts.find(c=>c.name==='นาย ก').kind==='customer');
  await page.locator('[data-tab="customer"]').click();assert.ok(await page.locator('[data-contact="'+id+'"]').isVisible());
  await page.locator('[data-tab="supplier"]').click();assert.equal(await page.locator('[data-contact="'+id+'"]').count(),0);
  assert.equal(await page.evaluate(()=>STORE.contacts.filter(c=>c.name==='นาย ก').length),1);
  await page.evaluate(()=>{renderDatalists();});
  assert.ok(await page.locator('#dl_customers').innerHTML().then(s=>s.includes('นาย ก')));
  assert.ok(await page.locator('#dl_suppliers').innerHTML().then(s=>!s.includes('นาย ก')));
  assert.deepEqual(errors,[]);
  console.log('PASS contact roles: required selection, both/seller/buyer saves, filters, edit round-trip, one identity and document lists');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
