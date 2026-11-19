export const LANDING_IDS = {
  LISTS_DOCUMENTATION: 'lists-documentation',
  TILES_TUTORIALS: 'tiles-tutorials',
  LISTS_RESOURCES: 'lists-resources',
  LISTS_RELEASE: 'lists-release',
};

export const dedupeAnchors = (mdString, anchorNames) => {
  if (!mdString || !anchorNames || !anchorNames.length) return '';
  let resultMd = mdString;
  anchorNames.forEach((anchor) => {
    const anchorRegex = new RegExp(`#${anchor}`, 'g');
    let idx = 0;
    resultMd = resultMd.replace(anchorRegex, (match) => {
      idx += 1;
      return `${match}-${idx}`;
    });
  });
  return resultMd;
};
