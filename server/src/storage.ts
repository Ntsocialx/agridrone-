import { v2 as cloudinary } from "cloudinary";

// Licences are 'authenticated' (no public URL); portfolio photos are public.
export type DeliveryType = "authenticated" | "upload";

export type SignedUpload = {
  uploadUrl: string;
  fields: Record<string, string | number>;
};

export type StoredFile = { format: string; bytes: number; secureUrl: string };

// Spreadsheets (flight logs) are stored by Cloudinary as 'raw' files, and it adds the
// extension to the public_id (e.g. "…/uuid.csv"); PDFs and photos are 'image' with no
// extension. So the extension tells us how a file is stored. (Checked live, 13 Nov 2026.)
const RAW_FORMATS = ["csv", "xlsx", "xls"];
const extensionOf = (publicId: string) => /\.([a-z0-9]+)$/i.exec(publicId)?.[1]?.toLowerCase();
export const isRawFile = (publicId: string) => RAW_FORMATS.includes(extensionOf(publicId) ?? "");
const resourceType = (publicId: string) => (isRawFile(publicId) ? "raw" : "image");

/** The few Cloudinary operations the API needs, behind an interface for tests. */
export type Storage = {
  signUpload(params: { publicId: string; type: DeliveryType; allowedFormats: string[] }): SignedUpload;
  /** Returns null when the file was never uploaded. */
  find(publicId: string, type: DeliveryType): Promise<StoredFile | null>;
  remove(publicId: string, type: DeliveryType): Promise<void>;
  /** Short-lived link for a private file. */
  privateUrl(publicId: string, format: string, expiresAt: number): string;
};

export function createCloudinaryStorage(config: { cloudName: string; apiKey: string; apiSecret: string }): Storage {
  cloudinary.config({ cloud_name: config.cloudName, api_key: config.apiKey, api_secret: config.apiSecret, secure: true });

  return {
    signUpload({ publicId, type, allowedFormats }) {
      // Every field here is covered by the signature, so the client can't change
      // where the file goes, its access type, or its allowed formats.
      const params = {
        public_id: publicId,
        type,
        allowed_formats: allowedFormats.join(","),
        overwrite: "false",
        timestamp: Math.floor(Date.now() / 1000),
      };
      const signature = cloudinary.utils.api_sign_request(params, config.apiSecret);
      return {
        uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`,
        fields: { ...params, api_key: config.apiKey, signature },
      };
    },

    async find(publicId, type) {
      try {
        const r = await cloudinary.api.resource(publicId, { type, resource_type: resourceType(publicId) });
        // Raw files report no format; their extension is the format.
        return { format: r.format ?? extensionOf(publicId) ?? "", bytes: r.bytes, secureUrl: r.secure_url };
      } catch (error) {
        if ((error as { error?: { http_code?: number } }).error?.http_code === 404) return null;
        throw error;
      }
    },

    async remove(publicId, type) {
      await cloudinary.uploader.destroy(publicId, { type, resource_type: resourceType(publicId), invalidate: true });
    },

    privateUrl(publicId, format, expiresAt) {
      // A raw file's public_id already ends in its extension, so no format is added.
      return isRawFile(publicId)
        ? cloudinary.utils.private_download_url(publicId, "", { type: "authenticated", resource_type: "raw", expires_at: expiresAt })
        : cloudinary.utils.private_download_url(publicId, format, { type: "authenticated", expires_at: expiresAt });
    },
  };
}
