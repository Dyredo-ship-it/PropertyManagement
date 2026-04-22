import { supabase } from "./supabase";

// Compress large images client-side via a canvas so we don't push 8 MB
// iPhone photos to Supabase Storage. Targets max 1600px on the longest
// edge and ~80% JPEG quality — keeps photos legible for an état des
// lieux / leak inspection while cutting bandwidth by ~10x.
async function compressImage(file: File, maxSize = 1600, quality = 0.8): Promise<Blob> {
  // Skip compression for already-small files or non-raster types.
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < 200 * 1024) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const targetW = Math.round(bitmap.width * scale);
  const targetH = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? file),
      "image/jpeg",
      quality,
    );
  });
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

export async function uploadMaintenancePhoto(
  file: File,
  organizationId: string,
  requestId: string,
): Promise<string> {
  const blob = await compressImage(file);
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${organizationId}/${requestId}/${Date.now()}_${safeFilename(file.name.replace(/\.[^.]+$/, ""))}.${ext}`;
  const { error } = await supabase.storage.from("maintenance-photos").upload(path, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  const { data } = supabase.storage.from("maintenance-photos").getPublicUrl(path);
  return data.publicUrl;
}
