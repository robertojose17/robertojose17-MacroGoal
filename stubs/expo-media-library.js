// Stub for expo-media-library — native module not linked in preview build
const noopAsync = () => Promise.resolve();

module.exports = {
  default: {},
  requestPermissionsAsync: () => Promise.resolve({ granted: false, status: 'denied' }),
  getPermissionsAsync: () => Promise.resolve({ granted: false, status: 'denied' }),
  requestMediaLibraryPermissionsAsync: () => Promise.resolve({ granted: false, status: 'denied' }),
  getMediaLibraryPermissionsAsync: () => Promise.resolve({ granted: false, status: 'denied' }),
  saveToLibraryAsync: noopAsync,
  createAssetAsync: () => Promise.resolve(null),
  getAssetsAsync: () => Promise.resolve({ assets: [], endCursor: '', hasNextPage: false, totalCount: 0 }),
  getAssetInfoAsync: () => Promise.resolve(null),
  deleteAssetsAsync: noopAsync,
  createAlbumAsync: () => Promise.resolve(null),
  getAlbumsAsync: () => Promise.resolve([]),
  getAlbumAsync: () => Promise.resolve(null),
  addAssetsToAlbumAsync: noopAsync,
  removeAssetsFromAlbumAsync: noopAsync,
  MediaType: { photo: 'photo', video: 'video', audio: 'audio', unknown: 'unknown' },
  SortBy: { default: 'default', creationTime: 'creationTime', modificationTime: 'modificationTime', mediaType: 'mediaType', width: 'width', height: 'height', duration: 'duration' },
  PermissionStatus: { UNDETERMINED: 'undetermined', GRANTED: 'granted', DENIED: 'denied' },
};
