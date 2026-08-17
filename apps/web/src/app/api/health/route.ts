export function GET() {
  return Response.json({
    status: "healthy",
    service: "signal-crm-web",
    timestamp: new Date().toISOString(),
  });
}
