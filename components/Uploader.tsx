'use client';

import { useState } from 'react';

export interface UploadResult {
  public_id:     string;
  secure_url:    string;
  resource_type: 'image' | 'raw' | string;
}

interface UploaderProps {
  onUpload: (res: UploadResult) => void;
  accept?:  string; // e.g. "image/*" or ".pdf,.doc,..." 
}

export default function Uploader({ onUpload, accept }: UploaderProps) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const fd = new FormData();
    fd.append('file', file);

    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data: UploadResult = await res.json();
    setUploading(false);

    if (res.ok) {
      onUpload(data);
    } else {
      console.error('Upload failed', data);
    }
  }

  return (
    <div>
      <input type="file" accept={accept} onChange={handleFile} />
      {uploading && <p>Uploading…</p>}
    </div>
  );
}
