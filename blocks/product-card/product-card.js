import { resolveAnchorValue, toClassName } from '../../scripts/aem.js';

/*
 * Product Card
 * All content is authored in the block (no content fragment / GraphQL lookup).
 * Rows are key / value pairs:
 *   image        | picture (optional)
 *   title        | product name
 *   description  | rich text
 *   product-id   | product SKU, appended to the CTA link as ?productId= (optional)
 *   category     | product category, used for the data layer (optional)
 *   layout       | side-by-side | stacked | compact-stacked-card
 *   buttonText   | CTA label
 *   link         | CTA link
 *   ctastyle     | button | button-secondary | button-dark | link | default
 *   hideDescription, addBorder | true / false
 *   buttonEventType | data-button-event-type for the CTA (optional)
 */

function revealProductCardWrapper(block) {
  const wrapperElement = block.closest('.product-card-wrapper');
  if (wrapperElement) wrapperElement.classList.add('show');
}

/** Map each key/value row to { key: valueCell } (keys normalized like readBlockConfig). */
function readRows(block) {
  const rows = {};
  [...block.children].forEach((row) => {
    const [keyCell, valueCell] = row.children;
    if (!keyCell || !valueCell) return;
    const key = toClassName(keyCell.textContent);
    if (key) rows[key] = valueCell;
  });
  return rows;
}

function cellText(cell) {
  return cell ? cell.textContent.trim() : '';
}

function cellLink(cell) {
  const anchor = cell?.querySelector('a');
  return anchor ? resolveAnchorValue(anchor) : cellText(cell);
}

function readProduct(rows) {
  const descriptionCell = rows.description;
  let description = '';
  if (descriptionCell) {
    // single-line text arrives without a wrapping paragraph
    description = descriptionCell.children.length
      ? descriptionCell.innerHTML.trim()
      : `<p>${descriptionCell.innerHTML.trim()}</p>`;
    if (!cellText(descriptionCell)) description = '';
  }
  const sku = cellText(rows['product-id'] || rows.productid || rows.sku);
  return {
    id: sku,
    name: cellText(rows.title || rows.name),
    category: cellText(rows.category),
    description,
    sku,
    picture: rows.image?.querySelector('picture') || null,
    image: rows.image?.querySelector('img') || null,
  };
}

function appendProductIdToButton(buttonConfig, product) {
  if (!buttonConfig?.node || !product?.sku) return buttonConfig;
  const anchor = buttonConfig.node.querySelector('a');
  if (!anchor) return buttonConfig;
  const productId = String(product.sku || product.id || '').trim();
  if (!productId) return buttonConfig;
  try {
    const url = new URL(anchor.href || window.location.href);
    url.searchParams.set('productId', productId);
    anchor.href = url.href;
  } catch (error) {
    const encodedId = encodeURIComponent(productId);
    const href = anchor.href || '';
    const separator = href.includes('?') ? '&' : '?';
    anchor.href = `${href}${separator}productId=${encodedId}`;
  }
  return buttonConfig;
}

function buildDatalayerProductPayload(product) {
  if (!product) return null;
  return {
    id: product.id || '',
    name: product.name || '',
    category: product.category || '',
    description: product.description || '',
    sku: product.sku || '',
  };
}

function publishProductToDataLayer(productPayload) {
  if (!productPayload || typeof window.updateDataLayer !== 'function') return;
  const productId = String(productPayload.sku || productPayload.id || '').trim();
  window.updateDataLayer(
    {
      product: { ...productPayload },
      productId,
    },
    true,
  );
}

function attachProductDataLayerHandler(buttonConfig, productPayload) {
  if (!buttonConfig?.node || !productPayload) return;
  const anchor = buttonConfig.node.querySelector('a');
  if (!anchor) return;
  anchor.addEventListener('click', () => publishProductToDataLayer(productPayload));
}

function makeCardClickable(card, buttonConfig, productPayload) {
  const anchor = buttonConfig?.node?.querySelector('a[href]');
  if (!card || !anchor) return;

  card.classList.add('product-card-clickable');
  card.tabIndex = 0;
  card.setAttribute('role', 'link');
  if (anchor.target === '_blank') {
    card.setAttribute('aria-label', `${anchor.textContent || 'Open product'} (opens in a new tab)`);
  }

  const triggerAnchor = () => {
    publishProductToDataLayer(productPayload);
    anchor.click();
  };

  card.addEventListener('click', (event) => {
    if (event.target.closest('a, button, input, select, textarea, summary, label')) return;
    triggerAnchor();
  });

  card.addEventListener('keydown', (event) => {
    if (event.target !== card) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    triggerAnchor();
  });
}

function createCard(product, buttonConfig) {
  const photo = document.createElement('div');
  photo.className = 'product-card-image';
  if (product.image) {
    if (!product.image.alt) product.image.alt = product.name || 'Product image';
    photo.appendChild(product.picture || product.image);
  } else {
    photo.classList.add('product-card-image-hidden');
  }

  const body = document.createElement('div');
  body.className = 'product-card-body';

  const name = document.createElement('h3');
  name.textContent = product.name || 'Product';

  const description = document.createElement('div');
  description.className = 'product-card-description';
  if (product.description) description.innerHTML = product.description;

  body.append(name, description);

  const li = document.createElement('li');
  li.append(photo, body);
  if (buttonConfig?.node) body.appendChild(buttonConfig.node);
  return li;
}

function isTruthy(value) {
  return value === true || String(value).trim().toLowerCase() === 'true';
}

function createButtonFromConfig(config) {
  if (!config || (!config.text && !config.link)) return null;
  const container = document.createElement('p');
  container.className = 'button-container';
  const styleMap = {
    button: 'cta-button',
    'button-secondary': 'cta-button-secondary',
    'button-dark': 'cta-button-dark',
    link: 'cta-link',
    default: 'cta-default',
  };
  const mappedStyle = styleMap[config.style] || config.style;
  if (mappedStyle) container.classList.add(mappedStyle);
  const anchor = document.createElement('a');
  anchor.classList.add('button');
  anchor.textContent = config.text || 'Learn more';
  if (config.link) anchor.href = config.link;
  if (config.eventType) anchor.dataset.buttonEventType = config.eventType;
  container.appendChild(anchor);
  return { node: container };
}

export default function decorate(block) {
  block.classList.add('product-card-block');
  try {
    const rows = readRows(block);
    const product = readProduct(rows);
    const layoutValue = cellText(rows.layout).toLowerCase();
    const layout = ['side-by-side', 'stacked', 'compact-stacked-card'].includes(layoutValue)
      ? layoutValue
      : 'stacked';
    const hideDescription = isTruthy(cellText(rows.hidedescription));
    const addBorder = isTruthy(cellText(rows.addborder));
    const buttonConfig = createButtonFromConfig({
      text: cellText(rows.buttontext),
      link: rows.link ? cellLink(rows.link) : '',
      eventType: cellText(rows.buttoneventtype),
      style: cellText(rows.ctastyle) || 'default',
    });
    block.innerHTML = '';

    const productPayload = buildDatalayerProductPayload(product);

    const wrapper = document.createElement('div');
    wrapper.className = 'cards product-card-block';
    wrapper.classList.add(`product-card-layout-${layout}`);
    if (hideDescription) wrapper.classList.add('product-card-hide-description');
    if (addBorder) wrapper.classList.add('product-card-add-border');
    const list = document.createElement('ul');
    const productButtonConfig = appendProductIdToButton(buttonConfig, product);
    attachProductDataLayerHandler(productButtonConfig, productPayload);
    const card = createCard(product, productButtonConfig);
    makeCardClickable(card, productButtonConfig, productPayload);
    list.append(card);
    wrapper.append(list);
    block.append(wrapper);
  } finally {
    revealProductCardWrapper(block);
  }
}
