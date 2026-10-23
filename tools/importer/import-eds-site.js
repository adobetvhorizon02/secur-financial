/* eslint-disable */
/* global WebImporter */

// Source is an EDS (Crosswalk) site whose blocks already exist in this project,
// so one script covers every page template: each authored block is carried over 1:1.
import edsBlockParser from './parsers/eds-block.js';
import edsSourceTransformer from './transformers/eds-source.js';
import edsMetadataTransformer from './transformers/eds-metadata.js';
import loadSourceContent from './utils/eds-source-loader.js';

const PAGE_TEMPLATE = {
  name: 'eds-site',
  description: 'All pages of the source EDS site (blocks carried over 1:1 from .plain.html)',
  blocks: [
    { name: 'eds-block', instances: ['main > div > div[class]'] },
  ],
};

const parsers = { 'eds-block': edsBlockParser };
const transformers = [edsSourceTransformer, edsMetadataTransformer];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => {
    try { fn(hookName, element, enhancedPayload); }
    catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element, block: element.classList[0] });
      });
    });
  });
  return pageBlocks;
}

export default {
  onLoad: async ({ document }) => {
    await loadSourceContent(document);
  },

  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.querySelector('main') || document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try { parser(block.element, { document, url, params }); }
      catch (e) { console.error(`Failed to parse ${block.name} (${block.selector}):`, e); }
    });

    executeTransformers('afterTransform', main, payload);

    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.block) },
    }];
  },
};
