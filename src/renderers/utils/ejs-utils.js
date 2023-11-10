/**
 * @typedef {Object} NavItem
 * @property {string} title
 * @property {string | undefined} url
 * @property {string | undefined} subtitle
 * @property {NavItem[] | undefined} items
 */

/**
 * render nav items to HTML as <ul>
 * @param {NavItem[]} navItems
 * @returns
 */
const nav = (navItems) => {
  let html = '<ul>';
  navItems?.forEach((item) => {
    html += '<li>';
    if (item.url) {
      // item has a url, render as <a>
      html += `<a href="${item.url}">${item.title}</a>`;
    } else {
      // item has no url, render as <p>
      html += `<p>${item.title}</p>`;
    }

    // a subtitle is present, add to the end
    if (item.subtitle) {
      html += `<p>${item.subtitle}</p>`;
    }

    // render sub items
    if (item.items) {
      html += nav(item.items);
    }
    html += '</li>';
  });

  html += '</ul>';
  return html;
};

const cell = (content) => `<div>${content}</div>`;

const row = (cells) => `<div>${cells.map((c) => cell(c)).join('')}</div>`;

const block = (clazz, rows) => `<div class="${clazz}">
  ${rows.map((r) => row(r)).join('\n')}
  </div>`;

/**
 * render HTML <ul> and <li> from array of strings
 * @param {string[]} items
 * @returns
 */
const ul = (items) =>
  `<ul>${items.map((i) => `<li>${i}</li>`).join('\n')}</ul>`;

export default {
  nav,
  block,
  ul,
};
