import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out" }, { status: 200 });
  const cookieStore = await cookies();
  const cookieNames = Array.from(cookieStore.getAll()).map((c) => c.name);

  cookieNames.forEach((name) => {
    if (["accessToken", "refreshToken"].includes(name)) {
      response.cookies.delete(name);
    }
  });

  return response;
}
