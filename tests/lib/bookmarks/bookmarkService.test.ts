/**
 * @jest-environment node
 */

// Set up environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Mock the dependencies - note the order: mocks must come before imports that use them
jest.mock('../../../lib/database/prisma', () => ({
  __esModule: true,
  default: {
    bookmark: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
    gPTResponse: {
      deleteMany: jest.fn(),
    },
  },
}))

jest.mock('../../../lib/user/languageService', () => ({
  getUserLanguageId: jest.fn(),
}))

// Import the mocked functions after mocking
import {
  getBookmarks,
  createBookmark,
  deleteBookmark,
  deleteGptResponse,
  checkBookmarkExists,
} from '../../../lib/bookmarks/bookmarkService'
import prisma from '../../../lib/database/prisma'
import { getUserLanguageId } from '../../../lib/user/languageService'

// Type the mocked functions for better TypeScript support
const mockPrisma = jest.mocked(prisma)
const mockGetUserLanguageId = jest.mocked(getUserLanguageId)

describe('bookmarkService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getBookmarks', () => {
    it('should successfully return bookmarks for authenticated user', async () => {
      // Arrange
      const userId = 'user-123'
      const languageId = 'ja'
      const mockBookmarks = [
        {
          id: 'bookmark-1',
          title: 'Test Bookmark 1',
          userId,
          languageId,
          isReserved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'bookmark-2',
          title: 'Test Bookmark 2',
          userId,
          languageId,
          isReserved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockGetUserLanguageId.mockResolvedValue(languageId)
      mockPrisma.bookmark.findMany.mockResolvedValue(mockBookmarks)

      // Act
      const result = await getBookmarks(userId)

      // Assert
      expect(result).toEqual(mockBookmarks)
      expect(mockGetUserLanguageId).toHaveBeenCalledWith(userId)
      expect(mockPrisma.bookmark.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          languageId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    })

    it('should return empty array when user has no bookmarks', async () => {
      // Arrange
      const userId = 'user-123'
      const languageId = 'ja'

      mockGetUserLanguageId.mockResolvedValue(languageId)
      mockPrisma.bookmark.findMany.mockResolvedValue([])

      // Act
      const result = await getBookmarks(userId)

      // Assert
      expect(result).toEqual([])
      expect(mockGetUserLanguageId).toHaveBeenCalledWith(userId)
      expect(mockPrisma.bookmark.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          languageId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const userId = 'user-123'
      const languageId = 'ja'
      const dbError = new Error('Database connection failed')

      mockGetUserLanguageId.mockResolvedValue(languageId)
      mockPrisma.bookmark.findMany.mockRejectedValue(dbError)

      // Act & Assert
      await expect(getBookmarks(userId)).rejects.toThrow('Database connection failed')
      expect(mockGetUserLanguageId).toHaveBeenCalledWith(userId)
      expect(mockPrisma.bookmark.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          languageId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    })

    it('should handle getUserLanguageId errors gracefully', async () => {
      // Arrange
      const userId = 'user-123'
      const langError = new Error('Failed to get user language')

      mockGetUserLanguageId.mockRejectedValue(langError)

      // Act & Assert
      await expect(getBookmarks(userId)).rejects.toThrow('Failed to get user language')
      expect(mockGetUserLanguageId).toHaveBeenCalledWith(userId)
      expect(mockPrisma.bookmark.findMany).not.toHaveBeenCalled()
    })
  })

  describe('createBookmark', () => {
    it('should successfully create a new bookmark', async () => {
      // Arrange
      const userId = 'user-123'
      const title = 'New Bookmark'
      const languageId = 'ja'
      const mockNewBookmark = {
        id: 'bookmark-new',
        title,
        userId,
        languageId,
        isReserved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.bookmark.create.mockResolvedValue(mockNewBookmark)

      // Act
      const result = await createBookmark(userId, title, languageId)

      // Assert
      expect(result).toEqual(mockNewBookmark)
      expect(mockPrisma.bookmark.create).toHaveBeenCalledWith({
        data: {
          title,
          user: {
            connect: { id: userId },
          },
          language: {
            connect: { id: languageId },
          },
        },
      })
    })

    it('should handle database errors during creation', async () => {
      // Arrange
      const userId = 'user-123'
      const title = 'New Bookmark'
      const languageId = 'ja'
      const dbError = new Error('Foreign key constraint failed')

      mockPrisma.bookmark.create.mockRejectedValue(dbError)

      // Act & Assert
      await expect(createBookmark(userId, title, languageId)).rejects.toThrow(
        'Foreign key constraint failed'
      )
      expect(mockPrisma.bookmark.create).toHaveBeenCalledWith({
        data: {
          title,
          user: {
            connect: { id: userId },
          },
          language: {
            connect: { id: languageId },
          },
        },
      })
    })

    it('should handle unique constraint violations (duplicate titles)', async () => {
      // Arrange
      const userId = 'user-123'
      const title = 'Existing Bookmark'
      const languageId = 'ja'
      const uniqueConstraintError = new Error('Unique constraint failed on the fields: (`userId`,`title`,`languageId`)')

      mockPrisma.bookmark.create.mockRejectedValue(uniqueConstraintError)

      // Act & Assert
      await expect(createBookmark(userId, title, languageId)).rejects.toThrow(
        'Unique constraint failed on the fields: (`userId`,`title`,`languageId`)'
      )
    })

    it('should handle invalid user ID', async () => {
      // Arrange
      const userId = 'invalid-user'
      const title = 'New Bookmark'
      const languageId = 'ja'
      const userNotFoundError = new Error('Foreign key constraint failed on the field: `userId`')

      mockPrisma.bookmark.create.mockRejectedValue(userNotFoundError)

      // Act & Assert
      await expect(createBookmark(userId, title, languageId)).rejects.toThrow(
        'Foreign key constraint failed on the field: `userId`'
      )
    })

    it('should handle invalid language ID', async () => {
      // Arrange
      const userId = 'user-123'
      const title = 'New Bookmark'
      const languageId = 'invalid-lang'
      const langNotFoundError = new Error('Foreign key constraint failed on the field: `languageId`')

      mockPrisma.bookmark.create.mockRejectedValue(langNotFoundError)

      // Act & Assert
      await expect(createBookmark(userId, title, languageId)).rejects.toThrow(
        'Foreign key constraint failed on the field: `languageId`'
      )
    })
  })

  describe('deleteBookmark', () => {
    it('should successfully delete a bookmark and its associated responses', async () => {
      // Arrange
      const userId = 'user-123'
      const bookmarkId = 'bookmark-1'
      const mockDeletedResponses = { count: 2 }
      const mockDeletedBookmark = { count: 1 }

      mockPrisma.gPTResponse.deleteMany.mockResolvedValue(mockDeletedResponses)
      mockPrisma.bookmark.deleteMany.mockResolvedValue(mockDeletedBookmark)

      // Act
      const result = await deleteBookmark(userId, bookmarkId)

      // Assert
      expect(result).toEqual(mockDeletedBookmark)
      expect(mockPrisma.gPTResponse.deleteMany).toHaveBeenCalledWith({
        where: {
          bookmarks: {
            some: {
              id: bookmarkId,
              userId,
            },
          },
        },
      })
      expect(mockPrisma.bookmark.deleteMany).toHaveBeenCalledWith({
        where: {
          id: bookmarkId,
          userId,
        },
      })
    })

    it('should handle unauthorized access (user trying to delete another user\'s bookmark)', async () => {
      // Arrange
      const userId = 'user-123'
      const bookmarkId = 'bookmark-456'
      const mockDeletedResponses = { count: 0 }
      const mockDeletedBookmark = { count: 0 } // No bookmark deleted because it doesn't belong to user

      mockPrisma.gPTResponse.deleteMany.mockResolvedValue(mockDeletedResponses)
      mockPrisma.bookmark.deleteMany.mockResolvedValue(mockDeletedBookmark)

      // Act
      const result = await deleteBookmark(userId, bookmarkId)

      // Assert
      expect(result).toEqual(mockDeletedBookmark)
      expect(result.count).toBe(0) // Indicates no bookmark was actually deleted
    })

    it('should handle non-existent bookmark ID', async () => {
      // Arrange
      const userId = 'user-123'
      const bookmarkId = 'non-existent'
      const mockDeletedResponses = { count: 0 }
      const mockDeletedBookmark = { count: 0 }

      mockPrisma.gPTResponse.deleteMany.mockResolvedValue(mockDeletedResponses)
      mockPrisma.bookmark.deleteMany.mockResolvedValue(mockDeletedBookmark)

      // Act
      const result = await deleteBookmark(userId, bookmarkId)

      // Assert
      expect(result).toEqual(mockDeletedBookmark)
      expect(result.count).toBe(0)
    })

    it('should handle database errors during deletion', async () => {
      // Arrange
      const userId = 'user-123'
      const bookmarkId = 'bookmark-1'
      const dbError = new Error('Database connection lost')

      mockPrisma.gPTResponse.deleteMany.mockRejectedValue(dbError)

      // Act & Assert
      await expect(deleteBookmark(userId, bookmarkId)).rejects.toThrow('Database connection lost')
      expect(mockPrisma.gPTResponse.deleteMany).toHaveBeenCalledWith({
        where: {
          bookmarks: {
            some: {
              id: bookmarkId,
              userId,
            },
          },
        },
      })
      expect(mockPrisma.bookmark.deleteMany).not.toHaveBeenCalled()
    })

    it('should handle errors during bookmark deletion even if response deletion succeeds', async () => {
      // Arrange
      const userId = 'user-123'
      const bookmarkId = 'bookmark-1'
      const mockDeletedResponses = { count: 1 }
      const dbError = new Error('Bookmark deletion failed')

      mockPrisma.gPTResponse.deleteMany.mockResolvedValue(mockDeletedResponses)
      mockPrisma.bookmark.deleteMany.mockRejectedValue(dbError)

      // Act & Assert
      await expect(deleteBookmark(userId, bookmarkId)).rejects.toThrow('Bookmark deletion failed')
      expect(mockPrisma.gPTResponse.deleteMany).toHaveBeenCalled()
      expect(mockPrisma.bookmark.deleteMany).toHaveBeenCalled()
    })
  })

  describe('deleteGptResponse', () => {
    it('should successfully delete a GPT response and disconnect from bookmark', async () => {
      // Arrange
      const userId = 'user-123'
      const gptResponseId = 'response-1'
      const bookmarkId = 'bookmark-1'
      const mockUpdatedBookmark = {
        id: bookmarkId,
        title: 'Test Bookmark',
        userId,
        languageId: 'ja',
        isReserved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockDeletedResponse = { count: 1 }

      mockPrisma.bookmark.update.mockResolvedValue(mockUpdatedBookmark)
      mockPrisma.gPTResponse.deleteMany.mockResolvedValue(mockDeletedResponse)

      // Act
      const result = await deleteGptResponse(userId, gptResponseId, bookmarkId)

      // Assert
      expect(result).toEqual(mockDeletedResponse)
      expect(mockPrisma.bookmark.update).toHaveBeenCalledWith({
        where: {
          id: bookmarkId,
          userId,
        },
        data: {
          responses: {
            disconnect: {
              id: gptResponseId,
            },
          },
          updatedAt: expect.any(Date),
        },
      })
      expect(mockPrisma.gPTResponse.deleteMany).toHaveBeenCalledWith({
        where: {
          id: gptResponseId,
          userId,
        },
      })
    })

    it('should handle unauthorized access to bookmark', async () => {
      // Arrange
      const userId = 'user-123'
      const gptResponseId = 'response-1'
      const bookmarkId = 'bookmark-456' // Doesn't belong to user
      const unauthorizedError = new Error('Record to update not found.')

      mockPrisma.bookmark.update.mockRejectedValue(unauthorizedError)

      // Act & Assert
      await expect(deleteGptResponse(userId, gptResponseId, bookmarkId)).rejects.toThrow(
        'Record to update not found.'
      )
      expect(mockPrisma.gPTResponse.deleteMany).not.toHaveBeenCalled()
    })

    it('should handle non-existent GPT response', async () => {
      // Arrange
      const userId = 'user-123'
      const gptResponseId = 'non-existent-response'
      const bookmarkId = 'bookmark-1'
      const mockUpdatedBookmark = {
        id: bookmarkId,
        title: 'Test Bookmark',
        userId,
        languageId: 'ja',
        isReserved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockDeletedResponse = { count: 0 } // No response deleted

      mockPrisma.bookmark.update.mockResolvedValue(mockUpdatedBookmark)
      mockPrisma.gPTResponse.deleteMany.mockResolvedValue(mockDeletedResponse)

      // Act
      const result = await deleteGptResponse(userId, gptResponseId, bookmarkId)

      // Assert
      expect(result).toEqual(mockDeletedResponse)
      expect(result.count).toBe(0)
    })

    it('should handle database errors during response deletion', async () => {
      // Arrange
      const userId = 'user-123'
      const gptResponseId = 'response-1'
      const bookmarkId = 'bookmark-1'
      const mockUpdatedBookmark = {
        id: bookmarkId,
        title: 'Test Bookmark',
        userId,
        languageId: 'ja',
        isReserved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const dbError = new Error('Response deletion failed')

      mockPrisma.bookmark.update.mockResolvedValue(mockUpdatedBookmark)
      mockPrisma.gPTResponse.deleteMany.mockRejectedValue(dbError)

      // Act & Assert
      await expect(deleteGptResponse(userId, gptResponseId, bookmarkId)).rejects.toThrow(
        'Response deletion failed'
      )
      expect(mockPrisma.bookmark.update).toHaveBeenCalled()
      expect(mockPrisma.gPTResponse.deleteMany).toHaveBeenCalled()
    })
  })

  describe('checkBookmarkExists', () => {
    it('should return true when bookmark exists', async () => {
      // Arrange
      const userId = 'user-123'
      const title = 'Existing Bookmark'
      const languageId = 'ja'
      const mockBookmark = {
        id: 'bookmark-1',
        title,
        userId,
        languageId,
        isReserved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.bookmark.findFirst.mockResolvedValue(mockBookmark)

      // Act
      const result = await checkBookmarkExists(userId, title, languageId)

      // Assert
      expect(result).toBe(true)
      expect(mockPrisma.bookmark.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          title,
          language: {
            id: languageId,
          },
        },
      })
    })

    it('should return false when bookmark does not exist', async () => {
      // Arrange
      const userId = 'user-123'
      const title = 'Non-existent Bookmark'
      const languageId = 'ja'

      mockPrisma.bookmark.findFirst.mockResolvedValue(null)

      // Act
      const result = await checkBookmarkExists(userId, title, languageId)

      // Assert
      expect(result).toBe(false)
      expect(mockPrisma.bookmark.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          title,
          language: {
            id: languageId,
          },
        },
      })
    })

    it('should handle database errors during check', async () => {
      // Arrange
      const userId = 'user-123'
      const title = 'Some Bookmark'
      const languageId = 'ja'
      const dbError = new Error('Database query failed')

      mockPrisma.bookmark.findFirst.mockRejectedValue(dbError)

      // Act & Assert
      await expect(checkBookmarkExists(userId, title, languageId)).rejects.toThrow(
        'Database query failed'
      )
    })
  })

  describe('User Authentication Scenarios', () => {
    it('should handle null or undefined userId for getBookmarks', async () => {
      // Arrange
      const userId = null as any
      const languageId = 'ja'

      mockGetUserLanguageId.mockResolvedValue(languageId)
      mockPrisma.bookmark.findMany.mockResolvedValue([])

      // Act
      const result = await getBookmarks(userId)

      // Assert
      expect(result).toEqual([])
      expect(mockPrisma.bookmark.findMany).toHaveBeenCalledWith({
        where: {
          userId: null,
          languageId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    })

    it('should handle empty string userId for createBookmark', async () => {
      // Arrange
      const userId = ''
      const title = 'New Bookmark'
      const languageId = 'ja'
      const validationError = new Error('Invalid userId provided')

      mockPrisma.bookmark.create.mockRejectedValue(validationError)

      // Act & Assert
      await expect(createBookmark(userId, title, languageId)).rejects.toThrow('Invalid userId provided')
    })

    it('should handle malformed userId for deleteBookmark', async () => {
      // Arrange
      const userId = 'invalid-format-user-id-123456789'
      const bookmarkId = 'bookmark-1'
      const mockDeletedResponses = { count: 0 }
      const mockDeletedBookmark = { count: 0 }

      mockPrisma.gPTResponse.deleteMany.mockResolvedValue(mockDeletedResponses)
      mockPrisma.bookmark.deleteMany.mockResolvedValue(mockDeletedBookmark)

      // Act
      const result = await deleteBookmark(userId, bookmarkId)

      // Assert
      expect(result.count).toBe(0) // Should not delete anything for malformed ID
    })

    it('should handle user session timeout during operations', async () => {
      // Arrange
      const userId = 'user-123'
      const title = 'Test Bookmark'
      const languageId = 'ja'
      const sessionError = new Error('User session has expired')

      mockPrisma.bookmark.create.mockRejectedValue(sessionError)

      // Act & Assert
      await expect(createBookmark(userId, title, languageId)).rejects.toThrow('User session has expired')
    })
  })
})