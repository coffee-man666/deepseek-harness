/**
 * HTTP sidecar for the Lumen pipeline DSH facade (see facade.ts): boots the
 * composition once, then serves POST /run {filename, text, language?,
 * strongExtract?} → the facade run result (rdm, plan, themeId, metrics), and
 * GET /health. The vibe-report-dashboard app's /compare page talks to this
 * service through DSH_COMPARE_URL. Binds 127.0.0.1 only; it is a local demo
 * service, not a production endpoint.
 *
 * Usage: VIBE_ROOT=… DEEPSEEK_API_KEY=… tsx sidecar.ts [port]
 */
import http from 'node:http'
import { startFacade } from './facade.ts'

const VIBE = process.env.VIBE_ROOT
if (!VIBE) {
  console.error('sidecar: VIBE_ROOT must point at the vibe-report-dashboard checkout')
  process.exit(1)
}
const port = Number(process.argv[2] ?? process.env.PORT ?? 8790)

const facade = await startFacade(VIBE)

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }
  if (req.method !== 'POST' || req.url !== '/run') {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'not_found' }))
    return
  }
  const chunks: Buffer[] = []
  req.on('data', (c: Buffer) => chunks.push(c))
  req.on('end', () => {
    void (async () => {
      try {
        type RunBody = { filename?: string; text?: string; language?: string; strongExtract?: boolean }
        const body = JSON.parse(Buffer.concat(chunks).toString()) as RunBody
        if (typeof body.text !== 'string' || body.text.trim() === '') {
          res.writeHead(400, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ error: 'text_required' }))
          return
        }
        const started = Date.now()
        const result = await facade.run({
          filename: body.filename ?? 'report.md',
          text: body.text,
          language: body.language ?? 'en',
          strongExtract: body.strongExtract === true,
        })
        console.log(`sidecar: run ok=${result.ok} ${Date.now() - started}ms in=${result.metrics.totals.inputTokens} out=${result.metrics.totals.outputTokens}`)
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(result))
      } catch (e) {
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }))
      }
    })()
  })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`lumen DSH sidecar: http://127.0.0.1:${port} (health: GET /health, run: POST /run)`)
})

async function shutdown(): Promise<void> {
  await facade.dispose()
  server.close()
  process.exit(0)
}
process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())
