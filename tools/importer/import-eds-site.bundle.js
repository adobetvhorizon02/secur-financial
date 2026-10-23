/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // tools/importer/import-eds-site.js
  var import_eds_site_exports = {};
  __export(import_eds_site_exports, {
    default: () => import_eds_site_default
  });

  // tools/importer/parsers/eds-block.js
  function parse(element, { document }) {
    const [name, ...variants] = [...element.classList];
    const header = variants.length ? `${name} (${variants.join(", ")})` : name;
    const cells = [...element.children].map((row) => {
      const cols = [...row.children];
      if (!cols.length) return [[...row.childNodes]];
      return cols.map((col) => col.childNodes.length ? [...col.childNodes] : "");
    });
    const block = WebImporter.Blocks.createBlock(document, { name: header, cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/eds-source.js
  var SOURCE_HOST = "main--secur-financial-14-08--livedemoservices.aem.live";
  function cleanImages(main, document) {
    main.querySelectorAll("picture").forEach((pic) => {
      const img = pic.querySelector("img");
      if (!img) {
        pic.remove();
        return;
      }
      const url = new URL(img.getAttribute("src"), document.location.href);
      const clean = document.createElement("img");
      clean.src = `${url.origin}${url.pathname}`;
      if (img.alt) clean.alt = img.alt;
      pic.replaceWith(clean);
    });
    main.querySelectorAll("img").forEach((img) => {
      const url = new URL(img.getAttribute("src"), document.location.href);
      if (url.pathname.includes("/media_")) img.src = `${url.origin}${url.pathname}`;
      else img.src = url.href;
    });
  }
  function cleanLinks(main) {
    main.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      try {
        const url = new URL(href);
        if (url.host === SOURCE_HOST) a.setAttribute("href", `${url.pathname}${url.search}${url.hash}`);
      } catch (e) {
      }
    });
  }
  function normalizeValue(key, value) {
    if (key === "sec-color") {
      const m = value.match(/#([0-9a-fA-F]{3,8})$/);
      return m ? `#${m[1]}` : value;
    }
    return value;
  }
  function buildSectionMetadata(section, document) {
    const rows = [];
    if (section.className) rows.push(["style", section.className.split(/\s+/).join(", ")]);
    [...section.attributes].filter((attr) => attr.name.startsWith("data-")).forEach((attr) => {
      const key = attr.name.slice(5);
      if (key === "image" || key.endsWith("-image")) {
        const url = new URL(attr.value, document.location.href);
        const img = document.createElement("img");
        img.src = url.pathname.includes("/media_") ? `${url.origin}${url.pathname}` : url.href;
        rows.push([key, img]);
      } else {
        rows.push([key, normalizeValue(key, attr.value)]);
      }
    });
    if (!rows.length) return null;
    return WebImporter.Blocks.createBlock(document, { name: "Section Metadata", cells: rows });
  }
  function transform(hookName, element, payload) {
    const { document } = payload;
    if (hookName === "beforeTransform") {
      cleanImages(element, document);
      cleanLinks(element);
    }
    if (hookName === "afterTransform") {
      const sections = [...element.querySelectorAll(":scope > div")];
      sections.forEach((section, i) => {
        const meta = buildSectionMetadata(section, document);
        if (meta) section.append(meta);
        if (i > 0) section.before(document.createElement("hr"));
      });
    }
  }

  // tools/importer/transformers/eds-metadata.js
  var SKIP = /* @__PURE__ */ new Set([
    "viewport",
    "published-time",
    "modified-time",
    "content-page-ref",
    "description"
  ]);
  function transform2(hookName, element, payload) {
    if (hookName !== "afterTransform") return;
    const { document } = payload;
    if (/\/(nav|footer)$/.test(document.location.pathname)) return;
    const meta = {};
    const title = document.querySelector("title");
    if (title && title.textContent.trim()) meta.Title = title.textContent.trim();
    const desc = document.querySelector('meta[name="description"]');
    if (desc && desc.content) meta.Description = desc.content;
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && ogImage.content && !ogImage.content.includes("default-meta-image")) {
      const url = new URL(ogImage.content);
      const img = document.createElement("img");
      img.src = `${url.origin}${url.pathname}`;
      meta.Image = img;
    }
    document.querySelectorAll("head meta[name]").forEach((m) => {
      const name = m.getAttribute("name");
      if (SKIP.has(name) || name.includes(":") || !m.content) return;
      meta[name] = m.content;
    });
    if (Object.keys(meta).length) {
      element.append(document.createElement("hr"));
      element.append(WebImporter.Blocks.getMetadataBlock(document, meta));
    }
  }

  // tools/importer/utils/eds-source-loader.js
  function loadSourceContent(document) {
    return __async(this, null, function* () {
      const { pathname } = document.location;
      const path = pathname === "/" ? "/index" : pathname.replace(/\/$/, "").replace(/\.html$/, "");
      const resp = yield fetch(`${path}.plain.html`, { cache: "no-store" });
      if (!resp.ok) throw new Error(`Failed to load ${path}.plain.html: ${resp.status}`);
      const html = yield resp.text();
      document.body.innerHTML = `<main>${html}</main>`;
      document.querySelectorAll("main :is(h1, h2, h3, h4, h5, h6) strong").forEach((s) => {
        const b = document.createElement("b");
        b.append(...s.childNodes);
        s.replaceWith(b);
      });
    });
  }

  // tools/importer/import-eds-site.js
  var PAGE_TEMPLATE = {
    name: "eds-site",
    description: "All pages of the source EDS site (blocks carried over 1:1 from .plain.html)",
    blocks: [
      { name: "eds-block", instances: ["main > div > div[class]"] }
    ]
  };
  var parsers = { "eds-block": parse };
  var transformers = [transform, transform2];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
    transformers.forEach((fn) => {
      try {
        fn(hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
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
  var import_eds_site_default = {
    onLoad: (_0) => __async(null, [_0], function* ({ document }) {
      yield loadSourceContent(document);
    }),
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.querySelector("main") || document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (!parser) return;
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      });
      executeTransformers("afterTransform", main, payload);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.block) }
      }];
    }
  };
  return __toCommonJS(import_eds_site_exports);
})();
