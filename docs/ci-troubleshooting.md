# CI Troubleshooting Guide

## Current CI Status

**Latest Run**: https://github.com/AquaScopeApp/AquaScope/actions/runs/21798549706
**Status**: ❌ Failing (All 3 jobs)

### Failed Jobs:
1. ❌ Frontend Build
2. ❌ Backend Tests
3. ❌ Docker Build Test

## How to View Errors

### Option 1: GitHub Web Interface (Recommended)

1. Visit: https://github.com/AquaScopeApp/AquaScope/actions
2. Click on the latest failed run
3. Click on each failed job to see logs
4. Look for red "❌" marks and error messages

### Option 2: GitHub CLI

```bash
# Install gh CLI if not installed
# macOS: brew install gh
# Login
gh auth login

# View recent runs
gh run list --limit 5

# View specific run logs
gh run view 21798549706 --log

# View specific job logs
gh run view 21798549706 --job=62890066223 --log
```

## Common CI Issues & Fixes

### Issue 1: Missing Dependencies

**Symptoms**: Import errors, module not found

**Check**:
```bash
# Backend
cd backend
pip install -r requirements.txt
pytest tests/

# Frontend
cd frontend
npm install
npm run type-check
npm run build
```

**Fix**: Add missing packages to requirements.txt or package.json

### Issue 2: Environment Variables

**Symptoms**: Configuration errors, connection failures

**Check workflow env vars** in `.github/workflows/ci.yml`:
- DATABASE_URL
- SECRET_KEY
- ALGORITHM
- ACCESS_TOKEN_EXPIRE_MINUTES
- VITE_API_URL
- VITE_APP_VERSION

**Fix**: Ensure all required env vars are set in workflow

### Issue 3: Database Connection

**Symptoms**: PostgreSQL connection errors in backend tests

**Note**: Tests use SQLite in-memory (see `backend/tests/conftest.py`), so PostgreSQL service container is not actually needed for tests.

**Potential Fix**: Remove PostgreSQL service from workflow if not used

### Issue 4: Node.js/Python Version Mismatch

**Symptoms**: Syntax errors, incompatible features

**Check versions**:
- Workflow uses: Node 18, Python 3.11
- Local: Check with `node --version` and `python --version`

**Fix**: Match versions between local and CI

### Issue 5: Docker Build Context

**Symptoms**: COPY failed, file not found

**Check Dockerfile paths**:
```dockerfile
# Ensure these paths exist relative to context
COPY package.json .
COPY requirements.txt .
```

**Fix**: Verify all COPY paths exist in Docker context

## Debugging Steps

### Step 1: Test Locally

Run the local CI test script:
```bash
./scripts/test-ci-locally.sh
```

This will:
1. Run backend tests with pytest
2. Run frontend type-check and build
3. Build Docker images
4. Show exactly where failures occur

### Step 2: Check Specific Job Logs

**Frontend Build**:
- URL: https://github.com/AquaScopeApp/AquaScope/actions/runs/21798549706/job/62890066223
- Look for: npm install errors, TypeScript errors, Vite build errors

**Backend Tests**:
- URL: https://github.com/AquaScopeApp/AquaScope/actions/runs/21798549706/job/62890066227
- Look for: Import errors, test failures, database errors

**Docker Build**:
- URL: https://github.com/AquaScopeApp/AquaScope/actions/runs/21798549706/job/62890066225
- Look for: COPY errors, RUN command failures

### Step 3: Common Quick Fixes

```bash
# 1. Ensure all dependencies are installed locally
cd backend && pip install -r requirements.txt && cd ..
cd frontend && npm install && cd ..

# 2. Run tests locally
cd backend && pytest tests/ -v && cd ..
cd frontend && npm run type-check && npm run build && cd ..

# 3. If local tests pass but CI fails, check:
#    - .gitignore isn't excluding required files
#    - All files are committed
git status

# 4. If Docker builds fail, test locally:
docker build -t test-backend ./backend
docker build -t test-frontend ./frontend
```

## Simplified Workflow

If issues persist, here's a minimal CI workflow that should work:

```yaml
name: CI Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  backend-tests:
    name: Backend Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: |
          cd backend
          pip install -r requirements.txt
          pytest tests/ -v

  frontend-build:
    name: Frontend Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: |
          cd frontend
          npm install
          npm run type-check
          npm run build
```

## Getting Help

If you can't resolve the CI failures:

1. **Check the actual error logs** on GitHub Actions
2. **Run tests locally** with `./scripts/test-ci-locally.sh`
3. **Compare** local vs CI environment
4. **Post in Discussions**: https://github.com/AquaScopeApp/AquaScope/discussions
5. **Open an Issue**: https://github.com/AquaScopeApp/AquaScope/issues

## Next Steps

Once CI is passing:

1. Green checkmark (✅) will appear on commits
2. CI badge in README will show "passing"
3. Can merge PRs with confidence
4. Deploy automatically (if CD is set up)

---

**Tip**: Always test locally before pushing to catch issues early!
