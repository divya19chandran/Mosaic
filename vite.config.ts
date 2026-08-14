import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { extractLinkMetadata } from './server/extractLink.js'
import { designModePlugin } from './dev/designModePlugin.ts'

// Exposes the same `/api/extract-link?url=...` route under `npm run dev` that
// `server/index.js` serves in production, so the link-extraction feature in
// AddActivityForm works during local development too. Reuses the exact same
// `extractLinkMetadata` logic — this is Vite's dev server acting as the
// backend rather than a duplicate implementation.
function linkExtractDevMiddleware(): Plugin {
  return {
    name: 'link-extract-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/extract-link', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const target = url.searchParams.get('url')
        if (!target) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing url parameter' }))
          return
        }
        try {
          const data = await extractLinkMetadata(target)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
        } catch (err) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Extraction failed' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Served from https://divya19chandran.github.io/Mosaic/ (a project page,
  // not a custom domain) — every built asset URL needs this prefix or they
  // 404 once deployed. Doesn't affect `npm run dev`, which always serves
  // from "/".
  base: '/Mosaic/',
  plugins: [react(), tailwindcss(), linkExtractDevMiddleware(), designModePlugin()],
})
