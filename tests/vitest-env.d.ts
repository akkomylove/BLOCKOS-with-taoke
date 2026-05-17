import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare global {
  namespace Vi {
    interface Jest {
      fn: typeof vi.fn
    }
  }
}

expect.extend({} as TestingLibraryMatchers<ReturnType<() => HTMLElement>, void>)
