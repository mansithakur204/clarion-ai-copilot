import { NextResponse } from "next/server";
import { clarionStore } from "@/lib/store";
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    const hasMinLen = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasMinLen || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character."
        },
        { status: 400 }
      );
    }

    // Check existing user
    const existing = await clarionStore.getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email address already exists." },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);
    const user = await clarionStore.createUser(name.trim(), email.trim(), passwordHash);

    const token = createSessionToken(user);
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/"
    });

    return response;
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create account." },
      { status: 500 }
    );
  }
}
