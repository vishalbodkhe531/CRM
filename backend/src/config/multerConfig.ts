import fs from "fs";
import multer from "multer";
import path from "path";
import { AppError } from "../utils/errors/appError";

const MB = 1024 * 1024;
const MAX_UPLOAD_SIZE = 5 * MB;

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const SPREADSHEET_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
]);

const SPREADSHEET_EXTENSIONS = new Set([".xlsx", ".xls", ".csv"]);

const ensureDirectory = (directory: string) => {
  fs.mkdirSync(directory, { recursive: true });
};

const createUniqueSuffix = () =>
  `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

const sanitizeFilenamePart = (value: string) =>
  value.replace(/[^a-zA-Z0-9-]/g, "");

const imageFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (IMAGE_MIME_TYPES.has(file.mimetype) && IMAGE_EXTENSIONS.has(extension)) {
    cb(null, true);
    return;
  }

  cb(
    AppError.validation.badRequest(
      "Only image files are allowed (jpg, jpeg, png, webp)",
    ),
  );
};

const spreadsheetFileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  cb,
) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (
    SPREADSHEET_MIME_TYPES.has(file.mimetype) &&
    SPREADSHEET_EXTENSIONS.has(extension)
  ) {
    cb(null, true);
    return;
  }

  cb(
    AppError.validation.badRequest("Only xlsx, xls, or csv files are allowed"),
  );
};

const createDiskStorage = (options: {
  defaultDirectory?: string;
  fieldDirectories?: Record<string, string>;
  filenamePrefix?: string;
}) =>
  multer.diskStorage({
    destination: (_req, file, cb) => {
      const destination =
        options.fieldDirectories?.[file.fieldname] ?? options.defaultDirectory;

      if (!destination) {
        cb(AppError.validation.badRequest("Invalid upload field"), "");
        return;
      }

      ensureDirectory(destination);
      cb(null, destination);
    },
    filename: (_req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const fieldPrefix = sanitizeFilenamePart(file.fieldname);
      const prefix = options.filenamePrefix ?? (fieldPrefix || "file");

      cb(null, `${prefix}-${createUniqueSuffix()}${extension}`);
    },
  });

export const organizationAssetFolders = {
  companyLogo: path.join("uploads", "organizations", "logos"),
  qrCode: path.join("uploads", "organizations", "qr-codes"),
  signature: path.join("uploads", "organizations", "signatures"),
} as const;

export const authProfileAssetFolders = {
  profileImage: path.join("uploads", "users", "profile-images"),
  ...organizationAssetFolders,
} as const;

export const uploadLeadProfilePicture = multer({
  storage: createDiskStorage({
    defaultDirectory: path.join("uploads", "leads"),
    filenamePrefix: "profile",
  }),
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
  },
  fileFilter: imageFileFilter,
});

export const uploadOrganizationAssets = multer({
  storage: createDiskStorage({
    fieldDirectories: organizationAssetFolders,
  }),
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
    files: 3,
  },
  fileFilter: imageFileFilter,
});

export const uploadAuthProfileAssets = multer({
  storage: createDiskStorage({
    fieldDirectories: authProfileAssetFolders,
  }),
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
    files: 4,
  },
  fileFilter: imageFileFilter,
});

export const uploadLeadImportFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
    files: 1,
  },
  fileFilter: spreadsheetFileFilter,
});
