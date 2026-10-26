/* eslint-disable */

/**
 * product-card on the source loads its content from a content fragment at runtime.
 * The migrated block is fully authored, so capture what each card displays on the
 * rendered source page and write it into the block rows (image, title, description,
 * product-id, category) in place of the contentFragmentFolder row.
 */

const PRODUCT_API = 'https://275323-918sangriatortoise.adobeioruntime.net/api/v1/web/dx-excshell-1/secure-financial-product-card-information';
const PRODUCT_API_ENVIRONMENT = 'p189874-e1977911';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Read the rendered (decorated) product cards, waiting for their runtime content. */
export async function captureProductCards(document) {
  const blocks = () => [...document.querySelectorAll('main div.product-card')];
  if (!blocks().length) return [];
  for (let i = 0; i < 40; i += 1) {
    if (blocks().every((b) => b.querySelector('li h3'))) break;
    await sleep(500);
  }
  return blocks().map((block) => {
    const li = block.querySelector('li');
    if (!li || !li.querySelector('h3')) return null;
    const img = li.querySelector('.product-card-image img');
    const desc = li.querySelector('.product-card-description');
    const anchor = li.querySelector('.product-card-body a[href]');
    let productId = '';
    try { productId = new URL(anchor.href).searchParams.get('productId') || ''; } catch (e) { /* no link */ }
    return {
      title: li.querySelector('h3').textContent.trim(),
      description: desc ? desc.innerHTML : '',
      image: img ? img.src : '',
      productId,
    };
  });
}

async function fetchProduct(cfPath) {
  if (!cfPath) return null;
  try {
    const resp = await fetch(`${PRODUCT_API}?environment=${PRODUCT_API_ENVIRONMENT}&path=${cfPath}`);
    if (!resp.ok) return null;
    const item = (await resp.json())?.data?.securFinancialProductByPath?.item;
    if (!item) return null;
    return {
      title: item.productName || '',
      description: item.productDescription?.html || '',
      image: item.productImage?._publishUrl || '',
      productId: item.productSku || '',
      category: item.productCategory || '',
    };
  } catch (e) {
    return null;
  }
}

function cleanDescription(document, html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  div.querySelectorAll('p').forEach((p) => { if (!p.textContent.trim() && !p.querySelector('img')) p.remove(); });
  return div.innerHTML.trim();
}

function row(document, key, value) {
  const r = document.createElement('div');
  const k = document.createElement('div');
  k.textContent = key;
  const v = document.createElement('div');
  if (typeof value === 'string') v.innerHTML = value; else if (value) v.append(value);
  r.append(k, v);
  return r;
}

/** Rewrite the undecorated product-card blocks in <main> using the captured content. */
export async function applyProductCards(document, captured) {
  const blocks = [...document.querySelectorAll('main div.product-card')];
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const cfRow = [...block.children].find((r) => /^contentfragmentfolder$/i.test(r.children[0]?.textContent.trim()));
    const cfPath = cfRow ? cfRow.children[1].textContent.trim() : '';
    const api = await fetchProduct(cfPath);
    const shown = captured[i] || api;
    if (!shown) {
      console.warn(`product-card ${i}: no content found for ${cfPath}`);
      continue;
    }
    const rows = [];
    if (shown.image) {
      const img = document.createElement('img');
      img.src = shown.image;
      img.alt = shown.title;
      rows.push(row(document, 'image', img));
    }
    rows.push(row(document, 'title', shown.title));
    rows.push(row(document, 'description', cleanDescription(document, shown.description)));
    if (shown.productId) rows.push(row(document, 'product-id', shown.productId));
    if (api?.category) rows.push(row(document, 'category', api.category));
    if (cfRow) cfRow.replaceWith(...rows); else block.prepend(...rows);
  }
}
