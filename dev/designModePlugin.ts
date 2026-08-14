import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'

/**
 * Dev-only "Figma-like" editing tool for a page's absolutely-positioned UI
 * (drag/resize/rotate) and its text content (click-to-edit). Problem this
 * solves: iterating on layout/copy blind — guess a value, ask the user to
 * screenshot, re-guess — is slow and error-prone. Instead, `<Positionable>`
 * and `<EditableText>` (see src/dev/DesignMode.tsx) let changes happen
 * directly on the live page. Every change POSTs here and gets written
 * straight into a JSON file that the component imports — Vite's own
 * JSON-import HMR then re-renders with the new value live, no manual
 * translation step in between.
 *
 * `apply: 'serve'` keeps this entirely out of the production build — it's
 * dev-server-only middleware, not shipped code.
 *
 * Reused across projects: both routes are intentionally generic key → value
 * JSON stores (positions doesn't know about "cards" or "phones", text
 * doesn't know about "headlines" or "buttons"), so this plugin can be
 * dropped into any React + Vite project again for future UI-polish tasks.
 * See the design-mode-editor skill.
 */
export function designModePlugin(
  positionsRelativePath = 'src/data/hero-positions.json',
  textRelativePath = 'src/data/hero-copy.json',
): Plugin {
  const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
  const positionsPath = path.resolve(root, positionsRelativePath)
  const textPath = path.resolve(root, textRelativePath)

  return {
    name: 'design-mode-plugin',
    apply: 'serve',
    configureServer(server) {
      // Positions: POST body is { id, top, left, width, rotate } — the whole
      // shape (minus id) is stored as-is under that id.
      mountJsonStore(server, '/__design-mode/positions', positionsPath, (body: Record<string, unknown>) => {
        const { id, ...rest } = body as { id: string; [key: string]: unknown }
        return { id, value: rest }
      })

      // Text: POST body is { id, value } — value is just the new string.
      mountJsonStore(server, '/__design-mode/text', textPath, (body: Record<string, unknown>) => {
        const { id, value } = body as { id: string; value: unknown }
        return { id, value }
      })
    },
  }
}

/**
 * Mounts a GET/POST JSON key-value store at `route`, backed by the file at
 * `jsonPath`. GET returns the whole file; POST reads a request body, maps it
 * to `{ id, value }` via `toEntry`, merges `value` into the file under `id`,
 * and writes it back to disk.
 */
function mountJsonStore(
  server: { middlewares: Connect.Server },
  route: string,
  jsonPath: string,
  toEntry: (body: Record<string, unknown>) => { id: string; value: unknown },
) {
  server.middlewares.use(route, async (req, res) => {
    res.setHeader('Content-Type', 'application/json')

    if (req.method === 'GET') {
      try {
        const raw = await readFile(jsonPath, 'utf-8').catch(() => '{}')
        res.statusCode = 200
        res.end(raw)
      } catch (err) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Read failed' }))
      }
      return
    }

    if (req.method === 'POST') {
      try {
        const chunks: Buffer[] = []
        for await (const chunk of req) {
          chunks.push(chunk as Buffer)
        }
        const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as Record<string, unknown>
        const { id, value } = toEntry(body)

        const current = JSON.parse(await readFile(jsonPath, 'utf-8').catch(() => '{}')) as Record<string, unknown>
        current[id] = value
        await writeFile(jsonPath, `${JSON.stringify(current, null, 2)}\n`, 'utf-8')

        res.statusCode = 200
        res.end(JSON.stringify({ ok: true }))
      } catch (err) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Save failed' }))
      }
      return
    }

    res.statusCode = 405
    res.end(JSON.stringify({ error: 'Method not allowed' }))
  })
}
