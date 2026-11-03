// Serves dist/ the way frontend/nginx.conf does in production: gzip for css/js/json/svg, SPA fallback.
// `vite preview` sends JS uncompressed, which would overstate the bundle cost on a slow network.
// Usage: node serve.mjs <distDir> <port>
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { gzipSync } from 'node:zlib'

const [dist, port = '4180'] = process.argv.slice(2)
if (!dist) throw new Error('Usage: node serve.mjs <distDir> [port]')
const TYPES = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.hdr': 'application/octet-stream', '.txt': 'text/plain', '.md': 'text/plain',
}
const GZIP = new Set(['application/javascript', 'text/css', 'application/json', 'image/svg+xml', 'text/html'])

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
  let file = join(dist, path)
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
  } catch {
    file = join(dist, 'index.html')
  }
  const type = TYPES[extname(file)] ?? 'application/octet-stream'
  let body = await readFile(file)
  const headers = { 'Content-Type': type, 'Cache-Control': 'no-cache' }
  if (GZIP.has(type) && body.length >= 1024 && /gzip/.test(req.headers['accept-encoding'] ?? '')) {
    body = gzipSync(body)
    headers['Content-Encoding'] = 'gzip'
  }
  headers['Content-Length'] = body.length
  res.writeHead(200, headers)
  res.end(body)
}).listen(Number(port), () => console.log(`serving ${dist} on http://localhost:${port}`))
