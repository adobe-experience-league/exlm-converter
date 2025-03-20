import container from 'markdown-it-container';

export default function landingCardContainerPlugin(md) {
  md.use(container, 'landing-card-container', {
    validate(params) {
      return params.trim().match(/^landing-card-container\s*(.*)$/);
    },
    render(tokens, idx) {
      const match = tokens[idx].info
        .trim()
        .match(/^landing-card-container\s*(.*)$/);
      if (tokens[idx].nesting === 1) {
        let html = '<div class="landing-card-container">\n';
        html += '<div class="landing-card-content">\n';
        if (match && match[1]) {
          html += `<div class="landing-card-title">${md.utils.escapeHtml(
            match[1],
          )}</div>\n`;
        }
        return html;
      }
      return '</div>\n</div>\n';
    },
  });
}
