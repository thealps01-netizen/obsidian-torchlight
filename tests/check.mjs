// Checks the theme against Obsidian's theme guidelines (docs.obsidian.md, Themes → Theme guidelines) and its
// companion contract with the Adventure Runner plugin. Exit 1 with the list of failures.
// (1) theme.css is what src/theme.css builds (no hand edits to the generated file)
// (2) no !important
// (3) no remote loading: every url() is a data: URI or a same-page fragment (#id)
// (4) every @font-face is embedded, and each font file has its OFL licence next to it
// (5) both modes: .theme-dark and .theme-light each set the colour scale and the accent
// (6) fills the Adventure Runner panel's --dmr-* variables in both modes (the panel reads them; docs/theming.md in the
//     plugin lists them) and never styles the panel's classes (.dmr-*): the plugin owns its layout
// (7) manifest.json has the fields the community-theme list needs
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
// a data: URI, or a same-page fragment (#ar-gold: the panel's gradient in the page); nothing loaded from elsewhere
const local = u => u.startsWith('data:') || u.startsWith('#');
ok('every url() is a data: URI or a same-page fragment', urls.every(local), urls.filter(u => !local(u)));
const faces = css.match(/@font-face\s*\{[^}]*\}/g) || [];
ok('fonts embedded', faces.length >= 8 && faces.every(f => /url\("data:font\/woff2;base64,/.test(f)), faces.length);
const fonts = readdirSync(join(ROOT, 'fonts'));
for (const fam of new Set(fonts.filter(f => f.endsWith('.woff2')).map(f => f.split('-')[0])))
  ok(`OFL licence for ${fam}`, fonts.includes(`OFL-${fam}.txt`));
for (const mode of ['dark', 'light']) {
  const block = (css.match(new RegExp(`\\.theme-${mode}\\s*\\{[^}]*\\}`)) || [''])[0];
  ok(`${mode} mode sets the colour scale`, /--color-base-00:/.test(block) && /--color-base-100:/.test(block), mode);
  ok(`${mode} mode sets the accent`, /--accent-h:/.test(block) && /--accent-l:/.test(block), mode);
}
// Obsidian's own icons (ribbon, file explorer, tabs) take --icon-color*, which defaults to the muted text colour:
// without these the app's icons stay grey-beige while everything else is gold (or bronze in light mode).
const both = [...code.matchAll(/\.theme-dark,\s*\.theme-light\s*\{([^}]*)\}/g)].map(m => m[1]).join('\n');
for (const v of ['--icon-color', '--icon-color-hover', '--icon-color-active', '--icon-color-focused'])
  ok(`sets ${v} for Obsidian's own icons`, new RegExp(`${v}\\s*:`).test(both));
ok('does not style the Adventure Runner panel\'s classes', !/\.dmr[-\s{.,:]/.test(code));
const panel = mode => [...code.matchAll(new RegExp(`\\.theme-${mode}\\s*\\{([^}]*)\\}`, 'g'))].map(m => m[1]).join('\n');
for (const mode of ['dark', 'light']) {
  const set = new Set([...panel(mode).matchAll(/(--dmr-[\w-]+)\s*:/g)].map(m => m[1]));
  ok(`${mode} mode fills the panel's palette`, ['--dmr-gold', '--dmr-red', '--dmr-metal', '--dmr-icon-fill'].every(v => set.has(v)), [...set]);
}
// every variable the theme sets is one the plugin reads (a typo would silently do nothing)
const plugDoc = join(ROOT, '..', 'adventure-runner', 'docs', 'theming.md');
if (existsSync(plugDoc)) {
  const known = new Set([...readFileSync(plugDoc, 'utf8').matchAll(/^\| `(--dmr-[\w-]+)`/gm)].map(m => m[1]));
  const unknown = [...new Set([...code.matchAll(/(--dmr-[\w-]+)\s*:/g)].map(m => m[1]))].filter(v => !known.has(v));
  ok('only variables the plugin reads', unknown.length === 0, unknown);
}
const man = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
for (const k of ['name', 'version', 'minAppVersion', 'author']) ok(`manifest.${k}`, typeof man[k] === 'string' && man[k].length > 0);
ok('manifest version is semver', /^\d+\.\d+\.\d+$/.test(man.version), man.version);
ok('screenshot for the theme list', existsSync(join(ROOT, 'screenshot.png')));
if (fails.length) { console.error('FAIL\n' + fails.join('\n')); process.exit(1); }
console.log(`PASS (${faces.length} embedded font faces, ${(css.length / 1024).toFixed(0)} KB)`);
