import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = path.join(process.cwd(), "public/images");

// Ensure the upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

export async function GET() {
  const images = await prisma.galleryImage.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(images);
}

export async function POST(request: Request) {
  try {
    // Convert request body to a buffer then to a stream
    const buf = Buffer.from(await request.arrayBuffer());
    const stream = bufferToStream(buf);

    // Convert request.headers to a plain object and attach to stream
    const headers: Record<string, string> = {};
    for (const [key, value] of request.headers.entries()) {
      headers[key] = value;
    }
    console.log("Request headers:", headers);
    console.log("Content-Length header:", headers["content-length"]);
    (stream as any).headers = headers;

    return new Promise((resolve) => {
      const form = formidable({ multiples: false, uploadDir, keepExtensions: true });
      form.parse(stream, async (err, fields, files) => {
        console.log("Formidable callback triggered.");
        if (err) {
          console.error("Error parsing form data:", err);
          return resolve(
            NextResponse.json({ error: "Error parsing form data" }, { status: 500 })
          );
        }
        console.log("Parsed fields:", fields);
        console.log("Parsed files:", files);

        const { alt, title, description } = fields;
        let file = files.file; // expecting the file field to be named "file"
        if (Array.isArray(file)) {
          file = file[0];
        }
        if (!file) {
          console.error("No file uploaded.");
          return resolve(
            NextResponse.json({ error: "No file uploaded" }, { status: 400 })
          );
        }

        // Use the unique newFilename from formidable to avoid naming conflicts
        const fileName = file.newFilename;
        const newPath = path.join(uploadDir, fileName);
        const oldPath = file.filepath;
        try {
          fs.renameSync(oldPath, newPath);
        } catch (renameError) {
          console.error("File rename error, attempting copy:", renameError);
          try {
            fs.copyFileSync(oldPath, newPath);
            fs.unlinkSync(oldPath);
          } catch (copyError) {
            console.error("File copy error:", copyError);
            return resolve(
              NextResponse.json({ error: "File upload error" }, { status: 500 })
            );
          }
        }

        // Construct the file URL relative to the public folder
        const fileUrl = `/images/${fileName}`;
        if (!alt || !title || !description) {
          console.error("Missing fields:", { alt, title, description });
          return resolve(
            NextResponse.json({ error: "Missing fields" }, { status: 400 })
          );
        }

        try {
          const image = await prisma.galleryImage.create({
            data: {
              src: fileUrl,
              alt: String(alt),
              title: String(title),
              description: String(description),
            },
          });
          console.log("Image created:", image);
          return resolve(NextResponse.json(image));
        } catch (dbError) {
          console.error("Database error:", dbError);
          return resolve(
            NextResponse.json({ error: "Database error" }, { status: 500 })
          );
        }
      });
    });
  } catch (outerError) {
    console.error("Outer error in POST handler:", outerError);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const image = await prisma.galleryImage.delete({
      where: { id: parseInt(id) },
    });
    // Optionally remove file from the images directory
    const filePath = path.join(process.cwd(), "public", image.src);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return NextResponse.json(image);
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
