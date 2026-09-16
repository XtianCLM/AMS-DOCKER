import multer from "multer";

export const uploadDbf = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (_req, file, cb) => {
    if (
      !file.originalname
        .toLowerCase()
        .endsWith(".dbf")
    ) {
      return cb(
        new Error("Only DBF files are allowed.")
      );
    }

    cb(null, true);
  },
});