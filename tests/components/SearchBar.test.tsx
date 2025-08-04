import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom';
import SearchBar from '../../app/components/SearchBar'

// Mock props for the SearchBar component
const mockProps = {
  onSearch: jest.fn(),
  selectedLanguage: 'en',
  value: '',
  onChange: jest.fn(),
}

describe('SearchBar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render search input with placeholder text', () => {
    render(<SearchBar {...mockProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search responses...')
    expect(searchInput).toBeInTheDocument()
  })

  it('should display the current value', () => {
    const propsWithValue = { ...mockProps, value: 'test query' }
    render(<SearchBar {...propsWithValue} />)
    
    const searchInput = screen.getByDisplayValue('test query')
    expect(searchInput).toBeInTheDocument()
  })

  it('should call onChange when user types', () => {
    render(<SearchBar {...mockProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search responses...')
    fireEvent.change(searchInput, { target: { value: 'new search' } })
    
    expect(mockProps.onChange).toHaveBeenCalledWith('new search')
  })

  it('should call onSearch after debounce delay', async () => {
    jest.useFakeTimers()
    
    render(<SearchBar {...mockProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search responses...')
    fireEvent.change(searchInput, { target: { value: 'debounced search' } })
    
    // onSearch should not be called immediately
    expect(mockProps.onSearch).not.toHaveBeenCalled()
    
    // Fast forward time by 200ms (the debounce delay)
    jest.advanceTimersByTime(200)
    
    await waitFor(() => {
      expect(mockProps.onSearch).toHaveBeenCalledWith('debounced search')
    })
    
    jest.useRealTimers()
  })

  it('should clear previous debounce timer when typing quickly', async () => {
    jest.useFakeTimers()
    
    render(<SearchBar {...mockProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search responses...')
    
    // Type first query
    fireEvent.change(searchInput, { target: { value: 'first' } })
    
    // Type second query before debounce completes
    jest.advanceTimersByTime(100) // Only advance 100ms
    fireEvent.change(searchInput, { target: { value: 'second' } })
    
    // Complete the debounce period
    jest.advanceTimersByTime(200)
    
    await waitFor(() => {
      // Should only be called once with the final value
      expect(mockProps.onSearch).toHaveBeenCalledTimes(1)
      expect(mockProps.onSearch).toHaveBeenCalledWith('second')
    })
    
    jest.useRealTimers()
  })

  it('should have proper accessibility attributes', () => {
    render(<SearchBar {...mockProps} />)
    
    const searchInput = screen.getByRole('textbox')
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('type', 'text')
  })

  it('should apply theme-aware styling classes', () => {
    render(<SearchBar {...mockProps} />)
    
    const container = screen.getByRole('textbox').parentElement
    expect(container).toHaveClass('bg-background')
    
    const searchInput = screen.getByRole('textbox')
    expect(searchInput).toHaveClass('bg-card', 'text-card-foreground')
  })
})