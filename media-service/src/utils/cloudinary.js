const mediaLogger = require('./mediaLogger');

const cloudinary = require('cloudinary').v2

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET_KEY
});

const uploadMediaToCloudinary = (file) => {
  const byteArrayBuffer = file.buffer;
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ resource_type: 'auto' }, (error, uploadResult) => {
      if (error) {
        mediaLogger.info(`File Uploaded Successfully to Cloudinary - ${uploadResult}`);
        return reject(error);
      }
      mediaLogger.info('File Uploaded to Cloudinary Successfully', error)
      return resolve(uploadResult);
    }).end(byteArrayBuffer);
  })
}


module.exports = {
  uploadMediaToCloudinary,
  cloudinary
}
