const {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential
} = require('@azure/storage-blob');
const env = require('./env');

// Create BlobServiceClient using connection string directly
const blobServiceClient = BlobServiceClient.fromConnectionString(env.azureStorage.connectionString);

// Get container client
const containerClient = blobServiceClient.getContainerClient(env.azureStorage.containerName);

async function uploadImage(buffer, filename, mimeType = 'image/jpeg') {
  const blobName = `${Date.now()}-${filename}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    const uploadResponse = await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: { blobContentType: mimeType },
      metadata: {
        originalName: filename,
        uploadTime: new Date().toISOString(),
        originalMimeType: mimeType
      }
    });

    return {
      url: blockBlobClient.url,
      blobName: blobName,
      etag: uploadResponse.etag,
      lastModified: uploadResponse.lastModified,
      contentLength: uploadResponse.contentLength
    };
  } catch (error) {
    console.error('Azure Blob upload error:', error);
    throw new Error(`Failed to upload image to Azure Blob: ${error.message}`);
  }
}

async function deleteImage(blobName) {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();
    return true;
  } catch (error) {
    console.error('Azure Blob delete error:', error);
    throw new Error(`Failed to delete image from Azure Blob: ${error.message}`);
  }
}

async function getImageProperties(blobName) {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const properties = await blockBlobClient.getProperties();
    return properties;
  } catch (error) {
    console.error('Azure Blob get properties error:', error);
    throw new Error(`Failed to get image properties from Azure Blob: ${error.message}`);
  }
}

function generateImageUrl(publicId) {
  const credential = new StorageSharedKeyCredential(
    env.azureStorage.accountName,
    env.azureStorage.accountKey
  );

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: env.azureStorage.containerName,
      blobName: publicId,
      permissions: BlobSASPermissions.parse('r'),
      startsOn: new Date(),
      expiresOn: new Date(Date.now() + 60 * 60 * 1000)
    },
    credential
  ).toString();

  return `https://${env.azureStorage.accountName}.blob.core.windows.net/${env.azureStorage.containerName}/${encodeURIComponent(publicId)}?${sasToken}`;
}

module.exports = {
  blobServiceClient,
  containerClient,
  uploadImage,
  deleteImage,
  getImageProperties,
  generateImageUrl
};
