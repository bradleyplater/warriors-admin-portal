import { NextResponse } from "next/server";

// Pass-through today; this is the seam where auth (requireUser()) gets added later.
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
