const Media = require("../model/Media");
const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const mediaLogger = require("../utils/mediaLogger");

const uploadMedia = async (req, res) => {
  mediaLogger.info("Media Upload Endpoint Reached.....");
  try {
    const file = req.file;
    if (!file) {
      mediaLogger.warn("file not found");
      return res.status(404).json({
        success: false,
        message: "File not Found",
      });
    }

    const uploadFile = await uploadMediaToCloudinary(file);

    if (!uploadFile) {
      mediaLogger.warn("file upload failed");
      return res.status(401).json({
        success: false,
        message: "File Upload Failed",
      });
    }

    const newMedia = new Media({
      user: req.userInfo.userId,
      originalname: file.originalname,
      publicId: uploadFile.public_id,
      secureUrl: uploadFile.secure_url,
      resourceType: uploadFile.resource_type,
      mimeType: file.mimetype,
    });

    await newMedia.save();

    return res.status(201).json({
      success: true,
      message: "Media Uploaded Successfully",
      mediaData: newMedia,
    });
  } catch (error) {
    mediaLogger.error("Internal Error Occured While Adding Media", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error Occured",
    });
  }
};

const getMedias = async (req, res) => {
  try {
    const medias = await Media.find({});

    if (!medias) {
      mediaLogger.error("Error Occured While Getting Media", error);
      return res.status(500).json({
        success: false,
        message: "Could not get media at this time",
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Medias Gotten Successfully',
      data: medias
    })

  } catch (error) {
    mediaLogger.error("Internal Error Occured While Getting Media", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error Occured",
    });
  }
};

const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Locate asset records inside DB 
    const targetMedia = await Media.findById(id);
    
    if (!targetMedia) {
      return res.status(404).json({
        success: false,
        message: 'Media asset record not found in database.'
      });
    }

    // 2. Remove file from Cloudinary CDN Storage
    try {
      await cloudinary.uploader.destroy(targetMedia.publicId, {
        resource_type: targetMedia.resourceType || 'image'
      });
    } catch (cloudinaryError) {
      // Log the warning but keep moving—don't let an orphan Cloudinary asset block database consistency
      mediaLogger.warn(`Cloudinary destruction skipped or failed for publicId: ${targetMedia.publicId}`, cloudinaryError);
    }

    // 3. Drop the document row out of MongoDB
    await Media.findByIdAndDelete(id);

    mediaLogger.info(`Admin executed hard delete on media item id: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Media asset was successfully scrubbed from storage and database tables.'
    });

  } catch (error) {
    mediaLogger.error('Internal server error occurred within deleteMediaController:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred while trying to drop the requested media file.'
    });
  }
};


module.exports = {
  uploadMedia,
  getMedias,
  deleteMedia
};
