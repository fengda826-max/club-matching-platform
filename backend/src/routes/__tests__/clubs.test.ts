import request from 'supertest'
import { describe, expect, it } from 'vitest'

describe('Club API validation', () => {
  it('returns a structured 400 response for an invalid club payload', async () => {
    const { createApp } = await import('../../app')
    const response = await request(createApp()).post('/api/clubs').send({ name: '' })

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      success: false,
      error: 'VALIDATION_ERROR',
      message: '请求参数不合法',
    })
  })

  it('returns a structured 400 response for a non-numeric club id', async () => {
    const { createApp } = await import('../../app')
    const response = await request(createApp()).get('/api/clubs/not-a-number')

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('VALIDATION_ERROR')
  })
})
