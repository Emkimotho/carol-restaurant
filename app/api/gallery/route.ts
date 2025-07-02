// File: app/api/gallery/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import type { IncomingMessage } from "http";

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = path.join(process.cwd(), "public", "images");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable({
    read() {}, // no-op
  });
  stream.push(buffer);
  stream.push(null);
  return stream;
}

// Minimal interface for the bits of Formidable.File we actually use
interface UploadedFile {
  newFilename: string;
  filepath: string;
}

export async function GET() {
  const images = await prisma.galleryImage.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(images);
}

export async function POST(request: Request) {
  try {
    // turn body into a stream
    const buf = Buffer.from(await request.arrayBuffer());
    const stream = bufferToStream(buf);

    // attach headers so Formidable can parse multipart boundaries
    ;(stream as any).headers = Object.fromEntries(
      request.headers.entries()
    );

    return new Promise<NextResponse>((resolve) => {
      const form = formidable({
        multiples: false,
        uploadDir,
        keepExtensions: true,
      });

      form.parse(
        stream as unknown as IncomingMessage,
        async (err: any, fields: any, files: any) => {
          if (err) {
            console.error("Error parsing form data:", err);
            return resolve(
              NextResponse.json(
                { error: "Error parsing form data" },
                { status: 500 }
              )
            );
          }

          // pull out text fields (may be string or string[])
          const altRaw = fields.alt;
          const titleRaw = fields.title;
          const descRaw = fields.description;
          const alt = Array.isArray(altRaw) ? altRaw[0] : altRaw;
          const title = Array.isArray(titleRaw) ? titleRaw[0] : titleRaw;
          const description = Array.isArray(descRaw)
            ? descRaw[0]
            : descRaw;

          if (!alt || !title || !description) {
            console.error("Missing fields:", { alt, title, description });
            return resolve(
              NextResponse.json(
                { error: "Missing fields" },
                { status: 400 }
              )
            );
          }

          // grab the file entry
          let fileEntry = files.file;
          if (Array.isArray(fileEntry)) fileEntry = fileEntry[0];
          if (!fileEntry) {
            console.error("No file uploaded.");
            return resolve(
              NextResponse.json(
                { error: "No file uploaded" },
                { status: 400 }
              )
            );
          }

          // cast to our UploadedFile
          const uploaded = fileEntry as UploadedFile;
          const { newFilename, filepath: oldPath } = uploaded;
          const newPath = path.join(uploadDir, newFilename);

          // move (or fallback to copy+unlink)
          try {
            fs.renameSync(oldPath, newPath);
          } catch {
            try {
              fs.copyFileSync(oldPath, newPath);
              fs.unlinkSync(oldPath);
            } catch (copyErr) {
              console.error("File copy error:", copyErr);
              return resolve(
                NextResponse.json(
                  { error: "File upload error" },
                  { status: 500 }
                )
              );
            }
          }

          // persist to DB
          const fileUrl = `/images/${newFilename}`;
          try {
            const image = await prisma.galleryImage.create({
              data: {
                src: fileUrl,
                alt,
                title,
                description,
              },
            });
            return resolve(NextResponse.json(image));
          } catch (dbErr) {
            console.error("Database error:", dbErr);
            return resolve(
              NextResponse.json(
                { error: "Database error" },
                { status: 500 }
              )
            );
          }
        }
      );
    });
  } catch (outerErr) {
    console.error("Outer error in POST handler:", outerErr);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");
    if (!idParam) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const id = parseInt(idParam, 10);
    const image = await prisma.galleryImage.delete({
      where: { id },
    });

    // delete the file on disk
    const filePath = path.join(process.cwd(), "public", image.src);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json(image);
  } catch (delErr) {
    console.error("Delete error:", delErr);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
