import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = "http://dent_clinic.localhost:8000";

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = `${FRAPPE_URL}/${path}${req.nextUrl.search}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const cookie = req.headers.get("cookie");
  const csrf = req.headers.get("x-frappe-csrf-token");
  if (cookie) headers["Cookie"] = cookie;
  if (csrf) headers["x-frappe-csrf-token"] = csrf;

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
    credentials: "include",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    fetchOptions.body = await req.text();
  }

  const res = await fetch(url, fetchOptions);
  const data = await res.text();

  const response = new NextResponse(data, {
    status: res.status,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Forward all Set-Cookie headers from Frappe
  const setCookies = res.headers.getSetCookie?.() || [];
  setCookies.forEach(cookie => {
    response.headers.append("Set-Cookie", cookie);
  });

  const csrfToken = res.headers.get("x-frappe-csrf-token");
  if (csrfToken) {
    response.headers.set("x-frappe-csrf-token", csrfToken);
  }

  return response;
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;