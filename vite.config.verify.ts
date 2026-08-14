import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { extractLinkMetadata } from './server/extractLink.js'

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

// LEFTOVER — this config is temporarily active to run a live preview server
// for the user (this sandbox can't write into the mounted
// node_modules/.vite, so a scratch cacheDir is required). Safe to revert to
// the neutral stub once the preview is no longer needed.
export default defineConfig({
  plugins: [react(), tailwindcss(), linkExtractDevMiddleware()],
  cacheDir: '/tmp/vite-cache-mosaic-live',
})
