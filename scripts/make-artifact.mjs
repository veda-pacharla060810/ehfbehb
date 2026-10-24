// Converts dist-single/index.html into a page fragment for hosts that supply their own
// <html>/<head>/<body> skeleton: title + metas + styles, then #root, then scripts in order.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const html = readFileSync('dist-single/index.html', 'utf8');
const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
const pick = (re) => head.match(re) || [];

const title = pick(/<title>[\s\S]*?<\/title>/)[0] || '<title>vaa kannamma</title>';
const metas = [...head.matchAll(/<meta (?!charset)(?!name="viewport")[^>]*>/g)].map((m) => m[0]);
const links = [...head.matchAll(/<link [^>]*>/g)].map((m) => m[0]);
const styles = [...head.matchAll(/<style[\s\S]*?<\/style>/g)].map((m) => m[0]);
const scripts = [...head.matchAll(/<script[\s\S]*?<\/script>/g)].map((m) => m[0]);

const out = [title, ...metas, ...links, ...styles, '<div id="root"></div>', ...scripts].join('\n');
mkdirSync('artifact', { recursive: true });
writeFileSync('artifact/vaa-kannamma.html', out);
console.log(`artifact/vaa-kannamma.html  ${(out.length / 1024).toFixed(1)} KB, ${scripts.length} scripts`);
