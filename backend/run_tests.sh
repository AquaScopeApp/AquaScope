#!/bin/bash
# Test runner script for AquaScope backend

set -e

echo "Running AquaScope Backend Tests..."
echo "================================"

# Run all tests with coverage
echo ""
echo "Running all tests with coverage..."
pytest

# Run only unit tests
echo ""
echo "To run only unit tests:"
echo "  pytest -m unit"

# Run only integration tests
echo ""
echo "To run only integration tests:"
echo "  pytest -m integration"

# Run specific test file
echo ""
echo "To run a specific test file:"
echo "  pytest tests/unit/test_security.py"

# Run tests in watch mode
echo ""
echo "To run tests in watch mode:"
echo "  pytest-watch"

echo ""
echo "Coverage report generated in htmlcov/index.html"
