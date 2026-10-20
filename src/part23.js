/* ---- Product / service form (QuickBooks style) ---- */
var KIND_NEW_TITLE = { goods:'เพิ่มรายการสินค้าคงคลังใหม่', service:'เพิ่มบริการใหม่', noninv:'เพิ่มของไม่นับสต็อกใหม่', bundle:'เพิ่มรวมชุดใหม่' };
var KIND_NOUN = { goods:'สินค้านี้', service:'บริการนี้', noninv:'สินค้านี้', bundle:'ชุดนี้' };
function openProductForm(rec, defaults) {
  var p = Object.assign({ kind:'goods', sells: true }, defaults || {}, rec || {});
  if (p.buys == null) p.buys = p.cost != null && p.cost !== '' ? true : (p.kind === 'goods');
  if (p.sells == null) p.sells = true;
  var kOpts = Object.keys(KIND_LABEL).map(function(k) { return '<option value="' + k + '"' + (p.kind === k ? ' selected' : '') + '>' + (k === 'goods' ? 'รายการสินค้าคงคลัง' : KIND_LABEL[k]) + '</option>'; }).join('');
  var cats = {}; STORE.products.forEach(function(x) { if (x.category) cats[x.category] = 1; });
  var units = []; STORE.products.forEach(function(x) { if (x.unit && units.indexOf(x.unit) < 0) units.push(x.unit); });
  var accSel = function(id, base, cur, dflt) {
    var list = STORE.accounts.filter(function(a) { var b = subtypeBase(accSubtype(a)); return base.indexOf(b) >= 0; });
    cur = cur || dflt;
    var names = list.map(function(a) { return a.name; }); if (cur && names.indexOf(cur) < 0) names.unshift(cur);
    return '<select id="' + id + '">' + names.map(function(n) { var a = list.find(function(x) { return x.name === n; }); return '<option value="' + esc(n) + '"' + (n === cur ? ' selected' : '') + '>' + esc((a ? a.code + ' ' : '') + n) + '</option>'; }).join('') + '</select>';
  };
  var taxSel = function(id, cur) { return '<select id="' + id + '">' + [['','— ไม่ระบุ —'],['vat7','VAT 7%'],['vat0','VAT 0%'],['exempt','ยกเว้นภาษี']].map(function(o) { return '<option value="' + o[0] + '"' + ((cur || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; };
  var sups = STORE.contacts.filter(function(c) { return c.kind === 'supplier'; });
  var sec = function(id, title, inner) { return '<section class="pf-sec" id="' + id + '"><button type="button" class="pf-sec-h" onclick="this.parentNode.classList.toggle(\'closed\')"><span>' + title + '</span><span class="pf-chev">⌃</span></button><div class="pf-sec-b">' + inner + '</div></section>'; };
  var basic = '<div class="pf-basic"><div class="pf-basic-l">' +
    '<div class="field"><label for="p_name">ชื่อ*</label><input id="p_name" value="' + esc(p.name || '') + '"></div>' +
    '<div class="field"><label for="p_kind">ประเภทรายการ</label><select id="p_kind">' + kOpts + '</select></div></div>' +
    '<label class="pf-img" id="p_imgBox">' + (p.image ? '<img src="' + esc(p.image) + '" alt="">' : '<svg width="56" height="48" viewBox="0 0 26 22" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1" y="1" width="24" height="20" rx="2"/><circle cx="8" cy="7" r="2.5"/><path d="M1 18l7-7 5 5 4-3 8 6"/></svg>') + '<span>' + (p.image ? 'เปลี่ยนรูปภาพ' : 'เพิ่มรูปภาพ') + '</span><input type="file" id="p_img" accept="image/*" hidden></label></div>' +
    '<div class="field"><label for="p_sku">รายละเอียด</label><textarea id="p_sku" rows="2">' + esc(p.sku || '') + '</textarea></div>' +
    '<div class="field-row"><div class="field"><label for="p_cat">หมวดหมู่</label>' + pfDrop('p_cat', Object.keys(cats).concat(['วัสดุก่อสร้าง','อุปกรณ์','วัตถุดิบ','สินค้าสำเร็จรูป','บริการติดตั้ง','บริการที่ปรึกษา','ค่าขนส่ง']), p.category, '— เลือกหมวดหมู่ —') + '</div>' +
    '<div class="field"><label for="p_unit">หน่วยนับ</label>' + pfDrop('p_unit', units.concat(['ชิ้น','อัน','กล่อง','แพ็ค','ชุด','ม้วน','เส้น','แผ่น','ถุง','กระสอบ','ลิตร','กิโลกรัม','ตัน','เมตร','ตารางเมตร','ลูกบาศก์เมตร','ชั่วโมง','วัน','เดือน','ครั้ง','งาน']), p.unit, '— เลือกหน่วยนับ —') + '</div></div>' +
'<div id="p_stockBox"><div class="field-row"><div class="field"><label for="p_qty">ปริมาณคงเหลือ (ยอดยกมา)</label><input id="p_qty" type="number" step="any" value="' + esc(p.openingQty != null ? p.openingQty : '') + '"></div>' +
    '<div class="field"><label for="p_asof">ณ วันที่</label><input id="p_asof" type="date" value="' + esc(p.asOf || todayStr()) + '"></div></div>' +
    '<div class="field-row"><div class="field"><label for="p_rp">จุดสั่งซื้อใหม่</label><input id="p_rp" type="number" step="any" value="' + esc(p.reorderPoint != null ? p.reorderPoint : '') + '" placeholder="แจ้งเตือนเมื่อเหลือไม่เกิน"></div>' +
    '<div class="field"><label for="p_invacc">บัญชีสินค้าคงคลัง</label>' + accSel('p_invacc', ['asset'], p.invAccount, 'สินค้าคงเหลือ') + '</div></div></div>' +
    '<div class="field" id="p_bundleBox"><label for="p_bundle">รายการในชุด</label><textarea id="p_bundle" rows="2" placeholder="เช่น เหล็ก x2, ค่าติดตั้ง x1">' + esc(p.bundleItems || '') + '</textarea></div>';
  var sell = '<label class="pf-chk"><input type="checkbox" id="p_sells"' + (p.sells !== false ? ' checked' : '') + '> <span id="p_sellLbl"></span></label><div id="p_sellBox">' +
    '<div class="field"><label for="p_desc">คำอธิบาย</label><textarea id="p_desc" rows="2">' + esc(p.desc || '') + '</textarea></div>' +
    '<div class="field-row"><div class="field"><label for="p_price">ราคา/เรตราคา</label><input id="p_price" type="number" step="any" value="' + esc(p.price != null ? p.price : '') + '"></div>' +
    '<div class="field"><label for="p_incacc">บัญชีรายได้*</label>' + accSel('p_incacc', ['income'], p.incomeAccount, p.kind === 'service' ? 'รายได้จากการให้บริการ' : 'รายได้จากการขาย') + '</div></div>' +
    '<label class="pf-chk"><input type="checkbox" id="p_priceInc"' + (p.priceIncTax ? ' checked' : '') + '> ราคารวมภาษีการขายแล้ว</label>' +
    '<div class="field"><label for="p_stax">ภาษีการขาย</label>' + taxSel('p_stax', p.salesTax) + '</div></div>';
  var buy = '<label class="pf-chk"><input type="checkbox" id="p_buys"' + (p.buys ? ' checked' : '') + '> <span id="p_buyLbl"></span></label><div id="p_buyBox">' +
    '<div class="field"><label for="p_pdesc">รายละเอียดการซื้อ</label><textarea id="p_pdesc" rows="2">' + esc(p.purchaseDesc || '') + '</textarea></div>' +
    '<div class="field-row"><div class="field"><label for="p_cost">ต้นทุนซื้อ</label><input id="p_cost" type="number" step="any" value="' + esc(p.cost != null ? p.cost : '') + '"></div>' +
    '<label class="pf-chk" style="align-self:end"><input type="checkbox" id="p_costInc"' + (p.costIncTax ? ' checked' : '') + '> ราคารวมภาษีจัดซื้อ</label></div>' +
    '<div class="field"><label for="p_ptax">ภาษีจัดซื้อ</label>' + taxSel('p_ptax', p.purchaseTax) + '</div>' +
    '<div class="field-row"><div class="field"><label for="p_sup">ซัพพลายเออร์ที่ต้องการ</label><select id="p_sup"><option value="">เลือกซัพพลายเออร์ที่ชอบ</option>' + sups.map(function(c) { return '<option' + (p.supplier === c.name ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label for="p_expacc">บัญชีค่าใช้จ่าย*</label>' + accSel('p_expacc', ['cogs','expense'], p.expenseAccount, p.kind === 'goods' ? 'ต้นทุนขาย' : 'การซื้อ') + '</div></div></div>';
  var body = sec('pfBasic', 'ข้อมูลพื้นฐาน', basic) + sec('pfSell', 'การขาย', sell) + sec('pfBuy', 'การจัดซื้อ', buy) + '<div class="form-error" id="formError" hidden></div>';
  var buttons = [];
  if (rec) buttons.push(confirmDeleteBtn(function(el) { runSave(el, async function() { await delRec('products', rec._id); showToast('ลบแล้ว'); closeModal(); }); }));
  buttons.push({ label:'ยกเลิก', left: !rec, onClick: function() { closeModal(); } });
  if (!rec) buttons.push({ label:'บันทึกและสร้างใหม่', cls:'btn-outline', onClick: function(el) { saveProductForm(el, rec, true); } });
  buttons.push({ label:'บันทึกและปิด', cls:'btn-primary', onClick: function(el) { saveProductForm(el, rec, false); } });
  window._pfImg = p.image || '';
  openModal({ wide: true, title: rec ? 'แก้ไข' + kindLabel(p) + ' · ' + (p.name || '') : KIND_NEW_TITLE[p.kind] || 'เพิ่มผลิตภัณฑ์/บริการ', body: body, buttons: buttons, onMount: function() {
    byId('modalBody').classList.add('pf-body');
    var sync = function() {
      var k = byId('p_kind').value, noun = KIND_NOUN[k];
      byId('p_stockBox').hidden = k !== 'goods'; byId('p_bundleBox').hidden = k !== 'bundle';
      byId('p_sellLbl').textContent = 'ฉันขาย' + noun + 'ให้กับ ลูกค้า'; byId('p_buyLbl').textContent = 'ฉันซื้อ' + noun + 'จากซัพพลายเออร์';
      byId('p_sellBox').hidden = !byId('p_sells').checked; byId('p_buyBox').hidden = !byId('p_buys').checked;
      byId('pfBuy').hidden = k === 'bundle';
      if (!rec) byId('modalTitle').textContent = KIND_NEW_TITLE[k];
    };
    ['p_cat','p_unit'].forEach(function(id) { var el = byId(id); el.addEventListener('change', function() { if (el.value !== '__new') return; var inp = document.createElement('input'); inp.id = id; inp.placeholder = 'พิมพ์' + (id === 'p_cat' ? 'หมวดหมู่' : 'หน่วยนับ') + 'ใหม่'; el.replaceWith(inp); inp.focus(); }); });
    ['p_kind','p_sells','p_buys'].forEach(function(id) { byId(id).addEventListener('change', sync); }); sync();
    byId('p_img').addEventListener('change', function() {
      var f = this.files[0]; if (!f) return;
      var r = new FileReader(); r.onload = function() { var im = new Image(); im.onload = function() { var s = Math.min(1, 240 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); window._pfImg = c.toDataURL('image/jpeg', 0.82); byId('p_imgBox').querySelector('svg, img').outerHTML = '<img src="' + window._pfImg + '" alt="">'; byId('p_imgBox').querySelector('span').textContent = 'เปลี่ยนรูปภาพ'; }; im.src = r.result; }; r.readAsDataURL(f);
    });
  } });
}
function pfDrop(id, list, cur, ph) {
  var seen = {}, opts = list.filter(function(x) { if (!x || seen[x]) return false; seen[x] = 1; return true; });
  if (cur && !seen[cur]) opts.unshift(cur);
  return '<select id="' + id + '"><option value="">' + ph + '</option>' + opts.map(function(x) { return '<option' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '<option value="__new">+ เพิ่มใหม่…</option></select>';
}
function saveProductForm(btn, rec, again) {
  var v = function(id) { var e = byId(id); return e ? e.value.trim() : ''; }, num = function(id) { var x = v(id); return x === '' ? null : Number(x); };
  var err = byId('formError'), name = v('p_name');
  if (!name) { err.textContent = 'กรุณาระบุชื่อ'; err.hidden = false; return; }
  if (STORE.products.some(function(x) { return x.name === name && (!rec || x._id !== rec._id); })) { err.textContent = 'มีชื่อ "' + name + '" อยู่แล้ว'; err.hidden = false; return; }
  var k = v('p_kind'), sells = byId('p_sells').checked, buys = byId('p_buys').checked && k !== 'bundle';
  var out = { name: name, kind: k, sku: v('p_sku'), category: v('p_cat') === '__new' ? '' : v('p_cat'), unit: v('p_unit') === '__new' ? '' : v('p_unit'), image: window._pfImg || '',
    sells: sells, desc: v('p_desc'), price: sells ? num('p_price') : null, incomeAccount: v('p_incacc'), priceIncTax: byId('p_priceInc').checked, salesTax: v('p_stax'),
    buys: buys, purchaseDesc: v('p_pdesc'), cost: buys ? num('p_cost') : null, costIncTax: byId('p_costInc').checked, purchaseTax: v('p_ptax'), supplier: v('p_sup'), expenseAccount: v('p_expacc'),
    openingQty: k === 'goods' ? num('p_qty') : null, asOf: k === 'goods' ? v('p_asof') : '', reorderPoint: k === 'goods' ? num('p_rp') : null, invAccount: k === 'goods' ? v('p_invacc') : '', bundleItems: k === 'bundle' ? v('p_bundle') : '' };
  runSave(btn, async function() {
    if (rec) await setRec('products', rec._id, Object.assign({}, strip(rec), out, { updatedAt: Date.now() }));
    else await addRec('products', Object.assign(out, { createdAt: Date.now() }));
    showToast(kindLabel(out) + ' "' + name + '" บันทึกแล้ว');
    if (again) openProductForm(null, { kind: k }); else closeModal();
  });
}
