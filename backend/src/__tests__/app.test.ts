import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app'

describe('application CORS', () => {
  it('allows the public origin forwarded by the reverse proxy', async () => {
    const response = await request(createApp())
      .options('/api/health')
      .set('Origin', 'https://portfolio.example')
      .set('Host', 'app:3001')
      .set('X-Forwarded-Host', 'portfolio.example')
      .set('X-Forwarded-Proto', 'https')

    expect(response.status).toBe(204)
    expect(response.headers['access-control-allow-origin']).toBe('https://portfolio.example')
  })
})
