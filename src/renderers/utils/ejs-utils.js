/**
 * @typedef {Object} NavItem
 * @property {string} title
 * @property {string | undefined} url
 * @property {string | undefined} subtitle
 * @property {NavItem[] | undefined} items
 */

const urlWithOptions = (url, options) => {
  try {
    const defaultBase = 'https://invalid.adobe.com';
    const u = new URL(url, defaultBase);
    if (options) {
      u.hash = `${url.hash || ''}${JSON.stringify(options)}`;
      console.log('url with options', u.toString());
    }
    if (u.origin === defaultBase) {
      // the url is relative, remove base
      return u.toString().replace(defaultBase, '');
    }
    return u.toString();
  } catch (e) {
    console.log('error parsing url', e);
    return url;
  }
};

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
      const url = urlWithOptions(item.url, item.urlOptions);
      // item has a url, render as <a>
      html += `<a href="${url}">${item.title}</a>`;
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

    // secondary items (like browse all)
    if (item.secondaryItems) {
      html += nav(item.secondaryItems);
    }

    html += '</li>';
  });

  html += '</ul>';
  return html;
};

const cell = (content) =>
  `<div>${content.join ? content.join('') : content}</div>`;

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
