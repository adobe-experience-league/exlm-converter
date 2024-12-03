import fetch from 'node-fetch';
import Logger from '@adobe/aio-lib-core-logging';
import {
  writeStringToFileAndGetPresignedURL,
  readFile,
  exists,
} from '../../../common/utils/file-utils.js';
import { getMatchLanguageForTag } from '../../../common/utils/language-utils.js';

const aioLogger = Logger('FranklinServletClient');

class FranklinServletClient {
  constructor({
    aemAuthorUrl,
    aemOwner,
    aemRepo,
    aemBranch,
    authorization,
    sourceLocation,
  }) {
    this.aemAuthorUrl = aemAuthorUrl;
    this.aemOwner = aemOwner;
    this.aemRepo = aemRepo;
    this.aemBranch = aemBranch;
    this.authorization = authorization;
    this.sourceLocation = sourceLocation;
  }

  // Fetch data from AEM servlet
  async fetchFromServlet(taxonomyPath) {
    const aemURL = `${this.aemAuthorUrl}/bin/franklin.delivery/${this.aemOwner}/${this.aemRepo}/${this.aemBranch}/${taxonomyPath}.json?wcmmode=disabled`;
    const url = new URL(aemURL);

    const fetchHeaders = { 'cache-control': 'no-cache' };
    if (this.authorization) {
      fetchHeaders.authorization = this.authorization;
    }

    if (this.sourceLocation) {
      fetchHeaders['x-content-source-location'] = this.sourceLocation;
    }

    try {
      aioLogger.info(`Fetching from AEM: ${url}`);
      const resp = await fetch(url, { headers: fetchHeaders });

      if (!resp.ok) {
        aioLogger.error(`Failed to fetch: ${url}, Status: ${resp.status}`);
        throw new Error(`Failed to fetch: ${resp.status}`);
      }

      const body = await resp.text();

      return { body };
    } catch (error) {
      aioLogger.error('Error fetching AEM content:', error);
      throw error;
    }
  }

  async fetchAndCache(pagePath, taxonomyPath) {
    try {
      if (!taxonomyPath) {
        throw new Error('Taxonomy path is required.');
      }

      const filePath = `/${taxonomyPath}.json`;
      let cachedData;

      // Check if file exists
      if (await exists(filePath)) {
        aioLogger.debug(`Using cached data from file: ${filePath}`);
        const fileContent = await readFile(filePath);
        try {
          cachedData = JSON.parse(fileContent);
        } catch (error) {
          aioLogger.error(
            `Error parsing cached data from file ${filePath}:`,
            error,
          );
        }
      }

      // Fetch from AEM if no valid cached data
      if (!cachedData) {
        aioLogger.debug(`Fetching data for ${taxonomyPath} from AEM.`);

        const data = await this.fetchFromServlet(taxonomyPath);
        if (data?.body) {
          cachedData = JSON.parse(data.body);
        } else {
          aioLogger.error(
            `Unexpected response format for ${taxonomyPath}:`,
            data,
          );
          cachedData = {};
        }

        if (Object.keys(cachedData).length) {
          aioLogger.debug(`Fetched data, caching to file.`);
          await writeStringToFileAndGetPresignedURL({
            filePath,
            str: JSON.stringify(cachedData),
          });
        }
      }

      // Extract language-specific data
      const lang = pagePath.split('/')[1];
      const language = lang ? getMatchLanguageForTag(lang) : 'default';
      const result = cachedData?.[language]?.data || [];

      return result;
    } catch (error) {
      aioLogger.error('Error in fetchAndCache:', error);
      throw error;
    }
  }
}

export default FranklinServletClient;
