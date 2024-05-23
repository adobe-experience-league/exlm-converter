/**
 * Formats aem tagpicker data
 */
export function formatArticlePageMetaTags(inputString) {
  return inputString
    .replace(/exl:[^/]*\/*/g, '')
    .split(',')
    .map((part) => part.trim());
}

/**
 * Decodes base64 strings
 */
export function decodeBase64(encodedString) {
  return Buffer.from(encodedString, 'base64').toString('utf-8');
}

/**
 * Retrieves the content of metadata tags.
 */
export function getMetadata(document, name) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  const meta = [...document.head.querySelectorAll(`meta[${attr}="${name}"]`)]
    .map((m) => m.content)
    .join(', ');
  return meta || '';
}

/**
 * Sets the content of metadata tags.
 */
export function setMetadata(document, name, content) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  const existingMetaTags = [
    ...document.head.querySelectorAll(`meta[${attr}="${name}"]`),
  ];

  if (existingMetaTags.length === 0) {
    // Create a new meta tag if it doesn't exist
    const newMetaTag = document.createElement('meta');
    newMetaTag.setAttribute(attr, name);
    newMetaTag.content = content;
    document.head.appendChild(newMetaTag);
  } else {
    // Update existing meta tags
    existingMetaTags.forEach((metaTag) => {
      metaTag.content = content;
    });
  }
}
