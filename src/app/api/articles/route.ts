export async function GET() {
  return Response.json({ articles: [], total: 0 });
}

export async function POST() {
  return Response.json({}, { status: 501 });
}
