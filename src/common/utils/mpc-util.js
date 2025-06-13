import Logger from '@adobe/aio-lib-core-logging';

const aioLogger = Logger('mpc-util');

const MPC_ORIGIN = 'https://video.tv.adobe.com';

/** @typedef {object} MPCVideo
 * @property {string} viewBucketID
 * @property {number} humanID
 * @property {string} title
 * @property {string} description
 * @property {number} volume
 * @property {boolean} autoplay
 * @property {boolean} endscreen
 * @property {boolean} hidetitle
 * @property {boolean} screenskin
 * @property {boolean} chrome
 * @property {string} end
 * @property {string} asseturl
 * @property {string} skins
 * @property {string} swf
 * @property {string} host
 * @property {object} i18n
 * @property {string} i18n.play
 * @property {number} indexOfActiveVideo
 * @property {string} playBtn
 * @property {boolean} showadobebug
 * @property {string} adobebugposition
 * @property {string} environment
 * @property {boolean} enableSC
 * @property {null} simuliveStartDateTime
 * @property {string} simulivePosterURL
 * @property {number} simuliveOffset
 * @property {object} video
 * @property {string} video.poster
 * @property {string} video.allowairplay
 * @property {string} video.preload
 * @property {} video.markers
 * @property {number} video.height
 * @property {number} video.width
 * @property {string} video.product
 * @property {string} video.language
 * @property {string} video.creatorFirstName
 * @property {string} video.creatorLastName
 * @property {object} analytics
 * @property {boolean} analytics.active
 * @property {string} analytics.endpoint
 * @property {string} analytics.scTarget
 * @property {object} tracking
 * @property {string} tracking.analyticsKey
 * @property {string} tracking.trackId
 * @property {string} tracking.trackingServer
 * @property {string} tracking.trackingSecureServer
 * @property {string} tracking.movieId
 * @property {object[]} sources
 * @property {string} sources.label
 * @property {number} sources.labelid
 * @property {number} sources.width
 * @property {number} sources.height
 * @property {number} sources.bitrate
 * @property {string} sources.format
 * @property {number} sources.duration
 * @property {boolean} sources.hd
 * @property {boolean} sources.active
 * @property {string} sources.fileID
 * @property {string} sources.videoID
 * @property {string} sources.presetID
 * @property {string} sources.fileType
 * @property {number} sources.kilobytes
 * @property {string} sources.bucket
 * @property {string} sources.src
 * @property {string} sources.fsrc
 * @property {string} sources.storedFilePath
 * @property {null} audio
 * @property {} translations
 */

/**
 * @param {string} url mpc video url
 * @returns {boolean} true if the url is a valid MPC video url matching https://video.tv.adobe.com/v/{videoId}
 */
export function isMpcVideoUrl(url) {
  try {
    const urlObj = new URL(url);
    const hasMpcOrigin = urlObj.origin === MPC_ORIGIN;
    const hasV = urlObj.pathname.startsWith('/v/');
    const has2PartsOrMore = urlObj.pathname.split('/').length >= 2;
    return hasMpcOrigin && hasV && has2PartsOrMore;
  } catch (e) {
    aioLogger.error('Error parsing MPC URL, skipping', e);
    return false;
  }
}

// /**
//  * Extracts the video id from an MPC video url
//  * @param {string} url mpc video url
//  * @returns {string|undefined} the video id if the url is a valid MPC video url, undefined otherwise
//  */
// function getVideoIdFromMpcUrl(url) {
//   try {
//     if (!isMpcVideoUrl(url)) {
//       return undefined;
//     }
//     const urlObj = new URL(url);
//     const path = urlObj.pathname;
//     const [, videoId] = path.split('/');
//     return videoId;
//   } catch (e) {
//     console.log('Error parsing MPC URL, skipping', e);
//     return undefined;
//   }
// }
