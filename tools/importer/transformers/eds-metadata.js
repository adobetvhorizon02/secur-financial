/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: eds-metadata
 * afterTransform: build the page Metadata block from the source page <head>.
 * Keeps title, description, social image (unless the site default) and the
 * custom page metadata the project code reads (theme, pagecategory, ...).
 */

const SKIP = new Set([
  'viewport', 'published-time', 'modified-time', 'content-page-ref', 'description',
]);

export default function transform(hookName, element, payload) {
  if (hookName !== 'afterTransform') return;
  const { document } = payload;
  // nav/footer are fragments, not pages
  if (/\/(nav|footer)$/.test(document.location.pathname)) return;
  const meta = {};

  const title = document.querySelector('title');
  if (title && title.textContent.trim()) meta.Title = title.textContent.trim();

  const desc = document.querySelector('meta[name="description"]');
  if (desc && desc.content) meta.Description = desc.content;

  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage && ogImage.content && !ogImage.content.includes('default-meta-image')) {
    const url = new URL(ogImage.content);
    const img = document.createElement('img');
    img.src = `${url.origin}${url.pathname}`;
    meta.Image = img;
  }

  document.querySelectorAll('head meta[name]').forEach((m) => {
    const name = m.getAttribute('name');
    if (SKIP.has(name) || name.includes(':') || !m.content) return;
    meta[name] = m.content;
  });

  if (Object.keys(meta).length) {
    element.append(document.createElement('hr'));
    element.append(WebImporter.Blocks.getMetadataBlock(document, meta));
  }
}
