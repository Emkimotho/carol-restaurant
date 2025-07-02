/* ------------------------------------------------------------------
   File: components/dashboard/AdminDashboard/MenuBuilder/ImageUploader.tsx
   ------------------------------------------------------------------
   • Component to handle image file selection and preview.
   • Adds console.log debugging for `imageUrl` and `cloudinaryPublicId`.
   • Supports Cloudinary public ID fallback via `getCloudinaryImageUrl`.
*/

"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import styles from "./MenuItemEditor.module.css";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-client";

interface ImageUploaderProps {
  imageUrl?: string;
  cloudinaryPublicId?: string;
  selectedFile: File | null;
  uploading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ImageUploader({
  imageUrl,
  cloudinaryPublicId,
  selectedFile,
  uploading,
  onFileChange,
}: ImageUploaderProps) {
  const THUMB_SIZE = 200;

  // Determine preview source: prefer Cloudinary ID if provided
  const src = cloudinaryPublicId
    ? getCloudinaryImageUrl(cloudinaryPublicId, THUMB_SIZE, THUMB_SIZE)
    : imageUrl || "";

  // Debug logging
  useEffect(() => {
    console.log("[ImageUploader] imageUrl:", imageUrl);
    console.log("[ImageUploader] cloudinaryPublicId:", cloudinaryPublicId);
    console.log("[ImageUploader] preview src:", src);
  }, [imageUrl, cloudinaryPublicId, src]);

  return (
    <div className={styles.field}>
      <label htmlFor="imageUpload">Image Upload:</label>
      <input
        id="imageUpload"
        type="file"
        accept="image/*"
        onChange={onFileChange}
      />
      {selectedFile && <p>Selected file: {selectedFile.name}</p>}
      {uploading && <p>Uploading image...</p>}
      {src && (
        <div style={{ marginTop: "0.5rem", maxWidth: "200px" }}>
          <Image
            src={src}
            alt="Preview"
            width={THUMB_SIZE}
            height={THUMB_SIZE}
            unoptimized
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </div>
      )}
    </div>
  );
}
