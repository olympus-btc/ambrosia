import { NextResponse } from "next/server";

import { API_URL } from "@/config/api";

const upstream = API_URL;

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const upstreamUrl = `${upstream}/uploads/${resolvedParams.path.join("/")}`;

  try {
    const response = await fetch(upstreamUrl, {
      method: "GET",
      headers: request.headers,
    });

    const headers = new Headers();
    response.headers.forEach((value, key) => headers.set(key, value));
    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("Proxy uploads error:", error);
    return NextResponse.json({ error: "Failed to fetch upload" }, { status: 500 });
  }
}
