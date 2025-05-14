import container from 'markdown-it-container';

export default function landingCardsContainerPlugin(md) {
  md.use(container, 'landing-cards-container', {
    validate(params) {
      return params.trim().match(/^landing-cards-container\s*(.*)$/);
    },
    render(tokens, idx) {
      if (tokens[idx].nesting === 1) {
        let html = '<div class="landing-cards-container">\n';
        html += '<div>\n';
        return html;
      }
      return '</div>\n</div>\n';
    },
  });
}
