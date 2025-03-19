export default function landingCardAdmonitionPlugin(md) {
  md.block.ruler.before(
    'blockquote',
    'admonition',
    (state, startLine, endLine, silent) => {
      const start = state.bMarks[startLine] + state.tShift[startLine];
      const max = state.eMarks[startLine];
      const unicodeGreaterThan = 0x3e; // '>' character

      if (state.src.charCodeAt(start) !== unicodeGreaterThan) {
        return false;
      }

      const firstLine = state.src.slice(start, max).trim();
      if (!firstLine.match(/^>\[!LANDINGCARD\]$/)) {
        return false;
      }

      if (silent) {
        return true;
      }

      let nextLine = startLine + 1;
      const properties = {};

      while (nextLine < endLine) {
        const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
        const lineMax = state.eMarks[nextLine];
        const line = state.src.slice(lineStart, lineMax);

        if (line.charCodeAt(0) !== unicodeGreaterThan) {
          break;
        }

        const propLine = line.slice(1).trim();
        const imageMatch = propLine.match(/^image=!\[(.*?)\]\((.*?)\)$/);
        const regularMatch = propLine.match(/^(\w+)="(.*)"$/);

        if (imageMatch) {
          const [, alt, url] = imageMatch;
          properties.headerImage = url;
          properties.alt = alt;
        } else if (regularMatch) {
          const [, key, value] = regularMatch;
          properties[key] = value;
        }

        nextLine += 1;
      }

      let html = `\n\n<div class="landing-card-container">\n`;
      html += '<div class="landing-card-content">\n';

      if (properties.title) {
        html += `<div class="landing-card-title">${md.utils.escapeHtml(
          properties.title,
        )}</div>\n`;
      }

      if (properties.headerImage) {
        html += '<div class="landing-card-header-image">\n';
        html += `<img src="${md.utils.escapeHtml(
          properties.headerImage,
        )}" alt="${md.utils.escapeHtml(properties.alt || '')}">\n`;
        html += '</div>\n';
      }

      if (properties.abstract) {
        html += '<div class="landing-card-description">\n';
        html += `${properties.abstract}\n`;
        html += '</div>\n';
      }

      html += '</div>\n</div>\n\n';

      const token = state.push('html_block', '', 0);
      token.content = html;
      token.map = [startLine, nextLine];

      state.line = nextLine;
      return true;
    },
  );
}
