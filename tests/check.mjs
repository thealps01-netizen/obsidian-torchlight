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
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

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
// the declarations of every rule whose whole selector is `sel`
const block = sel => [...code.matchAll(new RegExp(`(?:^|\\})\\s*${sel.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`, 'g'))].map(m => m[1]).join('\n');
const val = (b, v) => (b.match(new RegExp(`${v}\\s*:\\s*([^;]+);`)) || [])[1]?.trim();
const lum = c => { const [r, g, b] = c.map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, c) => { const [x, y] = [lum(a), lum(c)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
for (const mode of ['dark', 'light']) {
  const b = block(`.theme-${mode}`);
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
const both = block('.theme-dark, .theme-light');
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
if (fails.length) { console.error('FAIL\n' + fails.join('\n')); process.exit(1); }
console.log(`PASS (${faces.length} embedded font faces, ${(css.length / 1024).toFixed(0)} KB)`);
