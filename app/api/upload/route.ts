// File: app/api/upload/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary.server';

export const config = {
  api: { bodyParser: false },
};

export async function POST(req: NextRequest) {
  try {
    // parse as web FormData
    const formData = await req.formData();
    const fileBlob = formData.get('file');
    if (!(fileBlob instanceof Blob)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // convert Blob → Buffer
    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // upload via stream
    return await new Promise<NextResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'uploads', resource_type: 'auto' },
        (err, result) => {
          if (err || !result) {
            console.error('Cloudinary error:', err);
            return resolve(
              NextResponse.json({ error: 'Upload failed' }, { status: 500 })
            );
          }
          resolve(
            NextResponse.json({
              public_id: result.public_id,
              secure_url: result.secure_url,
              resource_type: result.resource_type,
            })
          );
        }
      );
      uploadStream.end(buffer);
    });
  } catch (e: any) {
    console.error('Upload handler error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
