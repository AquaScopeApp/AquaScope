#!/bin/bash

# Test CI locally to debug failures
# This script mimics what GitHub Actions does

set -e

echo "🧪 Testing CI Pipeline Locally"
echo "==============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Backend Tests
echo -e "${YELLOW}Test 1: Backend Tests${NC}"
echo "-------------------"
cd backend

if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}✗ requirements.txt not found${NC}"
    exit 1
fi

echo "Installing backend dependencies..."
pip install -r requirements.txt > /dev/null 2>&1 || {
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
}

echo "Running pytest..."
pytest tests/ -v || {
    echo -e "${RED}✗ Backend tests failed${NC}"
    echo "Check backend test logs above for details"
    exit 1
}

echo -e "${GREEN}✓ Backend tests passed${NC}"
echo ""

cd ..

# Test 2: Frontend Type Check and Build
echo -e "${YELLOW}Test 2: Frontend Type Check and Build${NC}"
echo "-------------------------------------"
cd frontend

if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ package.json not found${NC}"
    exit 1
fi

echo "Installing frontend dependencies..."
npm install > /dev/null 2>&1 || {
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
}

echo "Running TypeScript type check..."
npm run type-check || {
    echo -e "${RED}✗ Type check failed${NC}"
    exit 1
}

echo "Building frontend..."
npm run build || {
    echo -e "${RED}✗ Frontend build failed${NC}"
    exit 1
}

echo -e "${GREEN}✓ Frontend type check and build passed${NC}"
echo ""

cd ..

# Test 3: Docker Build
echo -e "${YELLOW}Test 3: Docker Build${NC}"
echo "------------------"

echo "Building backend Docker image..."
docker build -t reeflab-backend-test backend/ || {
    echo -e "${RED}✗ Backend Docker build failed${NC}"
    exit 1
}

echo "Building frontend Docker image..."
docker build -t reeflab-frontend-test frontend/ || {
    echo -e "${RED}✗ Frontend Docker build failed${NC}"
    exit 1
}

echo -e "${GREEN}✓ Docker builds passed${NC}"
echo ""

# Cleanup
echo "Cleaning up test images..."
docker rmi reeflab-backend-test reeflab-frontend-test > /dev/null 2>&1 || true

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All CI tests passed locally! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "If these tests pass locally but fail in CI, check:"
echo "1. GitHub Actions workflow environment variables"
echo "2. PostgreSQL service container configuration"
echo "3. Node.js and Python versions in CI"
