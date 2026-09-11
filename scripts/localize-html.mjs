// Emits one static HTML entry per language (dist/en/index.html, dist/fr/...,
// dist/de/...) from the built dist/index.html, each with that language's
// <html lang>, title, description, canonical, Open Graph and Twitter tags.
//
// Why static files and not only client-side switching: canonical and hreflang are
// read from the HTML the server sends. If /en/ served the Spanish head, its
// canonical would point at / and search engines would fold the English page into
// the Spanish one, so the translation would never be indexed on its own.
//
// Texts come from src/seo-meta.json, which the app also reads when the visitor
// switches language, so the two cannot drift apart.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const meta = JSON.parse(readFileSync(new URL('../src/seo-meta.json', import.meta.url), 'utf8'));

const attr = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function replaceTag(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    // Fail the build instead of shipping a localized page that silently kept the
    // Spanish canonical or title because index.html changed shape.
    throw new Error(`localize-html: no se encontró ${label} en index.html`);
  }
  return html.replace(pattern, () => replacement);
}

export function localizeHtml(distDir) {
  const source = readFileSync(join(distDir, 'index.html'), 'utf8');
  const written = [];

  for (const [code, m] of Object.entries(meta.langs)) {
    if (code === meta.defaultLang) continue;

    const url = meta.siteUrl + m.path;
    const alternates = Object.entries(meta.langs)
      .filter(([other]) => other !== code)
      .map(([, o]) => `<meta property="og:locale:alternate" content="${o.ogLocale}" />`)
      .join('\n    ');

    let html = source;
    html = replaceTag(html, /<html lang="[^"]*">/, `<html lang="${m.htmlLang}">`, '<html lang>');
    html = replaceTag(html, /<title>[^<]*<\/title>/, `<title>${attr(m.title)}</title>`, '<title>');
    html = replaceTag(html, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${attr(m.description)}" />`, 'meta description');
    html = replaceTag(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`, 'canonical');
    html = replaceTag(html, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${attr(m.title)}" />`, 'og:title');
    html = replaceTag(html, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${attr(m.description)}" />`, 'og:description');
    html = replaceTag(html, /<meta property="og:image:alt" content="[^"]*" \/>/, `<meta property="og:image:alt" content="${attr(m.imageAlt)}" />`, 'og:image:alt');
    html = replaceTag(html, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`, 'og:url');
    html = replaceTag(html, /<meta property="og:locale" content="[^"]*" \/>/, `<meta property="og:locale" content="${m.ogLocale}" />`, 'og:locale');
    html = replaceTag(html, /(?:<meta property="og:locale:alternate" content="[^"]*" \/>\s*)+/, `${alternates}\n\n    `, 'og:locale:alternate');
    html = replaceTag(html, /<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${attr(m.title)}" />`, 'twitter:title');
    html = replaceTag(html, /<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${attr(m.description)}" />`, 'twitter:description');
    html = replaceTag(html, /<meta name="twitter:image:alt" content="[^"]*" \/>/, `<meta name="twitter:image:alt" content="${attr(m.imageAlt)}" />`, 'twitter:image:alt');

    mkdirSync(join(distDir, code), { recursive: true });
    writeFileSync(join(distDir, code, 'index.html'), html);
    written.push(`${code}/index.html`);
  }

  return written;
}
