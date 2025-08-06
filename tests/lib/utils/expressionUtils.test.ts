/**
 * @jest-environment node
 */

import { extractExpressions, hasExpressions } from '../../../lib/utils/expressionUtils'

describe('extractExpressions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('valid expression input with numbered lines', () => {
    it('should extract expressions from response with 1/ format', () => {
      // Arrange
      const response = '1/ Hello world\n2/ How are you?\n3/ Good morning'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual(['Hello world'])
    })

    it('should extract expressions from response with multiple 1/ entries', () => {
      // Arrange
      const response = '1/ First expression\n2/ Second line\n1/ Another first expression'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual(['First expression', 'Another first expression'])
    })

    it('should handle expressions with extra spaces after numbers', () => {
      // Arrange
      const response = '1/    Spaced expression\n2/  Another line\n3/   Third line'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual(['Spaced expression'])
    })

    it('should handle expressions up to 4 numbered items', () => {
      // Arrange
      const response = '1/ First\n2/ Second\n3/ Third\n4/ Fourth'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual(['First'])
    })
  })

  describe('input without valid numbers', () => {
    it('should return empty array when first line does not contain 1/', () => {
      // Arrange
      const response = '2/ Second line\n3/ Third line\n4/ Fourth line'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual([])
    })

    it('should return empty array when no numbered format is found', () => {
      // Arrange
      const response = 'Regular text without numbers\nAnother line\nThird line'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual([])
    })

    it('should return empty array when numbers are not in correct format', () => {
      // Arrange
      const response = '1. First with dot\n2. Second with dot\n3. Third with dot'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual([])
    })

    it('should return empty array when response has 5 or more numbered items', () => {
      // Arrange
      const response = '1/ First\n2/ Second\n3/ Third\n4/ Fourth\n5/ Fifth'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual([])
    })
  })

  describe('empty string input', () => {
    it('should return empty array for empty string', () => {
      // Arrange
      const response = ''
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual([])
    })

    it('should return empty array for whitespace-only string', () => {
      // Arrange
      const response = '   \n  \t  \n  '
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual([])
    })
  })

  describe('multiline expressions', () => {
    it('should extract single-line expressions correctly', () => {
      // Arrange
      const response = '1/ Single line expression\n2/ Another single line\n3/ Third line'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual(['Single line expression'])
    })

    it('should handle expressions with line breaks in content', () => {
      // Arrange
      const response = '1/ Multi\nline expression\n2/ Second line\n3/ Third line'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual(['Multi'])
    })

    it('should handle mixed formatting with newlines', () => {
      // Arrange
      const response = '1/ First expression\n\n2/ Second with gap\n3/ Third line'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual(['First expression'])
    })
  })

  describe('edge cases with special characters', () => {
    it('should handle expressions with special characters', () => {
      // Arrange
      const response = '1/ Expression with! @#$%^&*() special chars\n2/ Another line\n3/ Third'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual(['Expression with! @#$%^&*() special chars'])
    })

    it('should handle expressions with unicode characters', () => {
      // Arrange
      const response = '1/ こんにちは世界 (Hello World)\n2/ Second line\n3/ Third'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual(['こんにちは世界 (Hello World)'])
    })

    it('should handle expressions with emojis', () => {
      // Arrange
      const response = '1/ Hello 👋 World 🌍\n2/ Second line\n3/ Third'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual(['Hello 👋 World 🌍'])
    })

    it('should handle expressions with quotes and apostrophes', () => {
      // Arrange
      const response = '1/ "Hello" and \'world\' with quotes\n2/ Second line\n3/ Third'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual(['"Hello" and \'world\' with quotes'])
    })

    it('should handle mixed valid and empty expressions correctly', () => {
      // Arrange
      const response = '1/ Valid expression\n1/\n2/ Second line\n3/ Third line'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual(['Valid expression', '2/ Second line'])
    })
  })

  describe('boundary conditions', () => {
    it('should handle response with only 1/ line', () => {
      // Arrange
      const response = '1/ Only first line'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual(['Only first line'])
    })

    it('should handle response starting with 1/ and having exactly 4 items', () => {
      // Arrange
      const response = '1/ First\n2/ Second\n3/ Third\n4/ Fourth'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual(['First'])
    })

    it('should handle numbers higher than single digits', () => {
      // Arrange
      const response = '1/ First\n10/ Tenth\n2/ Second'
      
      // Act
      const result = extractExpressions(response)
      
      // Assert
      expect(result).toEqual(['First'])
    })
  })
})

describe('hasExpressions', () => {
  it('should return true when expressions are found', () => {
    // Arrange
    const response = '1/ Hello world\n2/ How are you?'
    
    // Act
    const result = hasExpressions(response)
    
    // Assert
    expect(result).toBe(true)
  })

  it('should return false when no expressions are found', () => {
    // Arrange
    const response = 'Regular text without expressions'
    
    // Act
    const result = hasExpressions(response)
    
    // Assert
    expect(result).toBe(false)
  })

  it('should return false for empty string', () => {
    // Arrange
    const response = ''
    
    // Act
    const result = hasExpressions(response)
    
    // Assert
    expect(result).toBe(false)
  })
})