import jsdom from 'jsdom';
import ExlClient from '../modules/ExlClient.js';
import { formatHtml } from '../modules/utils/prettier-utils.js';

const exlClient = new ExlClient({
  domain: 'https://experienceleague.adobe.com',
});

export default async function renderToc(path) {
  const tocID = path.substring(path.lastIndexOf('/') + 1);
  // console.log(tocID);
  const res = await exlClient.getTOC(tocID);
  if (res.length > 0) {
    const tocData = new jsdom.JSDOM(res);
    const tocHtmlString = tocData.serialize(); 
    let body;
    body = `
<!doctype html>
<html>
  <head></head>
  <body>
    <header></header>
    <main><div>
    ${tocHtmlString}
    </div></main>
    <footer></footer>
  </body>
</html>`;
    body = await formatHtml(body);
    return {
      body,
      headers: {
        'Content-Type': 'text/html',
      },
    };
  }
  return {
    error: new Error(`No Path found for: ${path}`),
  };
}
