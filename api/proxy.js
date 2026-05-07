export default async function handler(req, res) {
  const apiOrigin = process.env.API_ORIGIN || 'https://api-sample-model.onrender.com'
  const environment = process.env.API_ENVIRONMENT || 'production'
  const path = Array.isArray(req.query?.path) ? req.query.path.join('/') : req.query?.path || ''

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  const targetBase = `${apiOrigin}${environment ? `/${environment}` : ''}/api`
  const targetUrl = targetBase.replace(/\/+$/, '') + '/' + path.replace(/^\/+/g, '')

  const headers = { ...req.headers }
  delete headers.host
  delete headers['x-vercel-deployment-url']
  delete headers['x-forwarded-host']
  delete headers['x-forwarded-proto']

  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const body = chunks.length ? Buffer.concat(chunks) : undefined

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
    redirect: 'manual',
  })

  res.statusCode = upstream.status
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'content-encoding') return
    res.setHeader(key, value)
  })

  const buffer = Buffer.from(await upstream.arrayBuffer())
  res.end(buffer)
}
