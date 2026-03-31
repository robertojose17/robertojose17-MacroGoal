
/**
 * Convert image URI to blob for upload
 * @param uri - The local URI of the image
 * @returns A Blob object
 */
export async function uriToBlob(uri: string): Promise<Blob> {
  try {
    console.log('[ImageUtils] Converting URI to blob:', uri);
    
    const response = await fetch(uri);
    const blob = await response.blob();
    
    console.log('[ImageUtils] ✅ Blob created, size:', blob.size, 'bytes, type:', blob.type);
    
    return blob;
  } catch (error) {
    console.error('[ImageUtils] ❌ Error converting URI to blob:', error);
    throw error;
  }
}
