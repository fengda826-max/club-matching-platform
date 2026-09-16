// @vitest-environment happy-dom
/// <reference types="node" />
import { afterEach, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync('src/style.css', 'utf8')

afterEach(() => { document.head.innerHTML = ''; document.body.innerHTML = '' })

function luminance(color: string): number {
  const hex = color.trim().replace(/^#/, '')
  const rgb = color.startsWith('#')
    ? (hex.length === 3 ? [...hex].map(value => value + value).join('') : hex).match(/.{2}/g)!.map(value => parseInt(value, 16))
    : color.match(/[\d.]+/g)!.slice(0, 3).map(Number)
  const channels = rgb.map(value => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
}

it('keeps small muted text readable on the page and card surfaces', () => {
  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)
  const text = document.createElement('p')
  text.style.color = 'var(--text-muted)'
  document.body.append(text)
  for (const background of ['var(--field-paper)', 'var(--surface)']) {
    text.style.backgroundColor = background
    const computed = getComputedStyle(text)
    const foregroundLuminance = luminance(computed.color)
    const backgroundLuminance = luminance(computed.backgroundColor)
    const contrast = (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
    expect(contrast).toBeGreaterThanOrEqual(4.5)
  }
})
