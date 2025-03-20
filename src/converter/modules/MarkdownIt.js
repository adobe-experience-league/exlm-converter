import markdownit from 'markdown-it';
import attrs from 'markdown-it-attrs';
import anchor from 'markdown-it-anchor';
import abbr from 'markdown-it-abbr';
import collapsible from 'markdown-it-collapsible';
import container from 'markdown-it-container';
import deflist from 'markdown-it-deflist';
import footnote from 'markdown-it-footnote';
import ins from 'markdown-it-ins';
import mark from 'markdown-it-mark';
import sub from 'markdown-it-sub';
import sup from 'markdown-it-sup';
import landingCardContainerPlugin from './md-plugins/landing-card-container-plugin.js';

export default function markdownItToHtml(mdString) {
  return markdownit({
    html: true,
    breaks: true,
    typographer: true,
  })
    .use(abbr)
    .use(attrs, {
      allowedAttributes: ['id', 'class', 'style', 'target'],
    })
    .use(anchor, { level: [1, 2, 3, 4, 5, 6], slugify: () => '' })
    .use(collapsible)
    .use(container, 'warning')
    .use(deflist)
    .use(footnote)
    .use(ins)
    .use(mark)
    .use(sub)
    .use(sup)
    .use(landingCardContainerPlugin)
    .render(mdString);
}
