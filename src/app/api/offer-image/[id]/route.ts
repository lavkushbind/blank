import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase/admin";
export async function GET(_request: NextRequest, context: {params:Promise<{id:string}>}) {
  const {id} = await context.params;
  if (!/^[a-f0-9-]{36}$/.test(id)) return new NextResponse(null,{status:404});
  try {
    const file = adminStorage.bucket().file(`platform-offers/${id}`);
    const [[bytes],[metadata]] = await Promise.all([file.download(),file.getMetadata()]);
    return new NextResponse(new Uint8Array(bytes),{headers:{"Content-Type":metadata.contentType || "image/png","Cache-Control":"public, max-age=86400","X-Content-Type-Options":"nosniff"}});
  } catch { return new NextResponse(null,{status:404}); }
}
