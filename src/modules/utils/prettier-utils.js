import * as prettier from 'prettier/standalone';
import htmlPlugin from 'prettier/plugins/html';

export async function formatHtml(html) {
  return prettier.format(html, {
    parser: 'html',
    bracketSameLine: true,
    printWidth: 150,
    plugins: [htmlPlugin],
  });
}
