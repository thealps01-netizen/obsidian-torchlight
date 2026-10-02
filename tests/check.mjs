// Checks the theme against Obsidian's theme guidelines (docs.obsidian.md, Themes → Theme guidelines) and its
// companion contract with the Adventure Runner plugin. Exit 1 with the list of failures.
// (1) theme.css is what src/theme.css builds (no hand edits to the generated file)
// (2) no !important
// (3) no remote loading: every url() is a data: URI
// (4) every @font-face is embedded, and each font file has its OFL licence next to it
// (5) both modes: .theme-dark and .theme-light each set the colour scale and the accent
// (6) never styles the Adventure Runner panel (.dmr-*) or sets its --dmr-* variables: the panel keeps its own look
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
ok('every url() is a data: URI', urls.every(u => u.startsWith('data:')), urls.filter(u => !u.startsWith('data:')));
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
ok('does not style the Adventure Runner panel', !/\.dmr[-\s{.,:]/.test(css) && !/--dmr-[\w-]+\s*:/.test(css));
const man = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
for (const k of ['name', 'version', 'minAppVersion', 'author']) ok(`manifest.${k}`, typeof man[k] === 'string' && man[k].length > 0);
ok('manifest version is semver', /^\d+\.\d+\.\d+$/.test(man.version), man.version);
ok('screenshot for the theme list', existsSync(join(ROOT, 'screenshot.png')));
if (fails.length) { console.error('FAIL\n' + fails.join('\n')); process.exit(1); }
console.log(`PASS (${faces.length} embedded font faces, ${(css.length / 1024).toFixed(0)} KB)`);
