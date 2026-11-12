const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let accounts = [
  {code:'5230',name:'ค่าสาธารณูปโภค'}, {code:'5330',name:'ค่าโทรศัพท์'},
  {code:'5340',name:'ค่าไฟฟ้า'}, {code:'5350',name:'วัสดุสำนักงาน'},
  {code:'5360',name:'ค่าน้ำมัน'}, {code:'5370',name:'ค่าอาหาร'},
  {code:'5380',name:'ค่าซ่อมบำรุง'}, {code:'5390',name:'ค่าเช่า'}
];
const ctx=vm.createContext({accountsFor:()=>accounts,esc:s=>String(s).replace(/</g,'&lt;').replace(/"/g,'&quot;')});
vm.runInContext(fs.readFileSync('src/part17.js','utf8'),ctx);
const guess=(cat='',vendor='',names=[],raw='')=>ctx.ocrGuessAccount(cat,vendor,names.map(name=>({name})),raw);
assert.equal(guess('', 'ร้านบริการ', ['ค่าโทรศัพท์เดือนตุลาคม']), '5330');
assert.equal(guess('ค่าอาหาร','Shell',['ค่าอาหาร']), '5370','item/category evidence outranks vendor brand');
assert.equal(guess('', 'บริษัททั่วไป', ['กระดาษ A4']), '5350');
assert.equal(guess('', '', ['ค่าซ่อมเครื่องพิมพ์']), '5380');
assert.equal(guess('', '', ['ค่าน้ำมันดีเซล']), '5360');
assert.equal(guess('', '', [], 'ค่าไฟฟ้า 1000.00'), '5340');
assert.equal(guess('', 'บริษัท สำนักงาน จำกัด', ['ค่าใช้จ่ายตามเอกสาร']), '', 'office address/name is not office supplies');
assert.equal(guess('', 'True Money', ['ค่าบริการ']), '', 'payment intermediary does not identify expense purpose');
const recommendations=ctx.ocrAccountSuggestions('', '', [{name:'ค่าโทรศัพท์'}], '');
assert.equal(recommendations[0].code,'5330');assert.ok(recommendations[0].reason.includes('รายการในเอกสาร'));
const manual={category:'',vendorName:'',items:[{name:'ค่าโทรศัพท์'}],account:'5390'};
const hint=ctx.ocrAccountHint(manual,'',0);
assert.ok(hint.includes('data-ocracc="0:5330"'));assert.equal(manual.account,'5390','rendering recommendations preserves manual selection');
accounts=accounts.filter(a=>a.code!=='5330');
assert.equal(guess('', '', ['ค่าโทรศัพท์']), '5230','use available utilities account when no dedicated account');
accounts.push({code:'5231',name:'ค่าสาธารณูปโภคสาขา'});
assert.equal(guess('', '', ['ค่าโทรศัพท์']), '', 'ambiguous account remains unselected');
accounts=[];assert.equal(guess('ค่าโทรศัพท์'), '');
assert.ok(ctx.ocrAccountHint(manual,'',0).includes('หมวดที่แนะนำ: ค่าโทรศัพท์'));
assert.ok(ctx.ocrAccountHint({items:[{name:'DIESEL B7'}]},'',0).includes('ค่าน้ำมัน'));
assert.ok(ctx.ocrAccountHint({items:[{name:'บริการ'}]},'',0).includes('ยังไม่มีข้อมูลพอ'));
console.log('PASS OCR account suggestions: ranked evidence, available accounts, reasons, manual choices, ambiguity and no evidence');
