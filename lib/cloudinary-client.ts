// File: lib/cloudinary-client.ts

/**
 * Build a Cloudinary image URL for use in browser components.
 * Reads NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME from the environment.
 */

/**
 * Returns a Cloudinary URL for the given public ID, with automatic
 * format and quality optimization. If the env var is missing, logs
 * a warning and returns the bare publicId or its URL if it looks like one.
 */
export function getCloudinaryImageUrl(
  publicId: string,
  width: number,
  height: number,
  crop: 'fill' | 'crop' | 'scale' | 'fit' = 'fill'
): string {
  // If the publicId is already a full URL, just return it
  if (/^https?:\/\//i.test(publicId)) {
    return publicId;
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    console.warn(
      '[cloudinary-client] NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set; returning publicId directly'
    );
    // Append a .jpg if missing, so at least it's a valid path
    return publicId.match(/\.(jpe?g|png|webp|gif)$/i)
      ? publicId
      : `${publicId}.jpg`;
  }

  // Ensure the publicId has an extension
  const idWithExt = publicId.match(/\.(jpe?g|png|webp|gif)$/i)
    ? publicId
    : `${publicId}.jpg`;

  // Build the URL
  return [
    `https://res.cloudinary.com/${cloudName}/image/upload`,
    `c_${crop},w_${width},h_${height},f_auto,q_auto`,
    idWithExt
  ].join('/');
}
