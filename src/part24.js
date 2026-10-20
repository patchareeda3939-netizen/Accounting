/* ---- Bank rules (auto categorise) ---- */
var RULE_FIELDS = { desc:'คำอธิบาย', amount:'จำนวนเงิน', ref:'เลขอ้างอิง' };
var RULE_OPS = { contains:'มีคำว่า', notContains:'ไม่มีคำว่า', is:'ตรงกับ', starts:'ขึ้นต้นด้วย', eq:'เท่ากับ', gt:'มากกว่า', lt:'น้อยกว่า' };
function rulesList() { var s = STORE.settings.find(function(x) { return x._id === 'rules'; }); return ((s && s.list) || []).slice().sort(function(a, b) { return (a.order || 0) - (b.order || 0); }); }
async function saveRules(list) { list.forEach(function(r, i) { r.order = i; }); await saveSettings('rules', { list: list }); }
function ruleCondOk(c, st) {
  var v = c.value == null ? '' : String(c.value);
  if (c.field === 'amount') { var a = Math.abs(Number(st.amt) || 0), n = Number(v) || 0; return c.op === 'gt' ? a > n : c.op === 'lt' ? a < n : Math.abs(a - n) < 0.005; }
  var t = String((c.field === 'ref' ? st.ref : st.desc) || '').toLowerCase(), q = v.toLowerCase().trim();
  if (!q) return true;
  return c.op === 'notContains' ? t.indexOf(q) < 0 : c.op === 'is' ? t.trim() === q : c.op === 'starts' ? t.trim().indexOf(q) === 0 : t.indexOf(q) >= 0;
}
function ruleFor(st, bankCode) {
  return rulesList().find(function(r) {
    if (r.off) return false;
    if (r.dir === 'in' && !(st.amt > 0)) return false;
    if (r.dir === 'out' && !(st.amt < 0)) return false;
    if (r.bank && bankCode && r.bank !== bankCode) return false;
    var cs = (r.conds || []).filter(function(c) { return c.field === 'amount' || String(c.value || '').trim(); });
    if (!cs.length) return false;
    return r.match === 'any' ? cs.some(function(c) { return ruleCondOk(c, st); }) : cs.every(function(c) { return ruleCondOk(c, st); });
  }) || null;
}
function ruleCondText(r) { return (r.conds || []).map(function(c) { return RULE_FIELDS[c.field] + ' ' + RULE_OPS[c.op] + ' "' + c.value + '"'; }).join(r.match === 'any' ? ' หรือ ' : ' และ '); }
pageState.ruleQ = '';
function rulesShell() {
  return '<div class="small muted" style="margin-bottom:4px">การบัญชี / กฎ</div><div class="tx-head"><h1 class="section-title">กฎ</h1><div class="coa-actions"><button class="btn btn-dark" type="button" onclick="openRuleForm(null)">สร้างกฎใหม่</button></div></div>' +
    '<p class="section-sub" style="margin-top:-6px">ตั้งกฎจัดหมวดหมู่อัตโนมัติสำหรับรายการจาก Statement ธนาคาร — เมื่อนำเข้า Statement ในหน้ากระทบยอด รายการที่ยังไม่มีคู่และตรงกับกฎจะถูกเลือกบัญชีให้ และกด "ใช้กฎ" เพื่อบันทึกทั้งหมดได้ในครั้งเดียว</p>' +
    '<div class="iv-filters"><label class="coa-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input type="search" data-state="page.ruleQ" value="' + esc(pageState.ruleQ) + '" placeholder="ค้นหาชื่อกฎ"></label></div>';
}
function rulesData() {
  var q = (pageState.ruleQ || '').toLowerCase(), all = rulesList();
  var list = all.filter(function(r) { return !q || (r.name + ' ' + ruleCondText(r)).toLowerCase().indexOf(q) >= 0; });
  var rows = list.map(function(r) {
    var i = all.indexOf(r);
    return '<tr' + (r.off ? ' class="muted"' : '') + '><td class="num">' + (i + 1) + '</td><td><a href="#" class="po-link" onclick="event.preventDefault();openRuleForm(\'' + r.id + '\')">' + esc(r.name) + '</a></td>' +
      '<td>' + ({ in:'เงินเข้า', out:'เงินออก' }[r.dir] || 'เงินเข้าและออก') + (r.bank ? '<div class="small muted">' + esc(r.bank + ' ' + acctName(r.bank)) + '</div>' : '') + '</td>' +
      '<td>' + esc(ruleCondText(r)) + '</td><td>' + esc(r.account ? r.account + ' ' + acctName(r.account) : '') + (r.payee ? '<div class="small muted">ผู้รับ/ผู้จ่าย: ' + esc(r.payee) + '</div>' : '') + '</td>' +
      '<td><span class="status ' + (r.off ? 'st-void">ปิดอยู่' : 'st-paid">เปิดใช้') + '</span></td>' +
      '<td class="r iv-act"><a href="#" onclick="event.preventDefault();openRuleForm(\'' + r.id + '\')">แก้ไข</a><details class="iv-dd"><summary>▾</summary><div class="iv-menu">' +
      '<button type="button" onclick="this.closest(\'details\').open=false;ruleToggle(\'' + r.id + '\')">' + (r.off ? 'เปิดใช้กฎ' : 'ปิดกฎชั่วคราว') + '</button>' +
      (i > 0 ? '<button type="button" onclick="this.closest(\'details\').open=false;ruleMove(\'' + r.id + '\',-1)">เลื่อนลำดับขึ้น</button>' : '') +
      (i < all.length - 1 ? '<button type="button" onclick="this.closest(\'details\').open=false;ruleMove(\'' + r.id + '\',1)">เลื่อนลำดับลง</button>' : '') +
      '<button type="button" onclick="this.closest(\'details\').open=false;ruleCopy(\'' + r.id + '\')">ทำสำเนา</button>' +
      '<button type="button" onclick="this.closest(\'details\').open=false;ruleDel(\'' + r.id + '\')">ลบ</button></div></details></td></tr>';
  }).join('');
  return '<div class="table-wrap coa-table"><table class="data-table"><thead><tr><th style="width:50px">ลำดับ</th><th>ชื่อกฎ</th><th>ใช้กับ</th><th>เงื่อนไข</th><th>จัดเป็นบัญชี</th><th>สถานะ</th><th class="r">การดำเนินการ</th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="7" class="adj-empty"><b>ตั้งกฎจัดหมวดหมู่อัตโนมัติ</b><div>' + (all.length ? 'ไม่พบกฎที่ค้นหา' : 'สร้างกฎเพื่อจัดหมวดหมู่ธุรกรรมที่เข้ามาโดยไม่ต้องทำเอง เช่น คำอธิบายมีคำว่า "ค่าไฟ" → บัญชีค่าสาธารณูปโภค') + '</div></td></tr>') +
    '</tbody></table></div><p class="small muted">ถ้ารายการตรงกับหลายกฎ ระบบใช้กฎที่ลำดับสูงกว่า (เลขน้อยกว่า)</p>';
}
var ruleForm = null;
function openRuleForm(id) {
  var r = id ? Object.assign({}, rulesList().find(function(x) { return x.id === id; })) : { id: 'r' + Date.now().toString(36), name:'', dir:'out', bank:'', match:'all', conds:[{ field:'desc', op:'contains', value:'' }], account:'', payee:'', memo:'' };
  r.conds = (r.conds || []).map(function(c) { return Object.assign({}, c); });
  ruleForm = r;
  var banks = typeof bankAccList === 'function' ? bankAccList() : [];
  var accs = STORE.accounts.slice().sort(function(a, b) { return String(a.code).localeCompare(String(b.code)); });
  var o = function(map, cur) { return Object.keys(map).map(function(k) { return '<option value="' + k + '"' + (cur === k ? ' selected' : '') + '>' + map[k] + '</option>'; }).join(''); };
  var h = '<div class="field"><label for="ru_name">ชื่อกฎ*</label><input id="ru_name" value="' + esc(r.name) + '" placeholder="เช่น ค่าไฟฟ้า"></div>' +
    '<div class="field-row"><div class="field"><label for="ru_dir">ใช้กับ</label><select id="ru_dir">' + o({ out:'เงินออก', in:'เงินเข้า', both:'เงินเข้าและออก' }, r.dir || 'both') + '</select></div>' +
    '<div class="field"><label for="ru_bank">ในบัญชี</label><select id="ru_bank"><option value="">ทุกบัญชีธนาคาร</option>' + banks.map(function(a) { return '<option value="' + esc(a.code) + '"' + (r.bank === a.code ? ' selected' : '') + '>' + esc(a.code + ' ' + a.name) + '</option>'; }).join('') + '</select></div></div>' +
    '<div class="field"><label for="ru_match">เงื่อนไข — ธุรกรรมต้องตรงกับ</label><select id="ru_match" style="max-width:260px">' + o({ all:'ทุกเงื่อนไข', any:'เงื่อนไขใดก็ได้' }, r.match) + '</select></div>' +
    '<div id="ruConds"></div><div><button type="button" class="btn btn-outline btn-sm" id="ruAdd">+ เพิ่มเงื่อนไข</button></div>' +
    '<h3 class="de-h" style="margin-top:8px">จากนั้น</h3>' +
    '<div class="field-row"><div class="field"><label for="ru_acc">จัดเป็นบัญชี*</label><select id="ru_acc"><option value="">— เลือกบัญชี —</option>' + accs.map(function(a) { return '<option value="' + esc(a.code) + '"' + (r.account === a.code ? ' selected' : '') + '>' + esc(a.code + ' ' + a.name) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label for="ru_payee">ผู้รับ/ผู้จ่าย (ถ้ามี)</label><input id="ru_payee" list="dl_contacts" value="' + esc(r.payee || '') + '"></div></div>' +
    '<div class="field"><label for="ru_memo">บันทึกข้อความ</label><input id="ru_memo" value="' + esc(r.memo || '') + '"></div>' +
    '<div class="form-error" id="formError" hidden></div>';
  var btns = [CANCEL_BTN, { label:'บันทึก', cls:'btn-primary', onClick: saveRuleForm }];
  openModal({ title: id ? 'แก้ไขกฎ' : 'สร้างกฎใหม่', body: h, buttons: btns, onMount: function() { renderRuleConds(); byId('ruAdd').onclick = function() { ruleForm.conds.push({ field:'desc', op:'contains', value:'' }); renderRuleConds(); }; } });
}
function renderRuleConds() {
  var host = byId('ruConds');
  host.innerHTML = ruleForm.conds.map(function(c, i) {
    var ops = c.field === 'amount' ? ['eq','gt','lt'] : ['contains','notContains','is','starts'];
    if (ops.indexOf(c.op) < 0) c.op = ops[0];
    return '<div class="ru-cond"><select data-ci="' + i + '" data-k="field">' + Object.keys(RULE_FIELDS).map(function(k) { return '<option value="' + k + '"' + (c.field === k ? ' selected' : '') + '>' + RULE_FIELDS[k] + '</option>'; }).join('') + '</select>' +
      '<select data-ci="' + i + '" data-k="op">' + ops.map(function(k) { return '<option value="' + k + '"' + (c.op === k ? ' selected' : '') + '>' + RULE_OPS[k] + '</option>'; }).join('') + '</select>' +
      '<input data-ci="' + i + '" data-k="value" value="' + esc(c.value || '') + '"' + (c.field === 'amount' ? ' type="number" step="any"' : '') + ' placeholder="' + (c.field === 'amount' ? '0.00' : 'ข้อความ') + '">' +
      '<button type="button" class="item-remove" data-cdel="' + i + '" aria-label="ลบเงื่อนไข">✕</button></div>';
  }).join('');
  host.querySelectorAll('[data-ci]').forEach(function(el) { el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function() { ruleForm.conds[el.dataset.ci][el.dataset.k] = el.value; if (el.dataset.k === 'field') renderRuleConds(); }); });
  host.querySelectorAll('[data-cdel]').forEach(function(b) { b.onclick = function() { ruleForm.conds.splice(Number(b.dataset.cdel), 1); if (!ruleForm.conds.length) ruleForm.conds.push({ field:'desc', op:'contains', value:'' }); renderRuleConds(); }; });
}
async function saveRuleForm(btn) {
  var e = byId('formError'), fail = function(m) { e.textContent = m; e.hidden = false; };
  var r = Object.assign(ruleForm, { name: byId('ru_name').value.trim(), dir: byId('ru_dir').value, bank: byId('ru_bank').value, match: byId('ru_match').value, account: byId('ru_acc').value, payee: byId('ru_payee').value.trim(), memo: byId('ru_memo').value.trim() });
  r.conds = r.conds.filter(function(c) { return String(c.value || '').trim() !== ''; });
  if (!r.name) return fail('กรุณาระบุชื่อกฎ');
  if (!r.conds.length) { r.conds = [{ field:'desc', op:'contains', value:'' }]; renderRuleConds(); return fail('กรุณาระบุเงื่อนไขอย่างน้อย 1 ข้อ'); }
  if (!r.account) return fail('กรุณาเลือกบัญชีที่จะจัดหมวดหมู่');
  btn.disabled = true;
  try {
    var list = rulesList(), i = list.findIndex(function(x) { return x.id === r.id; });
    if (i >= 0) list[i] = r; else list.push(r);
    await saveRules(list); closeModal(); showToast('บันทึกกฎ "' + r.name + '" แล้ว');
  } catch (ex) { btn.disabled = false; fail(writeError(ex)); }
}
async function ruleToggle(id) { await saveRules(rulesList().map(function(r) { return r.id === id ? Object.assign({}, r, { off: !r.off }) : r; })); }
async function ruleMove(id, d) { var l = rulesList(), i = l.findIndex(function(r) { return r.id === id; }), j = i + d; if (j < 0 || j >= l.length) return; var t = l[i]; l[i] = l[j]; l[j] = t; await saveRules(l); }
async function ruleCopy(id) { var l = rulesList(), r = l.find(function(x) { return x.id === id; }); if (!r) return; l.push(Object.assign(clone(r), { id: 'r' + Date.now().toString(36), name: r.name + ' (สำเนา)' })); await saveRules(l); showToast('ทำสำเนากฎแล้ว'); }
var _ruleDelArm = null;
async function ruleDel(id) { if (_ruleDelArm !== id) { _ruleDelArm = id; showToast('กด "ลบ" อีกครั้งเพื่อยืนยัน'); setTimeout(function() { if (_ruleDelArm === id) _ruleDelArm = null; }, 4000); return; } _ruleDelArm = null; await saveRules(rulesList().filter(function(r) { return r.id !== id; })); showToast('ลบกฎแล้ว'); }
/* record a statement line as a new journal entry (used by manual pick and by rules) */
async function stmtRecord(st, other, party, memo) {
  var a = Math.abs(st.amt), bank = rec.acc, dr = st.amt > 0 ? bank : other, cr = st.amt > 0 ? other : bank;
  var before = {}; reconLines(bank).forEach(function(l) { before[l.key] = 1; });
  await addRec('documents', { type:'journalEntry', typeLabel: DOC_TYPES.journalEntry.label, group:'other', party: party || st.desc, date: st.date, docNo: nextDocNo('journalEntry', st.date),
    items: [{ account: dr + ' ' + acctName(dr), debit: a, credit: 0 }, { account: cr + ' ' + acctName(cr), debit: 0, credit: a }], total: a, extra: { bankTx: st.amt > 0 ? 'in' : 'out', ref: st.ref, fromStatement: true, note: memo || (party ? st.desc : '') }, status:'done', createdAt: Date.now() });
  var nl = reconLines(bank).find(function(l) { return !before[l.key]; });
  if (nl) { rec.match[st.i] = nl.key; rec.cleared[nl.key] = 1; }
}
function stmtRulePending() { if (!rec.stmt) return []; return rec.stmt.filter(function(s) { return !rec.match[s.i]; }).map(function(s) { return { s: s, r: ruleFor(s, rec.acc) }; }).filter(function(x) { return x.r; }); }
async function stmtApplyRules(btn) {
  var p = stmtRulePending(); if (!p.length) return showToast('ไม่มีรายการที่ตรงกับกฎ');
  if (btn) btn.disabled = true;
  try { for (var i = 0; i < p.length; i++) await stmtRecord(p[i].s, p[i].r.account, p[i].r.payee, p[i].r.memo); showToast('บันทึกตามกฎ ' + p.length + ' รายการแล้ว'); }
  catch (e) { showToast(writeError(e)); }
  refreshPageData();
}
