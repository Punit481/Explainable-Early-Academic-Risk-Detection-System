import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

// Recharts' ResponsiveContainer needs ResizeObserver, which jsdom doesn't have
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
