import * as prettier from 'prettier/standalone';
import prettierPluginHtml from 'prettier/plugins/html';

export async function formatHtml(html) {
  return prettier.format(html, {
    parser: 'html',
    plugins: [prettierPluginHtml],
  });
}
