import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'

const app = new Hono()

app.get('/', (c) => {
  return c.redirect('/upload.html')
})

app.get('/*', serveStatic({ root: './frontend' }))

export default app
