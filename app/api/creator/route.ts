import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle")?.replace(/^@/, "").trim();

  if (!handle) {
    return NextResponse.json(
      { error: "handle required" },
      { status: 400, headers: CORS }
    );
  }

  const { data } = await supabase
    .from("creators")
    .select("x_handle, wallet_address")
    .eq("x_handle", handle)
    .single();

  if (!data) {
    return NextResponse.json(
      { error: "not found" },
      { status: 404, headers: CORS }
    );
  }

  return NextResponse.json(data, { headers: CORS });
}
