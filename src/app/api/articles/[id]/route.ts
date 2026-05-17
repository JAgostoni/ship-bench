export async function GET() {
  return Response.json({}, { status: 501 });
}

export async function PUT() {
  return Response.json({}, { status: 501 });
}

export async function DELETE() {
  return new Response(null, { status: 501 });
}
