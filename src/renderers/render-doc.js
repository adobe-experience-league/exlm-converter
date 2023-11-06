import ExlClient from '../modules/ExlClient.js';
import md2html from '../modules/ExlMd2Html.js';
import { removeExtension } from '../modules/utils/path-utils.js';

const exlClient = new ExlClient({
  domain: 'https://experienceleague.adobe.com',
});
/**
 * handles a markdown doc path
 */
export default async function renderDoc(path) {
  const response = await exlClient.getArticleByPath(removeExtension(path));
  if (response.data.length > 0) {
    const md = response.data[0].FullBody;
    const meta = response.data[0].FullMeta;
    const data = response.data[0];
    const { convertedHtml, originalHtml } = await md2html(md, meta, data);
    return {
      body: convertedHtml,
      headers: {
        'Content-Type': 'text/html',
      },
      md,
      original: originalHtml,
    };
  }
  return {
    error: new Error(`No Page found for: ${path}`),
  };
}
