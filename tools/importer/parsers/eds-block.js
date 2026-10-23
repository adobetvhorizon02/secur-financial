/* eslint-disable */
/* global WebImporter */

/**
 * Parser: eds-block
 * Source is an EDS (Crosswalk) site whose blocks already match this project.
 * Converts an undecorated EDS block (<div class="name variant">rows/cells</div>)
 * into a DA block table, preserving every row and cell (including empty ones)
 * so the field order expected by the block JS is unchanged.
 */
export default function parse(element, { document }) {
  const [name, ...variants] = [...element.classList];
  const header = variants.length ? `${name} (${variants.join(', ')})` : name;

  const cells = [...element.children].map((row) => {
    const cols = [...row.children];
    if (!cols.length) return [[...row.childNodes]];
    return cols.map((col) => (col.childNodes.length ? [...col.childNodes] : ''));
  });

  const block = WebImporter.Blocks.createBlock(document, { name: header, cells });
  element.replaceWith(block);
}
