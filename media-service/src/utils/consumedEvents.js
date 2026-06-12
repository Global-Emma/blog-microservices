const Media = require("../model/Media");
const { cloudinary } = require("./cloudinary");
const mediaLogger = require("./mediaLogger");

const consumedEventHandler = async (eventPayload) => {
  try {
    const { media } = eventPayload;

    if (!media || media.length === 0) {
      mediaLogger.info("Deleted post had no associated media assets. Skipping purge.");
      return;
    }

    // 1. Extract the CORRECT target identifiers from the payload array
    const mediaIdsToPurge = media.map((item) => item.mediaId);
    const cloudinaryPublicIds = media.map((item) => item.publicId);

    console.log("Targeting Media IDs for local DB purge:", mediaIdsToPurge);
    console.log("Targeting Cloudinary Public IDs for CDN purge:", cloudinaryPublicIds);

    // 2. Locate the records using the correct property mapping (_id matches mediaId)
    const matchingDocs = await Media.find({ _id: { $in: mediaIdsToPurge } });
    console.log("Database documents found to delete:", matchingDocs);

    if (matchingDocs.length === 0) {
      mediaLogger.warn("No matching database records found for the mapped mediaIds.");
      // Edge-case recovery: If DB records are gone, still attempt to clear Cloudinary if IDs exist
    }

    // 3. Trigger Cloudinary Purge Loops
    for (const publicId of cloudinaryPublicIds) {
      if (publicId) {
        try {
          // Replace with your actual Cloudinary SDK configuration trigger
          await cloudinary.uploader.destroy(publicId);
          mediaLogger.info(`Successfully purged asset ${publicId} from Cloudinary CDN`);
        } catch (cloudinaryErr) {
          mediaLogger.error(`Failed to drop asset ${publicId} from Cloudinary buckets`, cloudinaryErr);
        }
      }
    }

    // 4. Clean up the local Media Service Database records
    const dbDeletionResult = await Media.deleteMany({ _id: { $in: mediaIdsToPurge } });
    
    mediaLogger.info(`Purge Cycle Complete. Deleted ${dbDeletionResult.deletedCount} records from Media DB.`);

  } catch (error) {
    mediaLogger.error("Critical failure during media pipeline execution chain:", error);
  }
};

module.exports = { consumedEventHandler };