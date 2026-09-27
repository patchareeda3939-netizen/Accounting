/* ================= Multi-company & branches ================= */
function coList() {
  if (FB_MODE) return COMPANIES;
  var main = COMPANIES.find(function(c) { return c._id === 'main'; });
  var list = COMPANIES.filter(function(c) { return c._id !== 'main'; });
  return [{ _id:'main', name: (main && main.name) || (CUR_CO === 'main' ? companyName() : 'บริษัทหลัก') }].concat(list);
}
function renderCoSwitch() {
  var pill = byId('companyPill'); if (!pill) return;
  if (!pill._b) {
    pill._b = 1; pill.setAttribute('role', 'button'); pill.tabIndex = 0; pill.title = 'สลับบริษัท';
    pill.classList.add('co-switch');
    var open = function(e) { e.stopPropagation(); toggleCoMenu(); };
    pill.addEventListener('click', open); pill.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') open(e); });
    document.addEventListener('click', function() { var m = byId('coMenu'); if (m) m.hidden = true; });
  }
  pill.innerHTML = esc(companyName()) + ' <span aria-hidden="true">▾</span>';
}
function toggleCoMenu() {
  var m = byId('coMenu');
  if (!m) { m = document.createElement('div'); m.id = 'coMenu'; m.className = 'co-menu'; m.addEventListener('click', function(e) { e.stopPropagation(); }); document.body.appendChild(m); }
  if (!m.hidden && m.innerHTML) { m.hidden = true; return; }
  var r = byId('companyPill').getBoundingClientRect();
  m.style.left = Math.max(8, r.left) + 'px'; m.style.top = (r.bottom + 6) + 'px';
  m.innerHTML = '<div class="co-menu-h">บริษัทของคุณ</div>' + coList().map(function(c) { return '<button type="button" data-cosw="' + esc(c._id) + '" class="' + (c._id === CUR_CO ? 'on' : '') + '">' + (c._id === CUR_CO ? '✓ ' : '') + esc(c._id === CUR_CO ? companyName() : c.name) + (c.taxId ? '<small>' + esc(c.taxId) + '</small>' : '') + '</button>'; }).join('') +
    '<hr><button type="button" data-conew>+ เพิ่มบริษัทใหม่</button><button type="button" data-coset>ตั้งค่าบริษัทและสาขา</button>' +
    (FB_MODE ? '<button type="button" data-cousers>จัดการผู้ใช้</button><hr><button type="button" data-coout>ออกจากระบบ <small>' + esc(fbEmail()) + '</small></button>' : '');
  m.hidden = false;
  m.querySelectorAll('[data-cosw]').forEach(function(b) { b.onclick = function() { m.hidden = true; switchCompany(b.dataset.cosw); showToast('สลับเป็น ' + b.textContent.replace('✓ ', '')); }; });
  m.querySelector('[data-conew]').onclick = function() { m.hidden = true; openNewCompany(); };
  m.querySelector('[data-coset]').onclick = function() { m.hidden = true; go('settings', 'company'); };
  if (FB_MODE) { m.querySelector('[data-cousers]').onclick = function() { m.hidden = true; fbOpenMembers(); }; m.querySelector('[data-coout]').onclick = fbSignOut; }
}
function openNewCompany() {
  var body = '<p class="small muted" style="margin:0">แต่ละบริษัทมีข้อมูลแยกกันทั้งหมด (เอกสาร ผังบัญชี ผู้ติดต่อ สินค้า ภาษี และการตั้งค่า) สลับบริษัทได้จากชื่อบริษัทมุมซ้ายบน</p>' +
    '<div class="field"><label for="ncName">ชื่อบริษัท <b class="neg-text">*</b></label><input id="ncName" placeholder="เช่น บริษัท ตัวอย่าง จำกัด"></div>' +
    '<div class="grid-2"><div class="field"><label for="ncTax">เลขประจำตัวผู้เสียภาษี</label><input id="ncTax" maxlength="13" inputmode="numeric"></div><div class="field"><label for="ncBranch">สาขา</label><input id="ncBranch" value="สำนักงานใหญ่"></div></div>' +
    '<div class="field"><label for="ncAddr">ที่อยู่ตามกฎหมาย</label><textarea id="ncAddr" rows="2"></textarea></div>' +
    '<label class="se-chk"><input type="checkbox" id="ncCoa" checked> เริ่มด้วยผังบัญชีมาตรฐาน SME</label><div class="form-error" id="formError" hidden></div>';
  openModal({ title:'เพิ่มบริษัทใหม่', body: body, buttons:[CANCEL_BTN, { label:'สร้างและสลับไปบริษัทนี้', cls:'btn-dark', onClick: async function(btn) {
    var name = byId('ncName').value.trim(), err = byId('formError');
    if (!name) { err.textContent = 'กรุณาระบุชื่อบริษัท'; err.hidden = false; return; }
    btn.disabled = true;
    var id = 'c' + Date.now().toString(36), info = { name: name, taxId: byId('ncTax').value.trim(), branch: byId('ncBranch').value.trim(), legalAddress: byId('ncAddr').value.trim() }, coa = byId('ncCoa').checked;
    try {
      if (FB_MODE) await fbCreateCompany(id, name, info.taxId);
      else if (db) {
        if (!COMPANIES.some(function(c) { return c._id === 'main'; })) await db.doc('companies/main').set({ name: companyName(), taxId: companySettings().taxId || '', createdAt: 0 });
        await db.doc('companies/' + id).set({ name: name, taxId: info.taxId, createdAt: Date.now() });
      } else { if (!COMPANIES.some(function(c) { return c._id === 'main'; })) COMPANIES.push({ _id:'main', name: companyName(), createdAt: 0 }); COMPANIES.push({ _id: id, name: name, taxId: info.taxId, createdAt: Date.now() }); }
      closeModal(); switchCompany(id);
      await saveSettings('company', Object.assign({ legalName: name }, info));
      if (coa) setTimeout(function() { loadStandardCoa(); }, 400);
      renderCoSwitch(); showToast('สร้างบริษัท ' + name + ' แล้ว');
    } catch (e) { btn.disabled = false; err.textContent = 'สร้างไม่สำเร็จ: ' + (e.message || e); err.hidden = false; }
  } }] });
}
// keep company registry name in sync with settings
var _coSyncT = null;
function syncCompanyRegistry() {
  if (!db || !canEditLegal()) return;
  clearTimeout(_coSyncT);
  _coSyncT = setTimeout(function() {
    var cs = companySettings(), cur = COMPANIES.find(function(c) { return c._id === CUR_CO; }), name = companyName();
    if (cur && (cur.name !== name || (cur.taxId || '') !== (cs.taxId || ''))) db.doc('companies/' + CUR_CO).set({ name: name, taxId: cs.taxId || '', createdAt: cur.createdAt || 0 }).catch(function() {});
  }, 800);
}

/* ---- Branches: companies/{co}/branches/{code} ----
   used = มีเอกสารอ้างอิงแล้ว → แก้รหัสไม่ได้ ผู้แก้ไขลบไม่ได้ (ใช้ "ปิดใช้งาน" แทน) เจ้าของลบได้พร้อม audit */
function allBranches() { return STORE.branches.slice().sort(function(a, b) { return String(a.code).localeCompare(String(b.code)); }); }
function branches() { return allBranches().filter(function(b) { return b.active !== false; }); }
// branches offered on a document form: active ones plus the document's current branch
function branchesFor(cur) { return allBranches().filter(function(b) { return b.active !== false || b.code === cur; }); }
function branchUsedByDocs(code) { return STORE.documents.some(function(d) { return d.extra && d.extra.branch === code; }); }
function branchOf(code) {
  var cs = companySettings();
  if (!code || code === '00000') return { code:'00000', name: cs.branch || 'สำนักงานใหญ่', address: cs.legalAddress || cs.address || '', phone: cs.phone || '' };
  return allBranches().find(function(b) { return b.code === code; }) || branchOf('');
}
function branchLabel(b) { return b.code === '00000' ? (b.name || 'สำนักงานใหญ่') : 'สาขาที่ ' + b.code + (b.name ? ' ' + b.name : ''); }
function branchesSectionHTML() {
  var hq = branchOf(''), edit = canEditCompanyInfo(), owner = canEditLegal();
  return '<section class="co-card"><div class="co-head"><h2>สาขา</h2><p>สาขาและที่อยู่สาขา ใช้ในหัวเอกสาร ใบกำกับภาษี และหนังสือรับรอง 50 ทวิ</p></div>' +
    '<div class="items-wrap"><table class="data-table" id="brTable"><thead><tr><th>รหัสสาขา</th><th>ชื่อสาขา</th><th>ที่อยู่</th><th>โทร</th><th>สถานะ</th><th></th></tr></thead><tbody>' +
    '<tr><td class="num">00000</td><td>' + esc(hq.name) + '</td><td class="small">' + esc(hq.address || '-') + '</td><td>' + esc(hq.phone || '') + '</td><td class="small">ใช้งาน</td><td class="small muted">แก้ที่ข้อมูลทางกฎหมาย</td></tr>' +
    allBranches().map(function(b) {
      var c = esc(b.code), off = b.active === false, acts = [];
      if (edit) {
        acts.push('<button type="button" class="linkish" data-bredit="' + c + '">แก้ไข</button>');
        acts.push('<button type="button" class="linkish" data-bractive="' + c + '">' + (off ? 'เปิดใช้งาน' : 'ปิดใช้งาน') + '</button>');
        if (!b.used || owner) acts.push('<button type="button" class="linkish" data-brdel="' + c + '">ลบ</button>');
      }
      return '<tr data-brrow="' + c + '"' + (off ? ' class="muted"' : '') + '><td class="num">' + c + '</td><td>' + esc(b.name || '') + '</td><td class="small">' + esc(b.address || '') + '</td><td>' + esc(b.phone || '') + '</td>' +
        '<td class="small">' + (off ? 'ปิดใช้งาน' : 'ใช้งาน') + (b.used ? ' · <span title="มีเอกสารอ้างอิงแล้ว">มีประวัติ</span>' : '') + '</td><td style="white-space:nowrap">' + acts.join(' · ') + '</td></tr>';
    }).join('') +
    '</tbody></table></div>' + (edit ? '<p class="small muted" style="margin:6px 0 0">สาขาที่มีประวัติ (มีเอกสารอ้างอิงแล้ว) แก้รหัสไม่ได้ และลบได้เฉพาะเจ้าของบริษัท ให้ใช้ "ปิดใช้งาน" แทนการลบ</p><div class="toolbar"><button type="button" class="btn btn-outline" data-bradd>+ เพิ่มสาขา</button></div>' : '') + '</section>';
}
// create or replace a branch record (doc id = branch code in every storage mode)
async function putBranch(rec) {
  if (db) { await setRec('branches', rec.code, rec); return; }
  var i = STORE.branches.findIndex(function(x) { return x._id === rec.code; }), r = Object.assign({}, rec, { _id: rec.code });
  if (i >= 0) STORE.branches[i] = r; else STORE.branches.push(r);
  sortLocal('branches'); onData();
}
async function deleteBranch(b) {
  if (FB_MODE) return fbDeleteBranch(b);
  await delRec('branches', b._id);
}
function openBranchForm(code) {
  var list = allBranches(), b = code ? list.find(function(x) { return x.code === code; }) : null;
  var next = String(list.reduce(function(m, x) { return Math.max(m, Number(x.code) || 0); }, 0) + 1).padStart(5, '0');
  var lockCode = !!(b && b.used);
  var body = '<div class="grid-2"><div class="field"><label for="brCode">รหัสสาขา (5 หลัก) <b class="neg-text">*</b></label><input id="brCode" maxlength="5" inputmode="numeric" value="' + esc(b ? b.code : next) + '"' + (lockCode ? ' disabled title="สาขานี้มีเอกสารอ้างอิงแล้ว แก้รหัสไม่ได้"' : '') + '></div>' +
    '<div class="field"><label for="brName">ชื่อสาขา</label><input id="brName" value="' + esc(b ? b.name : '') + '" placeholder="เช่น สาขาเชียงใหม่"></div></div>' +
    '<div class="field"><label for="brAddr">ที่อยู่สาขา <b class="neg-text">*</b></label><textarea id="brAddr" rows="3">' + esc(b ? b.address : '') + '</textarea></div>' +
    '<div class="field"><label for="brPhone">โทรศัพท์</label><input id="brPhone" value="' + esc(b ? b.phone || '' : '') + '"></div>' +
    (lockCode ? '<p class="small muted" style="margin:0">สาขานี้มีเอกสารอ้างอิงแล้ว จึงแก้รหัสสาขาไม่ได้ ถ้าต้องการรหัสใหม่ ให้ปิดใช้งานสาขานี้แล้วเพิ่มสาขาใหม่</p>' : '') + '<div class="form-error" id="formError" hidden></div>';
  openModal({ title: b ? 'แก้ไขสาขา' : 'เพิ่มสาขา', body: body, buttons:[CANCEL_BTN, { label:'บันทึก', cls:'btn-dark', onClick: async function(btn) {
    var err = byId('formError'), nc = byId('brCode').value.trim(), addr = byId('brAddr').value.trim();
    if (!/^\d{5}$/.test(nc) || nc === '00000') { err.textContent = 'รหัสสาขาต้องเป็นตัวเลข 5 หลัก (00001 ขึ้นไป)'; err.hidden = false; return; }
    if (list.some(function(x) { return x.code === nc && x !== b; })) { err.textContent = 'รหัสสาขาซ้ำ'; err.hidden = false; return; }
    if (!addr) { err.textContent = 'กรุณาระบุที่อยู่สาขา'; err.hidden = false; return; }
    var rec = { code: nc, name: byId('brName').value.trim(), address: addr, phone: byId('brPhone').value.trim(), active: b ? b.active !== false : true, used: b && b.code === nc ? !!b.used : branchUsedByDocs(nc), createdAt: b && b.code === nc ? b.createdAt : Date.now() };
    btn.disabled = true;
    try {
      await putBranch(rec);
      if (b && b.code !== nc) await deleteBranch(b); // code changed on a branch without history
      closeModal(); showToast('บันทึกสาขาแล้ว');
    } catch (e) { btn.disabled = false; err.textContent = writeError(e); err.hidden = false; }
  } }] });
}
function bindBranches(c) {
  var find = function(code) { return allBranches().find(function(x) { return x.code === code; }); };
  c.querySelectorAll('[data-bradd]').forEach(function(b) { b.onclick = function() { openBranchForm(null); }; });
  c.querySelectorAll('[data-bredit]').forEach(function(b) { b.onclick = function() { openBranchForm(b.dataset.bredit); }; });
  c.querySelectorAll('[data-bractive]').forEach(function(b) { b.onclick = async function() {
    var br = find(b.dataset.bractive);
    try { await putBranch(Object.assign(strip(br), { active: br.active === false })); showToast(br.active === false ? 'เปิดใช้งานสาขาแล้ว' : 'ปิดใช้งานสาขาแล้ว'); } catch (e) { showToast(writeError(e)); }
  }; });
  c.querySelectorAll('[data-brdel]').forEach(function(b) { b.onclick = async function() {
    var br = find(b.dataset.brdel);
    if (!confirm(br.used ? 'สาขา ' + br.code + ' มีเอกสารอ้างอิงแล้ว การลบจะถูกบันทึกในประวัติ เอกสารเดิมยังแสดงรหัสสาขานี้ ยืนยันลบ?' : 'ลบสาขา ' + br.code + '?')) return;
    try { await deleteBranch(br); showToast('ลบสาขาแล้ว'); } catch (e) { showToast(writeError(e)); }
  }; });
}
// a document that refers to a branch marks the branch as used first (enforced by firestore.rules)
async function markBranchUsed(rec) {
  var code = rec && rec.extra && rec.extra.branch;
  if (!code || code === '00000') return;
  var b = STORE.branches.find(function(x) { return x.code === code; });
  if (b && !b.used) await putBranch(Object.assign(strip(b), { used: true }));
}
// one-time move from the old settings.branches list to branch records
var _brMigrating = false;
function migrateLegacyBranches() {
  var legacy = companySettings().branches;
  if (_brMigrating || !Array.isArray(legacy) || !canEditCompanyInfo() || !collectionsLoaded()) return;
  _brMigrating = true;
  (async function() {
    try {
      for (var i = 0; i < legacy.length; i++) {
        var x = legacy[i] || {};
        if (!/^\d{5}$/.test(x.code || '') || x.code === '00000' || STORE.branches.some(function(b) { return b.code === x.code; })) continue;
        await putBranch({ code: x.code, name: x.name || '', address: x.address || '', phone: x.phone || '', active: true, used: branchUsedByDocs(x.code), createdAt: Date.now() + i });
      }
      await saveSettings('company', { branches: null });
    } catch (e) {} finally { _brMigrating = false; }
  })();
}
// company-info view for a document (uses the document's branch)
function coInfoFor(d) {
  var cs = companySettings(), b = branchOf(d && d.extra && d.extra.branch);
  return { name: cs.legalName || companyName(), taxId: cs.taxId || '', branchName: branchLabel(b), branchCode: b.code, address: b.address || cs.legalAddress || cs.address || '', phone: b.phone || cs.custPhone || cs.phone || '' };
}
