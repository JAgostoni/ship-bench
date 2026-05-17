export async function GET() {
  return Response.json({ categories: [] });
}

export async function POST() {
  return Response.json({}, { status: 501 });
}
