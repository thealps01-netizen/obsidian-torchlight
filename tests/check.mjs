// Checks the theme against Obsidian's theme guidelines (docs.obsidian.md, Themes → Theme guidelines) and the
// theme's own promises. Exit 1 with the list of failures.
// (1) theme.css is what src/theme.css builds (no hand edits to the generated file)
// (2) no !important
// (3) no remote loading: every url() is a data: URI
// (4) every @font-face is embedded, and each font file has its OFL licence next to it
// (5) both modes: .theme-dark and .theme-light each set the colour scale and the accent
// (6) a plain theme: it styles nothing that belongs to a plugin (no plugin's classes or variables)
// (7) the gold is Obsidian's accent, so Settings → Appearance → Accent color recolours the theme
// (8) the app's own icons take the gold (--icon-color*)
// (9) readable: normal and muted text 7:1, faint text 4.5:1 (WCAG) on the page in both modes
// (10) Style Settings: the @settings block is well-formed, and each class-toggle id has a body.<id> rule
// (11) manifest.json has the fields the community-theme list needs, and a 512×288 screenshot.png
// (12) phones and tablets keep the palette: Obsidian's `.is-mobile.theme-dark` turns the dark scale black and greys
//      (it outranks `.theme-dark`), so the theme's dark blocks also match `.is-mobile.theme-dark`
// (13) Chromium renders each Style Settings toggle on and off, alone and together, across both modes and all forms
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const ok = (name, cond, got = '') => { if (!cond) fails.push(`${name} ${JSON.stringify(got)}`); };

try { execFileSync(process.execPath, [join(ROOT, 'scripts', 'build.mjs'), '--check'], { stdio: 'pipe' }); ok('theme.css up to date', true); }
catch (e) { ok('theme.css up to date', false, String(e.stderr || e.message).trim()); }
const css = readFileSync(join(ROOT, 'theme.css'), 'utf8');
ok('no !important', !css.includes('!important'), (css.match(/!important/g) || []).length);
const code = css.replace(/\/\*[\s\S]*?\*\//g, '');   // comments mention url(fonts/…); only real values count
const urls = [...code.matchAll(/url\(\s*(['"]?)([^'")]*)/g)].map(m => m[2]);
ok('every url() is a data: URI', urls.every(u => u.startsWith('data:')), urls.filter(u => !u.startsWith('data:')));
const faces = css.match(/@font-face\s*\{[^}]*\}/g) || [];
ok('fonts embedded', faces.length >= 8 && faces.every(f => /url\("data:font\/woff2;base64,/.test(f)), faces.length);
const fonts = readdirSync(join(ROOT, 'fonts'));
for (const fam of new Set(fonts.filter(f => f.endsWith('.woff2')).map(f => f.split('-')[0])))
  ok(`OFL licence for ${fam}`, fonts.includes(`OFL-${fam}.txt`));
// the declarations of every rule whose selector list is exactly `sel` (a list: in any order, extra spaces ignored)
const selKey = s => s.split(',').map(x => x.trim()).filter(Boolean).sort().join(',');
const rules = [...code.matchAll(/(?<=^|\})\s*([^{}@]+?)\s*\{([^}]*)\}/g)].map(m => ({ sel: selKey(m[1]), body: m[2] }));
const block = sel => rules.filter(r => r.sel === selKey(sel)).map(r => r.body).join('\n');
const val = (b, v) => (b.match(new RegExp(`${v}\\s*:\\s*([^;]+);`)) || [])[1]?.trim();
const lum = c => { const [r, g, b] = c.map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, c) => { const [x, y] = [lum(a), lum(c)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const modeSel = { dark: '.theme-dark, .is-mobile.theme-dark', light: '.theme-light' };
for (const mode of ['dark', 'light']) {
  const b = block(modeSel[mode]);
  ok(`${mode} mode sets the colour scale`, /--color-base-00:/.test(b) && /--color-base-100:/.test(b), mode);
  ok(`${mode} mode sets the accent`, /--accent-h:/.test(b) && /--accent-l:/.test(b), mode);
  ok(`${mode} mode: the gold is the accent`, val(b, '--tl-gold') === 'hsl(var(--accent-h), var(--accent-s), var(--accent-l))', val(b, '--tl-gold'));
  // contrast on the page (base-00): text = base-100, muted = base-70, faint = base-50
  const hex = v => { const h = (val(b, v) || '').replace('#', ''); return /^[0-9a-f]{6}$/i.test(h) ? [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255) : null; };
  const page = hex('--color-base-00');
  for (const [v, min, what] of [['--color-base-100', 7, 'text'], ['--color-base-70', 7, 'muted text'], ['--color-base-50', 4.5, 'faint text']]) {
    const c = hex(v);
    ok(`${mode} mode: ${what} ${min}:1 on the page`, page && c && ratio(c, page) >= min, page && c ? ratio(c, page).toFixed(2) : v);
  }
}
ok('a plain theme: no plugin classes or variables', !/--dmr-|\.dmr[-\s{.,:]|#ar-/.test(code), (code.match(/--dmr-[\w-]+|\.dmr-[\w-]+|#ar-[\w-]+/g) || []).slice(0, 5));
const both = block('.theme-dark, .is-mobile.theme-dark, .theme-light');
for (const v of ['--icon-color', '--icon-color-hover', '--icon-color-active', '--icon-color-focused'])
  ok(`sets ${v} for the app's own icons`, new RegExp(`${v}\\s*:`).test(both));

// Style Settings (github.com/mgmeyers/obsidian-style-settings): a YAML block in a /* @settings */ comment
const settings = (css.match(/\/\*\s*@settings\s*([\s\S]*?)\*\//) || [])[1];
ok('Style Settings block', !!settings);
if (settings) {
  ok('Style Settings: name and id', /^name: \S/m.test(settings) && /^id: torchlight$/m.test(settings));
  const items = settings.split(/\n {4}-\s*\n/).slice(1);
  ok('Style Settings: has options', items.length >= 3, items.length);
  for (const it of items) {
    const id = (it.match(/^\s+id: ([\w-]+)$/m) || [])[1], type = (it.match(/^\s+type: ([\w-]+)$/m) || [])[1];
    ok('Style Settings: every option has an id, a title and a type', id && /^\s+title: \S/m.test(it) && type, it.trim().slice(0, 60));
    if (type === 'class-toggle') ok(`Style Settings: ${id} has a body.${id} rule`, new RegExp(`body\\.${id}\\s*\\{`).test(code), id);
  }
}

const man = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
for (const k of ['name', 'version', 'minAppVersion', 'author']) ok(`manifest.${k}`, typeof man[k] === 'string' && man[k].length > 0);
ok('manifest version is semver', /^\d+\.\d+\.\d+$/.test(man.version), man.version);
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
ok('package.json version matches the manifest', pkg.version === man.version, [pkg.version, man.version]);
const shot = join(ROOT, 'screenshot.png');
ok('screenshot for the theme list', existsSync(shot));
if (existsSync(shot)) {
  const png = readFileSync(shot);
  ok('screenshot is 512×288', png.readUInt32BE(16) === 512 && png.readUInt32BE(20) === 288, [png.readUInt32BE(16), png.readUInt32BE(20)]);
}
// Render the shipped CSS in Chromium: finding an option's rule does not prove it wins the cascade.
// This minimal fixture consumes Obsidian's variables; it is not a copy of app.css or an app-version test.
let browser, browserChecks = 0;
try {
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route('**/*', route => route.abort());  // keep the fixture offline
  await page.setContent(`<!doctype html><html><head><style>
    body {
      --font-text: var(--font-text-theme);
      --text-normal: var(--color-base-100); --text-muted: var(--color-base-70);
      --text-accent: hsl(var(--accent-h), var(--accent-s), var(--accent-l));
    }
    /* The host's mobile palette rule matches two classes, unlike its desktop rule. */
    .is-mobile.theme-dark { --color-base-00: #000; }
    h1 { font-family: var(--h1-font); font-variant-caps: var(--h1-variant); }
    h2 { font-family: var(--h2-font); font-variant-caps: var(--h2-variant); }
    h3 { font-family: var(--h3-font); } h4 { font-family: var(--h4-font); }
    h5 { font-family: var(--h5-font); } h6 { font-family: var(--h6-font); }
    .inline-title { font-family: var(--inline-title-font); font-variant-caps: var(--inline-title-variant); }
    #body-font { font-family: var(--font-text); }
    #icon { color: var(--icon-color); } #icon-hover { color: var(--icon-color-hover); }
    #icon-active { color: var(--icon-color-active); } #icon-focused { color: var(--icon-color-focused); }
  </style></head><body>
    <div class="inline-title">Fixture title</div>
    <main class="markdown-rendered">
      <h1>First heading</h1><h2>Second heading</h2><h3>Third heading</h3>
      <h4>Fourth heading</h4><h5>Fifth heading</h5><h6>Sixth heading</h6>
    </main>
    <div class="markdown-source-view mod-cm6">
      <div class="cm-line HyperMD-header-1">First live heading</div>
      <div class="cm-line HyperMD-header-2">Second live heading</div>
    </div>
    <span id="body-font">Body text</span>
    <span id="icon">Icon</span><span id="icon-hover">Hover</span>
    <span id="icon-active">Active</span><span id="icon-focused">Focused</span>
    <span id="muted" style="color: var(--text-muted)">Muted</span>
    <span id="normal" style="color: var(--text-normal)">Normal</span>
    <span id="accent" style="color: var(--text-accent)">Accent</span>
    <span id="gold" style="color: var(--tl-gold)">Gold</span>
    <span id="gold-hover" style="color: var(--tl-gold-2)">Bright gold</span>
  </body></html>`);
  await page.addStyleTag({ content: css });
  const forms = [
    { name: 'desktop', classes: '', width: 1280, height: 800 },
    { name: 'phone', classes: 'is-mobile is-phone', width: 390, height: 844 },
    { name: 'tablet', classes: 'is-mobile is-tablet', width: 820, height: 1180 }
  ];
  for (const form of forms) {
    await page.setViewportSize({ width: form.width, height: form.height });
    for (const mode of ['dark', 'light']) {
      const checks = await page.evaluate(({ classes, mode, pageColor }) => {
        const base = `${classes} theme-${mode}`.trim();
        const nodes = [...document.querySelectorAll('h1, h2, .inline-title, .cm-line')];
        const headings = [...document.querySelectorAll('h1, h2, .inline-title')];
        const fontNodes = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6, .inline-title')];
        const style = id => getComputedStyle(document.getElementById(id));
        const read = () => ({
          rules: nodes.map(node => getComputedStyle(node).borderBottomColor),
          icons: ['icon', 'icon-hover', 'icon-active', 'icon-focused'].map(id => style(id).color),
          fonts: fontNodes.map(node => getComputedStyle(node).fontFamily),
          caps: headings.map(node => getComputedStyle(node).fontVariantCaps)
        });
        document.body.className = base;
        const defaults = read();
        const checks = [];
        const check = (name, actual, expected) => checks.push({ name, pass: JSON.stringify(actual) === JSON.stringify(expected), actual, expected });
        check('The page keeps the themed palette', getComputedStyle(document.body).getPropertyValue('--color-base-00').trim(), pageColor);
        check('Heading rules have a 1px width by default', nodes.map(node => getComputedStyle(node).borderBottomWidth), nodes.map(() => '1px'));
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const paint = canvas.getContext('2d', { willReadFrequently: true });
        checks.push({ name: 'Heading rules have visible colour by default', pass: defaults.rules.every(color => {
          paint.clearRect(0, 0, 1, 1);
          paint.fillStyle = color;
          paint.fillRect(0, 0, 1, 1);
          return paint.getImageData(0, 0, 1, 1).data[3] > 0;
        }), actual: defaults.rules });
        check('Icons are gold by default', defaults.icons, ['gold', 'gold-hover', 'gold-hover', 'gold-hover'].map(id => style(id).color));
        check('Titles use small capitals by default', defaults.caps, headings.map(() => 'small-caps'));
        checks.push({ name: 'Headings use a distinct display font by default', pass: defaults.fonts.every(font => font !== style('body-font').fontFamily), actual: defaults.fonts });
        const options = [
          { id: 'torchlight-text-headings', field: 'fonts', expected: fontNodes.map(() => style('body-font').fontFamily) },
          { id: 'torchlight-no-small-caps', field: 'caps', expected: headings.map(() => 'normal') },
          { id: 'torchlight-no-heading-rules', field: 'rules', expected: nodes.map(() => 'rgba(0, 0, 0, 0)') },
          { id: 'torchlight-plain-icons', field: 'icons', expected: ['muted', 'normal', 'accent', 'normal'].map(id => style(id).color) }
        ];
        for (const option of options) {
          document.body.className = `${base} ${option.id}`;
          check(`${option.id}: enabled`, read()[option.field], option.expected);
          document.body.className = base;
          check(`${option.id}: disabled restores the default`, read(), defaults);
        }
        document.body.className = `${base} ${options.map(option => option.id).join(' ')}`;
        check('All options work together', options.map(option => read()[option.field]), options.map(option => option.expected));
        document.body.className = base;
        check('Disabling all options restores the default', read(), defaults);
        return checks;
      }, { classes: form.classes, mode, pageColor: val(block(modeSel[mode]), '--color-base-00') });
      for (const check of checks) {
        browserChecks++;
        ok(`${form.name} ${mode}: ${check.name}`, check.pass, { actual: check.actual, expected: check.expected });
      }
    }
  }
} catch (e) { ok('Chromium CSS checks (install the browser with npm run test:setup)', false, e.message); }
finally { await browser?.close(); }
if (fails.length) { console.error('FAIL\n' + fails.join('\n')); process.exit(1); }
console.log(`PASS (${faces.length} embedded font faces, ${(css.length / 1024).toFixed(0)} KB, ${browserChecks} browser checks)`);
