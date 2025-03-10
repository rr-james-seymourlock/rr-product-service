import { describe, it, expect, vi } from 'vitest'
import { extractIdsFromUrlComponents } from '@/extractIdsFromUrlComponents'

vi.mock('@/storeConfigs/storeConfigManager')

describe('extractIdsFromUrlComponents', () => {
  it('should return empty array for missing pathname input', () => {
    const urlComponents = { href: '', pathname: '', search: '', domain: 'example.com', hostname: '' }
    const result = extractIdsFromUrlComponents({ urlComponents })
    expect(result).toEqual([])
  })

  it('should return empty array for null pathname input', () => {
    const urlComponents = { href: '', pathname: null as any, search: '', domain: 'example.com', hostname: '' }
    const result = extractIdsFromUrlComponents({ urlComponents })
    expect(result).toEqual([])
  })

  it('should return empty array for missing domain input', () => {
    const urlComponents = { href: '', pathname: '', search: '', domain: '', hostname: '' }
    const result = extractIdsFromUrlComponents({ urlComponents })
    expect(result).toEqual([])
  })

  it('should return empty array for invalid domain input', () => {
    const urlComponents = { href: '', pathname: '', search: '', domain: null as any, hostname: '' }
    const result = extractIdsFromUrlComponents({ urlComponents })
    expect(result).toEqual([])
  })

  it('should return ids for invalid domain input', () => {
    const urlComponents = { href: '', pathname: '/prd-123456', search: '', domain: null as any, hostname: '' }
    const result = extractIdsFromUrlComponents({ urlComponents })
    expect(result).toEqual(['123456', 'prd-123456'])
  })

  it('should return frozen array', () => {
    const urlComponents = {
      href: 'https://example.com/product/123456',
      pathname: '/product/123456',
      search: '',
      domain: 'example.com',
      hostname: ''
    }

    const result = extractIdsFromUrlComponents({ urlComponents })

    expect(Object.isFrozen(result)).toBe(true)
  })
})
