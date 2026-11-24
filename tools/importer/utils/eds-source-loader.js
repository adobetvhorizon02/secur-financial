/* eslint-disable */
import { captureProductCards, applyProductCards } from './product-card-content.js';

/**
 * Source is an EDS site: import the undecorated authored content instead of the decorated DOM.
 */
/** Replace the rendered <body> with <main> holding the page's .plain.html content. */
export default async function loadSourceContent(document) {
  const { pathname } = document.location;
  const path = pathname === '/' ? '/index' : pathname.replace(/\/$/, '').replace(/\.html$/, '');
  const resp = await fetch(`${path}.plain.html`, { cache: 'no-store' });
  if (!resp.ok) throw new Error(`Failed to load ${path}.plain.html: ${resp.status}`);
  const html = await resp.text();
  // runtime-loaded product-card content only exists in the rendered page
  const productCards = await captureProductCards(document);
  document.body.innerHTML = `<main>${html}</main>`;
  await applyProductCards(document, productCards);

  // the importer's pre-processing (before transform) strips <strong> inside headings;
  // authored bold headings render heavier, so keep them as <b> (still output as bold)
  document.querySelectorAll('main :is(h1, h2, h3, h4, h5, h6) strong').forEach((s) => {
    const b = document.createElement('b');
    b.append(...s.childNodes);
    s.replaceWith(b);
  });
}
