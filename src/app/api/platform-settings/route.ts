import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { settings, identity, apiError } from "@/lib/platform/server";
import { defaultSettings } from "@/lib/platform/defaults";
export const dynamic = "force-dynamic";
export async function GET() { try { return NextResponse.json(await settings(), {headers:{"Cache-Control":"no-store"}}); } catch(e) { return apiError(e); } }
export async function PUT(request: NextRequest) {
  try {
    const user = await identity(request, true);
    const input = await request.json();
    const money = (n: unknown, min = 0) => typeof n === "number" && Number.isInteger(n) && n >= min && n <= 1000000;
    if (!money(input.demoFee) || ["freeDemo","offersEnabled","offerEnabled"].some((k) => typeof input[k] !== "boolean")) throw new Error("Invalid pricing settings");
    if (typeof input.offerTitle !== "string" || input.offerTitle.length > 100 || typeof input.offerDescription !== "string" || input.offerDescription.length > 500 || typeof input.offerImage !== "string" || (input.offerImage && !/^\/api\/offer-image\/[a-f0-9-]+$/.test(input.offerImage))) throw new Error("Invalid offer details");
    const plans = Object.fromEntries(Object.entries(defaultSettings.plans).map(([id, plan]) => {
      const p = input.plans?.[id];
      if (!p || !money(p.regular,1) || !money(p.offer,1) || p.offer > p.regular) throw new Error("Invalid plan price");
      return [id, { ...plan, regular:p.regular, offer:p.offer }];
    }));
    const value = { demoFee:input.demoFee, freeDemo:input.freeDemo, offersEnabled:input.offersEnabled, offerEnabled:input.offerEnabled, offerTitle:input.offerTitle.trim(), offerDescription:input.offerDescription.trim(), offerImage:input.offerImage, plans };
    const ref = adminDb.collection("platform_settings").doc("public");
    await adminDb.runTransaction(async (tx) => {
      const before = await tx.get(ref);
      tx.set(adminDb.collection("admin_audit").doc(), { actor:user.uid, action:"UPDATE_PRICING", before:before.data() || null, after:value, at:new Date() });
      tx.set(ref,value);
    });
    return NextResponse.json(value);
  } catch(e) { return apiError(e); }
}
