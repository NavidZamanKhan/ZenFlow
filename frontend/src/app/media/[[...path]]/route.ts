import { NextRequest } from 'next/server'
import { proxyRequest } from '@/lib/proxy'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type RouteContext = {
  params: Promise<{ path?: string[] }>
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, '/media', ctx)
}

export async function HEAD(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, '/media', ctx)
}
