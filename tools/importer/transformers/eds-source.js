/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: eds-source
 * The source is an EDS (Crosswalk) site. Instead of the decorated DOM, import the
 * page's undecorated authored content (<path>.plain.html), then:
 *  - beforeTransform: absolutize image URLs, drop optimization params, make
 *    same-host links relative
 *  - afterTransform: convert Crosswalk section attributes (data-sec-*, data-image)
 *    into Section Metadata blocks and separate sections with <hr>
 */

const SOURCE_HOST = 'main--secur-financial-14-08--livedemoservices.aem.live';

function cleanImages(main, document) {
  main.querySelectorAll('picture').forEach((pic) => {
    const img = pic.querySelector('img');
    if (!img) { pic.remove(); return; }
    const url = new URL(img.getAttribute('src'), document.location.href);
    const clean = document.createElement('img');
    clean.src = `${url.origin}${url.pathname}`;
    if (img.alt) clean.alt = img.alt;
    pic.replaceWith(clean);
  });
  main.querySelectorAll('img').forEach((img) => {
    const url = new URL(img.getAttribute('src'), document.location.href);
    if (url.pathname.includes('/media_')) img.src = `${url.origin}${url.pathname}`;
    else img.src = url.href;
  });
}

function cleanLinks(main) {
  main.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    try {
      const url = new URL(href);
      if (url.host === SOURCE_HOST) a.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
    } catch (e) { /* relative link, keep */ }
  });
}

/** Crosswalk link fields can resolve to "<page-url>#fff"; keep only the authored value. */
function normalizeValue(key, value) {
  if (key === 'sec-color') {
    const m = value.match(/#([0-9a-fA-F]{3,8})$/);
    return m ? `#${m[1]}` : value;
  }
  return value;
}

function buildSectionMetadata(section, document) {
  const rows = [];
  if (section.className) rows.push(['style', section.className.split(/\s+/).join(', ')]);
  [...section.attributes]
    .filter((attr) => attr.name.startsWith('data-'))
    .forEach((attr) => {
      const key = attr.name.slice(5);
      if (key === 'image' || key.endsWith('-image')) {
        const url = new URL(attr.value, document.location.href);
        const img = document.createElement('img');
        img.src = url.pathname.includes('/media_') ? `${url.origin}${url.pathname}` : url.href;
        rows.push([key, img]);
      } else {
        rows.push([key, normalizeValue(key, attr.value)]);
      }
    });
  if (!rows.length) return null;
  return WebImporter.Blocks.createBlock(document, { name: 'Section Metadata', cells: rows });
}

export default function transform(hookName, element, payload) {
  const { document } = payload;
  if (hookName === 'beforeTransform') {
    cleanImages(element, document);
    cleanLinks(element);
  }
  if (hookName === 'afterTransform') {
    const sections = [...element.querySelectorAll(':scope > div')];
    sections.forEach((section, i) => {
      const meta = buildSectionMetadata(section, document);
      if (meta) section.append(meta);
      if (i > 0) section.before(document.createElement('hr'));
    });
  }
}
