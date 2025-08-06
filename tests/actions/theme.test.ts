/**
 * @jest-environment node
 */

// Set up environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

import { updateUserThemeAction } from '../../app/actions/theme'
import { getServerSession } from 'next-auth'

// Mock the dependencies - note the order: mocks must come before imports that use them
jest.mock('../../lib/user', () => ({
  updateUserTheme: jest.fn()
}))
jest.mock('../../pages/api/auth/[...nextauth]', () => ({
  authOptions: {}
}))
jest.mock('next-auth')

// Import the mocked function after mocking
import { updateUserTheme } from '@/lib/user'

const mockUpdateUserTheme = updateUserTheme as jest.MockedFunction<typeof updateUserTheme>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('updateUserThemeAction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully update user theme when authenticated', async () => {
    // Arrange
    const mockSession = {
      user: {
        email: 'test@example.com',
        name: 'Test User',
      },
    }
    
    mockGetServerSession.mockResolvedValue(mockSession)
    mockUpdateUserTheme.mockResolvedValue('dark')

    // Act
    const result = await updateUserThemeAction('dark')

    // Assert
    expect(result).toEqual({
      success: true,
      theme: 'dark',
      message: 'Theme updated successfully',
    })
    
    expect(mockGetServerSession).toHaveBeenCalledTimes(1)
    expect(mockUpdateUserTheme).toHaveBeenCalledWith('test@example.com', 'dark')
  })

  it('should return error when user is not authenticated', async () => {
    // Arrange
    mockGetServerSession.mockResolvedValue(null)

    // Act
    const result = await updateUserThemeAction('dark')

    // Assert
    expect(result).toEqual({
      success: false,
      error: 'Unauthorized: No user session found',
    })
    
    expect(mockGetServerSession).toHaveBeenCalledTimes(1)
    expect(mockUpdateUserTheme).not.toHaveBeenCalled()
  })

  it('should return error when session has no email', async () => {
    // Arrange
    const mockSession = {
      user: {
        name: 'Test User',
        // No email property
      },
    }
    
    mockGetServerSession.mockResolvedValue(mockSession)

    // Act
    const result = await updateUserThemeAction('light')

    // Assert
    expect(result).toEqual({
      success: false,
      error: 'Unauthorized: No user session found',
    })
    
    expect(mockUpdateUserTheme).not.toHaveBeenCalled()
  })

  it('should handle database errors gracefully', async () => {
    // Arrange
    const mockSession = {
      user: {
        email: 'test@example.com',
        name: 'Test User',
      },
    }
    
    mockGetServerSession.mockResolvedValue(mockSession)
    mockUpdateUserTheme.mockRejectedValue(new Error('Database connection failed'))

    // Act
    const result = await updateUserThemeAction('light')

    // Assert
    expect(result).toEqual({
      success: false,
      error: 'Database connection failed',
    })
    
    expect(mockUpdateUserTheme).toHaveBeenCalledWith('test@example.com', 'light')
  })

  it('should handle unknown errors gracefully', async () => {
    // Arrange
    const mockSession = {
      user: {
        email: 'test@example.com',
        name: 'Test User',
      },
    }
    
    mockGetServerSession.mockResolvedValue(mockSession)
    mockUpdateUserTheme.mockRejectedValue('Unknown error')

    // Act
    const result = await updateUserThemeAction('dark')

    // Assert
    expect(result).toEqual({
      success: false,
      error: 'Failed to update theme',
    })
  })

  it('should accept both light and dark theme values', async () => {
    // Arrange
    const mockSession = {
      user: {
        email: 'test@example.com',
        name: 'Test User',
      },
    }
    
    mockGetServerSession.mockResolvedValue(mockSession)
    
    // Test light theme
    mockUpdateUserTheme.mockResolvedValueOnce('light')
    const lightResult = await updateUserThemeAction('light')
    
    expect(lightResult.success).toBe(true)
    expect(lightResult.theme).toBe('light')
    
    // Test dark theme
    mockUpdateUserTheme.mockResolvedValueOnce('dark')
    const darkResult = await updateUserThemeAction('dark')
    
    expect(darkResult.success).toBe(true)
    expect(darkResult.theme).toBe('dark')
  })
})