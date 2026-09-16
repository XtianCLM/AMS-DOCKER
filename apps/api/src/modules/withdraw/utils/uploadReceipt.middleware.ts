import fs from "fs";
import path from "path";
import multer from "multer";

const receiptUploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "withdrawal-receipts"
);

fs.mkdirSync(receiptUploadDirectory, {
  recursive: true,
});

const receiptStorage = multer.diskStorage({
  destination: (
    _req,
    _file,
    callback
  ) => {
    callback(
      null,
      receiptUploadDirectory
    );
  },

  filename: (
    req,
    file,
    callback
  ) => {
    const extension =
      path.extname(
        file.originalname
      ).toLowerCase() || ".jpg";

    const withdrawalId =
      req.body.withdrawalId ||
      req.params.withdrawalId ||
      "unknown";

    const filename =
      `receipt-${withdrawalId}-${Date.now()}${extension}`;

    callback(
      null,
      filename
    );
  },
});

export const uploadWithdrawalReceipt =
  multer({
    storage: receiptStorage,

    limits: {
      fileSize:
        5 * 1024 * 1024,
    },

    fileFilter: (
      _req,
      file,
      callback
    ) => {
      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (
        !allowedMimeTypes.includes(
          file.mimetype
        )
      ) {
        callback(
          new Error(
            "Only JPG, PNG, and WEBP receipt images are allowed."
          )
        );

        return;
      }

      callback(null, true);
    },
  });