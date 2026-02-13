# Testing Guide for ReefLab

This document provides comprehensive information about testing in the ReefLab application.

## Table of Contents

- [Overview](#overview)
- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [Running Tests in Docker](#running-tests-in-docker)
- [Continuous Integration](#continuous-integration)
- [Writing Tests](#writing-tests)

## Overview

ReefLab uses a comprehensive testing strategy that includes:

- **Unit Tests**: Test individual functions, classes, and components in isolation
- **Integration Tests**: Test how different parts of the system work together
- **Test Coverage**: Track which parts of the code are tested

### Test Statistics

- **Backend**: Pytest with SQLAlchemy fixtures
- **Frontend**: Vitest with React Testing Library
- **Coverage Target**: 80%+ for critical paths

## Backend Testing

### Technology Stack

- **pytest**: Testing framework
- **pytest-asyncio**: Async test support
- **pytest-cov**: Coverage reporting
- **pytest-mock**: Mocking utilities
- **faker**: Test data generation
- **httpx**: TestClient for FastAPI

### Running Backend Tests

```bash
cd backend

# Install test dependencies (if not already installed)
pip install -r requirements.txt

# Run all tests
pytest

# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Run with coverage report
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/unit/test_security.py

# Run specific test class
pytest tests/unit/test_security.py::TestPasswordHashing

# Run specific test
pytest tests/unit/test_security.py::TestPasswordHashing::test_password_hash_and_verify

# Run tests in verbose mode
pytest -v

# Run tests and stop on first failure
pytest -x

# Run using the test script
./run_tests.sh
```

### Backend Test Structure

```
backend/tests/
├── conftest.py              # Pytest fixtures and configuration
├── unit/                    # Unit tests
│   ├── test_security.py    # Security function tests
│   └── test_models.py      # Database model tests
└── integration/            # Integration tests
    ├── test_auth.py        # Authentication endpoint tests
    ├── test_tanks.py       # Tanks API tests
    └── test_notes.py       # Notes API tests
```

### Backend Test Fixtures

Available fixtures in `conftest.py`:

- `db_session`: Fresh database session for each test (SQLite in-memory)
- `client`: FastAPI TestClient
- `fake`: Faker instance for generating test data
- `test_user`: Pre-created test user
- `test_user_token`: JWT token for test user
- `authenticated_client`: TestClient with authentication header
- `test_user_credentials`: Standard test credentials

### Example Backend Test

```python
import pytest

@pytest.mark.integration
class TestTanksAPI:
    def test_create_tank(self, authenticated_client):
        """Test creating a new tank"""
        response = authenticated_client.post(
            "/api/v1/tanks",
            json={
                "name": "Main Display Tank",
                "volume_liters": 200.0,
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Main Display Tank"
        assert "id" in data
```

### Backend Coverage Report

After running tests with coverage, open the HTML report:

```bash
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
start htmlcov/index.html  # Windows
```

## Frontend Testing

### Technology Stack

- **Vitest**: Fast test runner powered by Vite
- **React Testing Library**: Component testing utilities
- **@testing-library/jest-dom**: DOM matchers
- **@testing-library/user-event**: User interaction simulation
- **jsdom**: Browser environment simulation

### Running Frontend Tests

```bash
cd frontend

# Install dependencies (if not already installed)
npm install

# Run all tests
npm test

# Run tests in watch mode (interactive)
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/hooks/__tests__/useAuth.test.tsx

# Run tests matching a pattern
npm test -- --grep="Login"
```

### Frontend Test Structure

```
frontend/src/
├── test/
│   ├── setup.ts           # Test environment setup
│   └── test-utils.tsx     # Custom render functions and utilities
├── api/__tests__/
│   └── client.test.ts     # API client tests
├── hooks/__tests__/
│   └── useAuth.test.tsx   # useAuth hook tests
└── pages/__tests__/
    ├── Login.test.tsx     # Login component tests
    └── Register.test.tsx  # Register component tests
```

### Frontend Test Utilities

Custom utilities in `test-utils.tsx`:

- `renderWithProviders`: Renders components with Router and Auth providers
- `mockLocalStorage`: Mock localStorage for tests
- Re-exports from `@testing-library/react`
- `userEvent`: For simulating user interactions

### Example Frontend Test

```typescript
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '../../test/test-utils'
import Login from '../Login'

describe('Login Component', () => {
  it('renders login form', () => {
    renderWithProviders(<Login />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('submits form with valid credentials', async () => {
    renderWithProviders(<Login />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // Add assertions for expected behavior
  })
})
```

### Frontend Coverage Report

After running tests with coverage, view the report:

```bash
# HTML report
open coverage/index.html  # macOS

# Terminal report
npm run test:coverage
```

## Running Tests in Docker

### Backend Tests in Docker

```bash
# Run tests in the backend container
docker compose exec backend pytest

# Run with coverage
docker compose exec backend pytest --cov=app --cov-report=term-missing

# Run specific tests
docker compose exec backend pytest tests/unit/test_security.py
```

### Frontend Tests in Docker

Frontend tests are typically run during development on the host machine, but you can run them in a container:

```bash
# Build and run tests in a temporary container
docker compose run --rm frontend npm test
```

## Continuous Integration

### GitHub Actions (Example)

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: |
          cd frontend
          npm install
      - name: Run tests
        run: |
          cd frontend
          npm run test:coverage
```

## Writing Tests

### Backend Test Guidelines

1. **Use Descriptive Names**: Test names should describe what they test
   ```python
   def test_user_can_create_tank_with_valid_data():
   ```

2. **Follow AAA Pattern**: Arrange, Act, Assert
   ```python
   def test_example(authenticated_client):
       # Arrange
       data = {"name": "Test Tank"}

       # Act
       response = authenticated_client.post("/api/v1/tanks", json=data)

       # Assert
       assert response.status_code == 200
   ```

3. **Use Markers**: Mark tests as unit or integration
   ```python
   @pytest.mark.unit
   def test_password_hashing():
       pass
   ```

4. **Test Edge Cases**: Include tests for error conditions
   ```python
   def test_create_tank_with_invalid_data(authenticated_client):
       response = authenticated_client.post("/api/v1/tanks", json={})
       assert response.status_code == 422
   ```

### Frontend Test Guidelines

1. **Test User Behavior**: Focus on what users see and do
   ```typescript
   it('allows user to login', async () => {
     const user = userEvent.setup()
     renderWithProviders(<Login />)

     await user.type(screen.getByLabelText(/email/i), 'test@example.com')
     await user.click(screen.getByRole('button', { name: /sign in/i }))
   })
   ```

2. **Use Accessible Queries**: Prefer queries that reflect how users interact
   ```typescript
   // Good
   screen.getByRole('button', { name: /submit/i })
   screen.getByLabelText(/email/i)

   // Avoid
   screen.getByTestId('submit-button')
   ```

3. **Mock External Dependencies**: Mock API calls and external services
   ```typescript
   vi.mock('../../api/client', () => ({
     authApi: {
       login: vi.fn(),
     },
   }))
   ```

4. **Test Error States**: Verify error handling
   ```typescript
   it('shows error on failed login', async () => {
     vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid'))
     // ... test error message appears
   })
   ```

## Test Coverage Goals

### Backend Coverage Targets

- **Overall**: 80%+
- **Critical Paths** (auth, security): 95%+
- **Models**: 90%+
- **API Endpoints**: 85%+

### Frontend Coverage Targets

- **Overall**: 75%+
- **Authentication**: 90%+
- **Core Components**: 80%+
- **Utility Functions**: 85%+

## Troubleshooting

### Common Issues

1. **Import Errors**
   ```bash
   # Backend: Ensure PYTHONPATH is set
   export PYTHONPATH=/app

   # Frontend: Clear cache
   npm test -- --clearCache
   ```

2. **Database Errors**
   ```bash
   # Backend: Tests use in-memory SQLite, no setup needed
   # If issues persist, check conftest.py fixtures
   ```

3. **Async Test Failures**
   ```python
   # Use pytest-asyncio
   @pytest.mark.asyncio
   async def test_async_function():
       result = await async_function()
       assert result == expected
   ```

4. **React Component Not Rendering**
   ```typescript
   // Ensure proper providers
   renderWithProviders(<Component />)
   // Not just: render(<Component />)
   ```

## Best Practices

1. **Keep Tests Isolated**: Each test should be independent
2. **Use Factories/Fixtures**: Don't repeat setup code
3. **Test Behavior, Not Implementation**: Focus on what, not how
4. **Mock External Services**: Don't make real API calls
5. **Run Tests Frequently**: During development
6. **Maintain Tests**: Update tests when code changes
7. **Review Coverage**: Aim for high coverage of critical paths

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://testingjavascript.com/)
