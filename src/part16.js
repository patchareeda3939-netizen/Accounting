/* ================= Projects & departments (simple dimensions) ================= */
function dimDoc() { return STORE.settings.find(function(s) { return s._id === 'dims'; }) || {}; }
function dimList(kind) {
  var l = dimDoc()[kind];
  if (kind === 'projects' && !Array.isArray(l)) {  // migrate legacy project documents (read-only view)
    return projects().map(function(d) { return { id: 'd_' + d._id, name: d.party, desc: (d.extra && d.extra.note) || '' }; });
  }
  return Array.isArray(l) ? l : [];
}
var DIM_META = { projects: { title:'โครงการ', one:'โครงการ', key:'project', ph:'เช่น ปรับปรุงสำนักงานสาขาเชียงใหม่' }, departments: { title:'แผนก', one:'แผนก', key:'dept', ph:'เช่น ฝ่ายขาย, ฝ่ายบัญชี' } };
function dimTotals(kind, id) {
  var key = DIM_META[kind].key, rev = 0, exp = 0, n = 0;
  STORE.documents.forEach(function(d) {
    if (!d.extra || d.extra[key] !== id) return; n++;
    postingsOf(d).forEach(function(l) { var b = accBaseOf(l.code); if (b === 'income') rev += l.cr - l.dr; else if (b === 'expense') exp += l.dr - l.cr; });
  });
  return { n: n, rev: round2(rev), exp: round2(exp) };
}
function dimShell(kind) {
  var m = DIM_META[kind];
  return '<div class="coa-bar"><div><h1 class="section-title" style="margin:0">' + m.title + '</h1><p class="section-sub">ใส่ชื่อ' + m.one + 'และรายละเอียด แล้วเลือก' + m.one + 'ในเอกสารเพื่อดูรายได้/ค่าใช้จ่ายแยกตาม' + m.one + '</p></div><div class="coa-actions"><button type="button" class="btn btn-dark" data-dimadd="' + kind + '">+ เพิ่ม' + m.one + '</button></div></div>';
}
function dimData(kind) {
  var m = DIM_META[kind], list = dimList(kind);
  if (!list.length) return '<div class="empty-state"><div class="empty-state-text"><h3>ยังไม่มี' + m.one + '</h3><p>กด "+ เพิ่ม' + m.one + '" ใส่ชื่อและรายละเอียด</p></div></div>';
  return '<div class="items-wrap"><table class="data-table"><thead><tr><th>ชื่อ' + m.one + '</th><th>รายละเอียด</th><th class="r">เอกสาร</th><th class="r">รายได้</th><th class="r">ค่าใช้จ่าย</th><th class="r">กำไร</th><th></th></tr></thead><tbody>' +
    list.map(function(x, i) { var t = dimTotals(kind, x.id); return '<tr><td><b>' + esc(x.name) + '</b></td><td class="small">' + esc(x.desc || '') + '</td><td class="r">' + t.n + '</td><td class="r">' + fmtMoney(t.rev) + '</td><td class="r">' + fmtMoney(t.exp) + '</td><td class="r ' + (t.rev - t.exp < 0 ? 'neg-text' : '') + '">' + fmtMoney(round2(t.rev - t.exp)) + '</td><td style="white-space:nowrap">' + (String(x.id).indexOf('d_') === 0 ? '' : '<button type="button" class="linkish" data-dimedit="' + kind + ':' + i + '">แก้ไข</button> · <button type="button" class="linkish" data-dimdel="' + kind + ':' + i + '">ลบ</button>') + '</td></tr>'; }).join('') +
    '</tbody></table></div>';
}
function openDimForm(kind, i) {
  var m = DIM_META[kind], list = (Array.isArray(dimDoc()[kind]) ? dimDoc()[kind] : dimList(kind)).slice(), x = i != null ? list[i] : null;
  openModal({ title: (x ? 'แก้ไข' : 'เพิ่ม') + m.one, body:'<div class="field"><label for="dmName">ชื่อ' + m.one + ' <b class="neg-text">*</b></label><input id="dmName" value="' + esc(x ? x.name : '') + '" placeholder="' + m.ph + '"></div><div class="field"><label for="dmDesc">รายละเอียด</label><textarea id="dmDesc" rows="4">' + esc(x ? x.desc || '' : '') + '</textarea></div><div class="form-error" id="formError" hidden></div>',
    buttons:[CANCEL_BTN, { label:'บันทึก', cls:'btn-dark', onClick: async function(btn) {
      var name = byId('dmName').value.trim(), err = byId('formError');
      if (!name) { err.textContent = 'กรุณาระบุชื่อ' + m.one; err.hidden = false; return; }
      if (list.some(function(y, k) { return k !== i && y.name === name; })) { err.textContent = 'ชื่อนี้มีอยู่แล้ว'; err.hidden = false; return; }
      var rec = { id: x ? x.id : (kind[0] + Date.now().toString(36)), name: name, desc: byId('dmDesc').value.trim() };
      if (x) list[i] = rec; else list.push(rec);
      btn.disabled = true; var patch = {}; patch[kind] = list; await saveSettings('dims', patch); closeModal(); showToast('บันทึก' + m.one + 'แล้ว');
    } }] });
}
function bindDims() {
  var c = byId('sectionContent'); if (!c) return;
  c.querySelectorAll('[data-dimadd]').forEach(function(b) { b.onclick = function() { openDimForm(b.dataset.dimadd, null); }; });
  c.querySelectorAll('[data-dimedit]').forEach(function(b) { b.onclick = function() { var s = b.dataset.dimedit.split(':'); openDimForm(s[0], Number(s[1])); }; });
  c.querySelectorAll('[data-dimdel]').forEach(function(b) { b.onclick = async function() { var s = b.dataset.dimdel.split(':'), list = dimList(s[0]).slice(); list.splice(Number(s[1]), 1); var patch = {}; patch[s[0]] = list; await saveSettings('dims', patch); showToast('ลบแล้ว'); }; });
}
function dimSelectsHTML(ex) {
  var P = dimList('projects').filter(function(x) { return String(x.id).indexOf('d_') !== 0; }), D = dimList('departments');
  if (!P.length && !D.length) return '';
  var sel = function(id, lbl, list, cur) { return list.length ? '<div class="field"><label for="' + id + '">' + lbl + '</label><select id="' + id + '"><option value="">— ไม่ระบุ —</option>' + list.map(function(x) { return '<option value="' + esc(x.id) + '"' + (cur === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div>' : ''; };
  return '<div class="grid-2">' + sel('f_project', 'โครงการ', P, ex.project) + sel('f_dept', 'แผนก', D, ex.dept) + '</div>';
}
