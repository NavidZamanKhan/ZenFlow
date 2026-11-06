import { NextRequest } from 'next/server'
import { proxyRequest } from '@/lib/proxy'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type RouteContext = {
  params: Promise<{ path?: string[] }>
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, '/api', ctx)
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, '/api', ctx)
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, '/api', ctx)
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, '/api', ctx)
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, '/api', ctx)
}

export async function HEAD(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, '/api', ctx)
}

export async function OPTIONS(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, '/api', ctx)
}
