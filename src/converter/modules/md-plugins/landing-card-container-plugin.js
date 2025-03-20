import container from 'markdown-it-container';

export default function landingCardContainerPlugin(md) {
  md.use(container, 'landing-card-container', {
    validate(params) {
      return params.trim().match(/^landing-card-container\s*(.*)$/);
    },
    render(tokens, idx) {
      if (tokens[idx].nesting === 1) {
        let html = '<div class="landing-card-container">\n';
        html += '<div>\n';
        return html;
      }
      return '</div>\n</div>\n';
    },
  });
}
