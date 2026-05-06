import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

type RuntimeConfig = { apiOrigin: string; environment: string }

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, '')
}

function normalizeEnv(env: string) {
  return env.replace(/^\/+|\/+$/g, '')
}

function readRuntimeConfig(root: string): RuntimeConfig {
  const filePath = path.join(root, 'public', 'app-config.js')
  const fallback: RuntimeConfig = { apiOrigin: 'http://localhost:3003', environment: 'development' }
  try {
    const src = fs.readFileSync(filePath, 'utf8')
    const apiOriginMatch = src.match(/apiOrigin\s*:\s*['"]([^'"]+)['"]/)
    const envMatch = src.match(/environment\s*:\s*['"]([^'"]*)['"]/)
    const apiOrigin = normalizeOrigin(apiOriginMatch?.[1] ?? fallback.apiOrigin)
    const environment = normalizeEnv(envMatch?.[1] ?? fallback.environment)
    return { apiOrigin, environment }
  } catch {
    return fallback
  }
}

function runtimeApiProxy(): Plugin {
  return {
    name: 'runtime-api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (!url.startsWith('/__api/')) return next()

        const headerOrigin = typeof req.headers['x-api-origin'] === 'string' ? req.headers['x-api-origin'] : null
        const headerEnv =
          typeof req.headers['x-api-environment'] === 'string' ? req.headers['x-api-environment'] : null

        const fileCfg = readRuntimeConfig(server.config.root)
        const cfg: RuntimeConfig = {
          apiOrigin: normalizeOrigin(headerOrigin || fileCfg.apiOrigin),
          environment: normalizeEnv(headerEnv ?? fileCfg.environment),
        }

        const targetBase = `${cfg.apiOrigin}${cfg.environment ? `/${cfg.environment}` : ''}/api`
        const targetUrl = `${targetBase}${url.slice('/__api'.length)}`

        try {
          const method = req.method || 'GET'

          const chunks: Buffer[] = []
          await new Promise<void>((resolve, reject) => {
            req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
            req.on('end', () => resolve())
            req.on('error', (e) => reject(e))
          })
          const body = chunks.length ? Buffer.concat(chunks) : undefined

          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) {
            if (v === undefined) continue
            if (k.toLowerCase() === 'host') continue
            if (k.toLowerCase() === 'origin') continue
            if (k.toLowerCase() === 'x-api-origin') continue
            if (k.toLowerCase() === 'x-api-environment') continue
            if (Array.isArray(v)) headers.set(k, v.join(','))
            else headers.set(k, v)
          }

          const upstream = await fetch(targetUrl, {
            method,
            headers,
            body: body as any,
            redirect: 'manual',
          })

          res.statusCode = upstream.status
          upstream.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'content-encoding') return
            res.setHeader(key, value)
          })

          const ab = new Uint8Array(await upstream.arrayBuffer())
          res.end(Buffer.from(ab))
        } catch (e) {
          server.config.logger.error(`[runtime-api-proxy] ${String(e)}`)
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ message: 'Proxy error', error: String(e) }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), runtimeApiProxy()],
})
