// import fs from "fs";
// import path from "path";
// import multer from "multer";

// const uploadDirectory = path.join(
//   process.cwd(),
//   "uploads",
//   "agent-profile"
// );

// fs.mkdirSync(uploadDirectory, {
//   recursive: true,
// });

// const storage = multer.diskStorage({
//   destination: (
//     _req,
//     _file,
//     callback
//   ) => {
//     callback(
//       null,
//       uploadDirectory
//     );
//   },

//   filename: (
//     _req,
//     file,
//     callback
//   ) => {
//     const extension =
//       path.extname(
//         file.originalname
//       ) || ".jpg";

//     const filename =
//       `agent-${Date.now()}${extension}`;

//     callback(
//       null,
//       filename
//     );
//   },
// });

// export const uploadAgentProfile =
//   multer({
//     storage,

//     limits: {
//       fileSize:
//         5 * 1024 * 1024,
//     },

//     fileFilter: (
//       _req,
//       file,
//       callback
//     ) => {
//       if (
//         !file.mimetype.startsWith(
//           "image/"
//         )
//       ) {
//         callback(
//           new Error(
//             "Only image files are allowed."
//           )
//         );

//         return;
//       }

//       callback(null, true);
//     },
//   });



import fs from "fs";
import path from "path";
import multer from "multer";

const agentProfileDirectory =
  path.join(
    process.cwd(),
    "uploads",
    "agent-profile"
  );

const governmentIdDirectory =
  path.join(
    process.cwd(),
    "uploads",
    "government-id"
  );

fs.mkdirSync(
  agentProfileDirectory,
  {
    recursive: true,
  }
);

fs.mkdirSync(
  governmentIdDirectory,
  {
    recursive: true,
  }
);

const storage =
  multer.diskStorage({
    destination: (
      _req,
      file,
      callback
    ) => {
      if (
        file.fieldname ===
        "profilePhoto"
      ) {
        callback(
          null,
          agentProfileDirectory
        );

        return;
      }

      if (
        file.fieldname ===
        "governmentId"
      ) {
        callback(
          null,
          governmentIdDirectory
        );

        return;
      }

      callback(
        new Error(
          "Invalid upload field."
        ),
        ""
      );
    },

    filename: (
      _req,
      file,
      callback
    ) => {
      const extension =
        path.extname(
          file.originalname
        ) || ".jpg";

      let prefix =
        "agent";

      if (
        file.fieldname ===
        "profilePhoto"
      ) {
        prefix =
          "profile";
      }

      if (
        file.fieldname ===
        "governmentId"
      ) {
        prefix =
          "government-id";
      }

      const filename =
        `${prefix}-${Date.now()}-${Math.round(
          Math.random() * 1e9
        )}${extension}`;

      callback(
        null,
        filename
      );
    },
  });


export const uploadAgentProfile =
  multer({
    storage,

    limits: {
      fileSize:
        5 *
        1024 *
        1024,
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
            "Only JPG, PNG, and WEBP image files are allowed."
          )
        );

        return;
      }

      callback(
        null,
        true
      );
    },
  });