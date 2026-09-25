import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { adminStorage } from "@/lib/firebase/admin";
import { identity, apiError } from "@/lib/platform/server";
export async function POST(request: NextRequest) {
  try {
    await identity(request,true);
    if (Number(request.headers.get("content-length")) > 3200000) throw new Error("Invalid image: maximum 3 MB");
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File) || file.size > 3000000 || file.size < 12) throw new Error("Invalid image: maximum 3 MB");
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "image/png" : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "image/jpeg" : bytes.toString("ascii",0,4) === "RIFF" && bytes.toString("ascii",8,12) === "WEBP" ? "image/webp" : "";
    if (!mime) throw new Error("Invalid image: use PNG, JPEG or WebP");
    const id = randomUUID();
    await adminStorage.bucket().file(`platform-offers/${id}`).save(bytes,{contentType:mime,resumable:false});
    return NextResponse.json({url:`/api/offer-image/${id}`});
  } catch(e) { return apiError(e); }
}
