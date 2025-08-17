import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  return NextResponse.json({
    hasSession: !!session,
    email: session?.user?.email ?? null,
  });
}
