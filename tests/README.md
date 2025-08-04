# Testing Setup for Kondo

This directory contains unit and integration tests for the Kondo application.

## Test Structure

```
tests/
├── actions/           # Server Action tests
├── components/        # React component tests  
├── utils/            # Test utilities and helpers
└── README.md         # This file
```

## Dependencies Required

You'll need to install these dependencies manually:

```bash
npm install --save-dev @testing-library/jest-dom @testing-library/react @testing-library/user-event jest-environment-jsdom @types/jest
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/actions/theme.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should successfully update"
```

## Test Categories

### Server Action Tests (`tests/actions/`)
- Test Next.js Server Actions in Node environment
- Mock external dependencies (database, auth)
- Focus on business logic and error handling

### Component Tests (`tests/components/`)
- Test React components in JSDOM environment
- Use Testing Library for user interaction simulation
- Include accessibility and theme testing

### Test Utilities (`tests/utils/`)
- Custom render function with providers
- Common test data and mocks
- Shared testing helpers

## Testing Patterns

### Server Actions
```typescript
/**
 * @jest-environment node
 */
import { myServerAction } from '../../app/actions/myAction'

// Mock dependencies
jest.mock('../../lib/userService')

describe('myServerAction', () => {
  it('should handle success case', async () => {
    // Arrange, Act, Assert
  })
})
```

### React Components
```typescript
import { render, screen } from '../utils/test-utils'
import MyComponent from '../../app/components/MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

## Mocking Strategy

- **External APIs**: Mock fetch calls and API responses
- **Database**: Mock Prisma client and service functions  
- **Authentication**: Mock NextAuth session state
- **LocalStorage**: Mocked in jest.setup.js
- **Next.js Router**: Mocked with next-router-mock

## Coverage Goals

- **Server Actions**: 100% coverage (critical business logic)
- **Components**: Focus on user interactions and edge cases
- **Utils/Services**: High coverage for shared logic

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Main branch pushes
- Pre-deployment builds

## Writing Good Tests

1. **Arrange, Act, Assert** pattern
2. **Descriptive test names** that explain the scenario
3. **Mock external dependencies** to isolate units
4. **Test error cases** as well as happy paths
5. **Use Testing Library queries** for accessibility-focused testing