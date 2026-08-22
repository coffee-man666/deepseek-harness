import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServer, type RequestListener, type Server } from 'node:http'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type { TeamService } from '@deepseek-ai/dsh-experimental-agent-team'
import type { WebRoute, WebServer } from '@deepseek-ai/dsh-host-webserver'
import type { ToolRuntime } from '@deepseek-ai/dsh-tools'
import type { SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import { MobileAgentConsoleService } from '../src/index.ts'

const contexts: Context[] = []
const roots: string[] = []
const servers: Server[] = []

afterEach(async () => {
  for (const ctx of contexts.splice(0).reverse()) await ctx.fiber.dispose()
  for (const server of servers.splice(0).reverse()) {
    if (server.listening) await new Promise<void>((resolve) => { server.close(() => { resolve() }) })
  }
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
  vi.unstubAllGlobals()
})

interface FakeWebServer {
  port: number
  routes: WebRoute[]
  register(route: WebRoute): () => void
}

function webServer(port: number): FakeWebServer & WebServer {
  const value: FakeWebServer = {
    port,
    routes: [],
    register(route) {
      value.routes.push(route)
      return () => {
        const index = value.routes.indexOf(route)
        if (index >= 0) value.routes.splice(index, 1)
      }
    },
  }
  return value as FakeWebServer & WebServer
}

interface CredentialStub {
  value?: string
  resolve: CredentialProvider['resolve']
}

function contextWithServices(
  server: FakeWebServer & WebServer,
  credentials: CredentialStub,
  teams: Partial<TeamService> = {},
): Context {
  const ctx = new Context()
  ctx.provide('webServer', server)
  ctx.provide('agents', { list: () => [] } as never)
  ctx.provide('agentTeams', {
    tryMembership: () => undefined,
    listMembers: () => [],
    listTasks: () => [],
    ...teams,
  } as TeamService)
  ctx.provide('credentials', credentials as CredentialProvider)
  ctx.provide('tools', {} as ToolRuntime)
  ctx.provide('systemPrompt', {} as SystemPrompt)
  contexts.push(ctx)
  return ctx
}

function agent(cwd: string): Agent {
  return {
    id: 'agent-1',
    session: { header: { cwd }, events: [] },
  } as unknown as Agent
}

async function mounted(
  config: ConstructorParameters<typeof MobileAgentConsoleService>[1],
  credentials: CredentialStub,
  server = webServer(43123),
): Promise<{ service: MobileAgentConsoleService; server: FakeWebServer & WebServer }> {
  const ctx = contextWithServices(server, credentials)
  const fiber = ctx.plugin(MobileAgentConsoleService, config)
  await fiber
  return { service: ctx.mobileAgentConsole, server }
}

async function listeningServer(handler?: RequestListener): Promise<Server> {
  const server = handler === undefined ? createServer() : createServer(handler)
  servers.push(server)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return server
}

function portOf(server: Server): number {
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('expected an address')
  return address.port
}

describe('mobile console Host service', () => {
  it('stores, recalls, bounds, and projects shared memory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-mobile-memory-'))
    roots.push(root)
    const credentials: CredentialStub = { resolve: vi.fn(async () => undefined) }
    const { service } = await mounted({
      gatewayEnabled: false,
      memoryDirectory: join(root, 'memory'),
      maxMemoryEntries: 2,
      maxMemoryContextBytes: 160,
    }, credentials)
    const owner = agent(root)

    const first = await service.remember(owner, 'GLM project route', ['project', 'glm'])
    await service.remember(owner, 'Team task is pending', ['team'])
    expect((await service.recall(owner, 'team'))).toHaveLength(1)
    await service.remember(owner, 'Newest decision', ['decision'])
    expect(first.content).toBe('GLM project route')
    expect((await service.recall(owner, '')).map(row => row.content)).toEqual(['Newest decision', 'Team task is pending'])

    const snapshot = await service.snapshot()
    expect(snapshot.memories.map(row => row.content)).toEqual(['Newest decision', 'Team task is pending'])
    expect(snapshot.route).toEqual({ provider: 'glm', model: 'glm-5' })
    expect(snapshot.quota.available).toBe(false)
    expect(snapshot.quota.error).toContain('ZHIPU_API_KEY')
  })

  it('normalizes a provider quota response and caches it', async () => {
    const credentials: CredentialStub = {
      resolve: vi.fn(async () => ({ value: 'secret', source: 'test' })),
    }
    const fetcher = vi.fn(async (...args: Parameters<typeof fetch>) => {
      const init = args[1]
      expect(new Headers(init?.headers).get('authorization')).toBe('secret')
      return new Response(JSON.stringify({ data: {
        limits: [
          { name: 'day', usedPercent: 20, remaining: 80, resetAt: 'tomorrow' },
          { type: 'month', used_percent: 4 },
        ],
      } }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetcher)
    const { service } = await mounted({ gatewayEnabled: false, quotaCacheMs: 30_000 }, credentials)

    const first = await service.snapshot()
    const second = await service.snapshot()
    expect(first.quota).toEqual({
      provider: 'glm',
      available: true,
      windows: [
        { name: 'day', usedPercent: 20, remaining: 80, resetAt: 'tomorrow' },
        { name: 'month', usedPercent: 4 },
      ],
    })
    expect(second.quota).toEqual(first.quota)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(credentials.resolve).toHaveBeenCalledTimes(1)
  })

  it('normalizes the GLM monitor limits response', async () => {
    const credentials: CredentialStub = {
      resolve: vi.fn(async () => ({ value: 'secret', source: 'test' })),
    }
    const reset = Date.UTC(2026, 7, 21, 12)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: {
      limits: [
        { type: 'TOKENS_LIMIT', usage: 1_000, currentValue: 250, percentage: 25, nextResetTime: reset },
        { type: 'TIME_LIMIT', usage: 100, currentValue: 4, percentage: 4 },
      ],
    } }), { status: 200 })))
    const { service } = await mounted({ gatewayEnabled: false }, credentials)

    await expect(service.snapshot()).resolves.toMatchObject({
      quota: {
        provider: 'glm',
        available: true,
        windows: [
          { name: 'Token usage (5h)', usedPercent: 25, remaining: 750, resetAt: new Date(reset).toISOString() },
          { name: 'MCP usage (1 month)', usedPercent: 4, remaining: 96 },
        ],
      },
    })
  })

  it('requires a token for the mobile gateway, then proxies after login', async () => {
    const target = await listeningServer((req, res) => {
      if (req.url === '/headers') {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ host: req.headers.host, origin: req.headers.origin }))
        return
      }
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end('upstream')
    })
    const gatewayPortProbe = await listeningServer()
    const gatewayPort = portOf(gatewayPortProbe)
    await new Promise<void>((resolve) => { gatewayPortProbe.close(() => { resolve() }) })
    servers.splice(servers.indexOf(gatewayPortProbe), 1)
    const server = webServer(portOf(target))
    const tokenKey = 'DSH_MOBILE_ACCESS_TOKEN'
    const before = process.env[tokenKey]
    process.env[tokenKey] = 'test-mobile-token'
    try {
      const credentials: CredentialStub = { resolve: vi.fn(async () => undefined) }
      await mounted({
        gatewayEnabled: true,
        gatewayHost: '127.0.0.1',
        gatewayPort,
        tokenEnv: tokenKey,
      }, credentials, server)

      const denied = await fetch(`http://127.0.0.1:${String(gatewayPort)}/__dsh_mobile__/health`)
      expect(denied.status).toBe(401)

      const health = await fetch(`http://127.0.0.1:${String(gatewayPort)}/__dsh_mobile__/health`, {
        headers: { authorization: 'Bearer test-mobile-token' },
      })
      expect(health.status).toBe(200)
      expect(await health.json()).toEqual({ ok: true, webPort: portOf(target) })

      const login = await fetch(`http://127.0.0.1:${String(gatewayPort)}/__dsh_mobile__/login?access_token=test-mobile-token`, { redirect: 'manual' })
      expect(login.status).toBe(302)
      const setCookie = login.headers.get('set-cookie')
      expect(setCookie).toContain('dsh_mobile=test-mobile-token')

      const proxied = await fetch(`http://127.0.0.1:${String(gatewayPort)}/`, {
        headers: { cookie: setCookie ?? '' },
      })
      expect(await proxied.text()).toBe('upstream')

      const forwarded = await fetch(`http://127.0.0.1:${String(gatewayPort)}/headers`, {
        headers: {
          authorization: 'Bearer test-mobile-token',
          origin: 'http://192.168.1.10:3082',
        },
      })
      expect(await forwarded.json()).toEqual({
        host: `127.0.0.1:${String(portOf(target))}`,
        origin: `http://127.0.0.1:${String(portOf(target))}`,
      })
    } finally {
      if (before === undefined) Reflect.deleteProperty(process.env, tokenKey)
      else process.env[tokenKey] = before
    }
  })
})
