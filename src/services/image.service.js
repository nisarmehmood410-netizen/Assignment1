const sharp = require('sharp');
const { uploadImage: uploadToAzure, deleteImage: deleteFromAzure } = require('../config/azure-storage');

// Helper function to detect MIME type from buffer
function getMimeType(buffer) {
  // Check file signature to determine MIME type
  const signatures = [
    { type: 'image/jpeg', signature: [0xFF, 0xD8, 0xFF] },
    { type: 'image/png', signature: [0x89, 0x50, 0x4E, 0x47] },
    { type: 'image/gif', signature: [0x47, 0x49, 0x46, 0x38] },
    { type: 'image/webp', signature: [0x52, 0x49, 0x46, 0x46] }
  ];

  for (const { type, signature } of signatures) {
    let match = true;
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        match = false;
        break;
      }
    }
    if (match) {return type;}
  }

  // Default to JPEG if no signature matches
  return 'image/jpeg';
}

async function optimizeImage(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
}

async function uploadImage(buffer, filename) {
  // Detect original MIME type
  const originalMimeType = getMimeType(buffer);
  const optimizedBuffer = await optimizeImage(buffer);

  // Generate a unique filename if not provided
  const uniqueFilename = filename || `image-${Date.now()}.jpg`;

  try {
    const result = await uploadToAzure(optimizedBuffer, uniqueFilename, 'image/jpeg');

    // Return the same structure as Cloudinary for compatibility
    return {
      url: result.url,
      public_id: result.blobName, // Keep same field name for compatibility
      etag: result.etag,
      lastModified: result.lastModified,
      contentLength: result.contentLength,
      resource_type: 'image',
      format: 'jpeg',
      original_format: originalMimeType.split('/')[1] // Store original format
    };
  } catch (error) {
    console.error('Azure Blob upload error:', error);
    throw error;
  }
}

async function deleteImage(blobName) {
  try {
    await deleteFromAzure(blobName);
    return { success: true, deleted: blobName };
  } catch (error) {
    console.error('Azure Blob delete error:', error);
    throw error;
  }
}

module.exports = {
  uploadImage,
  deleteImage
};
