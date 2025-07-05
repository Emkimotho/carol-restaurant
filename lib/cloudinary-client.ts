// File: lib/cloudinary-client.ts

/**
 * Supported Cloudinary cropping modes.
 *  - "fill":   crop to fill the specified dimensions (default)
 *  - "crop":   piecewise crop to the exact width/height
 *  - "scale":  scale to fit within the box
 *  - "fit":    scale to fit (no cropping; letterbox/pillarbox)
 */
export type CropMode = "fill" | "crop" | "scale" | "fit";

const DEFAULT_CROP: CropMode = "fill";

/**
 * Build a Cloudinary URL for the given public ID, optimized for web.
 *
 * @param publicId  Cloudinary public ID OR a full URL (in which case it's returned verbatim)
 * @param width     Desired image width
 * @param height    Desired image height
 * @param crop      Crop mode (see CropMode). Defaults to "fill".
 */
export function getCloudinaryImageUrl(
  publicId: string,
  width: number,
  height: number,
  crop: CropMode = DEFAULT_CROP
): string {
  // If it's already a URL, just return it
  if (/^https?:\/\//i.test(publicId)) {
    return publicId;
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    console.warn(
      "[cloudinary-client] NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set; returning publicId directly"
    );
    return ensureExtension(publicId);
  }

  // Guarantee file extension
  const idWithExt = ensureExtension(publicId);

  // Build the transformation string
  const transformation = [
    `c_${crop}`,          // crop mode
    `w_${width}`,         // width
    `h_${height}`,        // height
    `f_auto`,             // auto format
    `q_auto`              // auto quality
  ].join(",");

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${idWithExt}`;
}

/** 
 * If the publicId lacks a known extension, append “.jpg” 
 */
function ensureExtension(id: string) {
  return /\.(jpe?g|png|webp|gif)$/i.test(id) ? id : `${id}.jpg`;
}
