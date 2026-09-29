import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage } from 'node:http'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Serves the Vercel functions in api/ during `yarn dev`, so kiosk mode works locally without `vercel dev`.
// Each api/<name>.ts default-exports { fetch(request) }, the same shape Vercel runs in production.
function vercelApiDev(): Plugin {
  return {
    name: 'vercel-api-dev',
    apply: 'serve',
    configureServer(server) {
      // Server-only secrets (CLERK_SECRET_KEY, ...) from .env / .env.local; never exposed to the browser.
      const env = loadEnv(server.config.mode, server.config.root, '')
      for (const [key, value] of Object.entries(env)) {
        if (!key.startsWith('VITE_') && process.env[key] === undefined) {
          process.env[key] = value
        }
      }

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
        const match = /^\/api\/([a-z0-9-]+)$/.exec(url.pathname)
        if (!match) {
          return next()
        }
        if (!existsSync(resolve(server.config.root, 'api', `${match[1]}.ts`))) {
          res.statusCode = 404
          return res.end('Not found')
        }

        try {
          const module = await server.ssrLoadModule(`/api/${match[1]}.ts`)
          const response: Response = await module.default.fetch(await toRequest(req, url))
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          server.config.logger.error(`[api] ${url.pathname}: ${error}`)
          res.statusCode = 500
          res.end('API function failed; see the dev server log')
        }
      })
    },
  }
}

async function toRequest(req: IncomingMessage, url: URL) {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(chunk as Buffer)
  }
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers.set(key, Array.isArray(value) ? value.join(', ') : value)
    }
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && chunks.length > 0
  return new Request(url, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined })
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), vercelApiDev()],
})
