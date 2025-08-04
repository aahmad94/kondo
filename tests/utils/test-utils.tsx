import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '../../app/contexts/ThemeContext'

// Mock session for testing
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  },
  userId: 'test-user-id',
  expires: '2030-01-01',
}

// Create a wrapper with all necessary providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider session={mockSession}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
}

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Common test data
export const testData = {
  mockUser: {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    theme: 'light' as const,
  },
  mockBookmark: {
    id: '1',
    title: 'Test Bookmark',
    userId: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  mockGPTResponse: {
    id: '1',
    content: 'Test response content',
    userId: '1',
    language: 'en',
    rank: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}