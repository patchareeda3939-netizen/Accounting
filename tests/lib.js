// ตัวช่วยที่ใช้ร่วมกันใน e2e.test.js และ regression.test.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TMP = path.join(__dirname, '.tmp');
const FBDIR = path.join(path.dirname(require.resolve('firebase/package.json')), '/');
const PROJECT = process.env.GCLOUD_PROJECT || 'demo-psmacc';
const AUTH = 'http://' + (process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099');
const FSTORE = 'http://' + (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080');

function distHtml() { return fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8'); }
// tests never talk to the real Firebase project: swap whatever config is built into dist/ for
// null (browser-storage mode) or the emulator's demo project
const CONFIG_RE = /^var FIREBASE_CONFIG = (?:null|\{[\s\S]*?\n\});$/m, EMU_RE = /^var FIREBASE_EMULATOR_HOST = [^\n]*;$/m;
function withConfig(html, mode) {
  if (!CONFIG_RE.test(html) || !EMU_RE.test(html)) throw new Error('dist/index.html: FIREBASE_CONFIG not found (run npm run build)');
  const cfg = mode === 'emulator' ? "var FIREBASE_CONFIG = {apiKey:'demo-key',authDomain:'" + PROJECT + ".firebaseapp.com',projectId:'" + PROJECT + "',storageBucket:'" + PROJECT + ".appspot.com',appId:'demo'};" : 'var FIREBASE_CONFIG = null;';
  return html.replace(CONFIG_RE, () => cfg).replace(EMU_RE, () => 'var FIREBASE_EMULATOR_HOST = ' + (mode === 'emulator' ? "'127.0.0.1'" : 'null') + ';');
}

// dist/index.html served over http with a config that points to the Firebase emulator
function startFirebaseApp() {
  const html = withConfig(distHtml(), 'emulator');
  const srv = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, url: 'http://127.0.0.1:' + srv.address().port + '/' })));
}

// local copies for the non-Firebase modes (browser storage, Claude DB mock)
function localPages() {
  fs.mkdirSync(TMP, { recursive: true });
  const html = withConfig(distHtml(), 'local');
  fs.writeFileSync(path.join(TMP, 'local.html'), html);
  fs.copyFileSync(path.join(__dirname, 'mockdb.js'), path.join(TMP, 'mockdb.js'));
  fs.writeFileSync(path.join(TMP, 'claudedb.html'), html.replace('<body>', '<body><script src="mockdb.js"></script>'));
  return { local: 'file://' + path.join(TMP, 'local.html'), claudedb: 'file://' + path.join(TMP, 'claudedb.html') };
}

// new isolated browser context; Firebase SDK served from node_modules, no other internet access
async function newPage(browser, url, waitFor) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.on('dialog', d => (d.type() === 'prompt' ? d.accept(p.promptAnswer || '') : d.accept()));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => {
    const u = new URL(r.request().url());
    if (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/')) return r.fulfill({ path: FBDIR + path.basename(u.pathname), contentType: 'text/javascript' });
    return r.abort();
  });
  await p.goto(url);
  if (waitFor) await p.waitForSelector(waitFor, { timeout: 15000 }); else await p.waitForTimeout(800);
  return p;
}

async function resetEmulators() {
  await fetch(AUTH + '/emulator/v1/projects/' + PROJECT + '/accounts', { method: 'DELETE' });
  await fetch(FSTORE + '/emulator/v1/projects/' + PROJECT + '/databases/(default)/documents', { method: 'DELETE' });
}
async function signup(p, email) {
  await p.click('[data-auth="signup"]');
  await p.fill('#auEmail', email); await p.fill('#auPw', 'test-only-password'); await p.fill('#auPw2', 'test-only-password');
  await p.click('#authSubmit');
}
async function verifyEmail(email) {
  const r = await (await fetch(AUTH + '/emulator/v1/projects/' + PROJECT + '/oobCodes')).json();
  const c = r.oobCodes.filter(o => o.email === email && o.requestType === 'VERIFY_EMAIL').pop();
  await fetch(c.oobLink);
}
async function oobCodes() { return (await (await fetch(AUTH + '/emulator/v1/projects/' + PROJECT + '/oobCodes')).json()).oobCodes; }

// collects results; prints PASS/FAIL lines with ids; exit code 1 on any failure
function reporter(prefix) {
  const results = [];
  return {
    check(id, name, cond, extra) { results.push({ ok: !!cond, id: prefix + id, name, extra }); },
    finish() {
      for (const r of results) console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + r.id + '  ' + r.name + (r.ok || r.extra === undefined ? '' : '  ' + JSON.stringify(r.extra)));
      const failed = results.filter(r => !r.ok).length;
      console.log('\n' + failed + ' failed / ' + results.length);
      return failed;
    }
  };
}

module.exports = { withConfig, distHtml, ROOT, PROJECT, AUTH, FSTORE, startFirebaseApp, localPages, newPage, resetEmulators, signup, verifyEmail, oobCodes, reporter };
