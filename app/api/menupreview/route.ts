// File: app/api/menupreview/route.ts
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

// We’ll store previews under public/images/menupreview
const uploadDir = path.join(process.cwd(), "public", "images", "menupreview");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable({
    read() {},
  });
  stream.push(buffer);
  stream.push(null);
  return stream;
}

// Minimal shape of what Formidable.File gives us
interface UploadedFile {
  newFilename: string;
  filepath: string;
}

export async function GET() {
  try {
    // Fetch all MenuPreviewItem records, ordered by displayOrder
    const items = await prisma.menuPreviewItem.findMany({
      orderBy: { displayOrder: "asc" },
    });
    return NextResponse.json(items);
  } catch (err) {
    console.error("GET /api/menupreview error:", err);
    return NextResponse.json(
      { error: "Failed to fetch menu preview items" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Convert Request body to Buffer, then to a Readable stream
    const buf = Buffer.from(await request.arrayBuffer());
    const stream = bufferToStream(buf);
    // Attach headers so formidable can detect boundaries
    (stream as any).headers = Object.fromEntries(request.headers.entries());

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
            console.error("Formidable parse error:", err);
            return resolve(
              NextResponse.json(
                { error: "Error parsing form data" },
                { status: 500 }
              )
            );
          }

          // Extract text fields (they might be string or string[])
          const titleRaw = fields.title;
          const descRaw = fields.description;
          const orderRaw = fields.displayOrder;
          const title = Array.isArray(titleRaw) ? titleRaw[0] : titleRaw;
          const description = Array.isArray(descRaw) ? descRaw[0] : descRaw;
          const displayOrder = parseInt(
            Array.isArray(orderRaw) ? orderRaw[0] : orderRaw || "0",
            10
          );

          if (!title || typeof title !== "string" || title.trim() === "") {
            return resolve(
              NextResponse.json({ error: "Missing title" }, { status: 400 })
            );
          }

          // Grab the file entry
          let fileEntry = files.file;
          if (Array.isArray(fileEntry)) {
            fileEntry = fileEntry[0];
          }
          if (!fileEntry) {
            return resolve(
              NextResponse.json({ error: "No file uploaded" }, { status: 400 })
            );
          }

          const uploaded = fileEntry as UploadedFile;
          const { newFilename, filepath: oldPath } = uploaded;
          const newPath = path.join(uploadDir, newFilename);

          // Move or copy+unlink in case rename fails
          try {
            fs.renameSync(oldPath, newPath);
          } catch {
            try {
              fs.copyFileSync(oldPath, newPath);
              fs.unlinkSync(oldPath);
            } catch (copyErr) {
              console.error("File move error:", copyErr);
              return resolve(
                NextResponse.json(
                  { error: "File upload error" },
                  { status: 500 }
                )
              );
            }
          }

          // Build the URL that the client will use (relative to /public)
          const fileUrl = `/images/menupreview/${newFilename}`;

          try {
            const item = await prisma.menuPreviewItem.create({
              data: {
                title,
                description: description || null,
                imageUrl: fileUrl,
                displayOrder,
              },
            });
            return resolve(NextResponse.json(item));
          } catch (dbErr) {
            console.error("Prisma create error:", dbErr);
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
    console.error("Unexpected POST error:", outerErr);
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
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // Delete the DB record
    const item = await prisma.menuPreviewItem.delete({
      where: { id },
    });

    // Then delete the file from disk
    const filePath = path.join(
      process.cwd(),
      "public",
      item.imageUrl.replace(/^\//, "")
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json(item);
  } catch (delErr) {
    console.error("DELETE /api/menupreview error:", delErr);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
