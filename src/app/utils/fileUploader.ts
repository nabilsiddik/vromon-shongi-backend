import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { envVars } from "../config/env.config.js";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

const upload = multer({ storage: storage });

const uploadToCloudinary = async (file: Express.Multer.File) => {
  const isCloudinaryConfigured =
    Boolean(envVars.CLOUDINARY.CLOUDINARY_CLOUD_NAME) &&
    envVars.CLOUDINARY.CLOUDINARY_CLOUD_NAME !== "your_cloudinary_cloud_name" &&
    Boolean(envVars.CLOUDINARY.CLOUDINARY_API_KEY) &&
    envVars.CLOUDINARY.CLOUDINARY_API_KEY !== "your_cloudinary_api_key" &&
    Boolean(envVars.CLOUDINARY.CLOUDINARY_API_SECRET) &&
    envVars.CLOUDINARY.CLOUDINARY_API_SECRET !== "your_cloudinary_api_secret";

  if (!isCloudinaryConfigured) {
    try {
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (cleanupErr) {
      console.error("Error deleting local upload file:", cleanupErr);
    }
    return undefined;
  }

  try {
    cloudinary.config({
      cloud_name: envVars.CLOUDINARY.CLOUDINARY_CLOUD_NAME,
      api_key: envVars.CLOUDINARY.CLOUDINARY_API_KEY,
      api_secret: envVars.CLOUDINARY.CLOUDINARY_API_SECRET,
    });

    const uploadResult = await cloudinary.uploader.upload(file.path, {
      public_id: `${file.filename}-${Date.now()}`,
    });

    return uploadResult;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    return undefined;
  } finally {
    try {
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (cleanupErr) {
      console.error("Error unlinking temp file:", cleanupErr);
    }
  }
};

export const fileUploader = {
  upload,
  uploadToCloudinary,
};

