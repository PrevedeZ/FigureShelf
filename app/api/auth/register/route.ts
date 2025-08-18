import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";

type Body = {
  email?: string;
  password?: string;
  name?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const name = (body.name || "").trim();

    // basic validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // already exists?
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // first user becomes ADMIN, others USER
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? "ADMIN" : "USER";

    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, name: name || null, password: hash, role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("REGISTER_POST_ERROR", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
