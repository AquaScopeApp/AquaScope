# Test Coverage Report

**Date:** 2026-02-12
**Framework:** Vitest + React Testing Library
**Coverage provider:** v8

## Summary

| Metric     | Value  |
|------------|--------|
| Test Files | 33     |
| Tests      | 402    |
| All Pass   | Yes    |
| Duration   | ~3.5s  |

### Overall Coverage

| % Stmts | % Branch | % Funcs | % Lines |
|---------|----------|---------|---------|
| 32.51   | 71.36    | 31.01   | 32.51   |

## Test Files

### Components (`src/components/__tests__/`)

| File                          | Tests |
|-------------------------------|-------|
| BannerEditor.test.tsx         | 26    |
| DefaultTankAnimation.test.tsx | 5     |
| Footer.test.tsx               | 3     |
| LanguageSelector.test.tsx     | 9     |
| LivestockCard.test.tsx        | 30    |
| NoteCard.test.tsx             | 20    |
| NoteEditor.test.tsx           | 26    |
| Pagination.test.tsx           | 18    |
| ProtectedRoute.test.tsx       | 3     |
| ReminderCard.test.tsx         | 14    |
| TankCard.test.tsx             | 5     |
| TankForm.test.tsx             | 12    |
| TankOverview.test.tsx         | 8     |
| TankSidebar.test.tsx          | 6     |
| TankStats.test.tsx            | 5     |
| TankTabs.test.tsx             | 14    |
| ThemeToggle.test.tsx          | 8     |
| VersionBanner.test.tsx        | 3     |

### Hooks (`src/hooks/__tests__/`)

| File               | Tests |
|--------------------|-------|
| useAuth.test.tsx   | 7     |
| useTheme.test.tsx  | 8     |

### Pages (`src/pages/__tests__/`)

| File                | Tests |
|---------------------|-------|
| Dashboard.test.tsx  | 11    |
| Equipment.test.tsx  | 11    |
| Livestock.test.tsx  | 10    |
| Login.test.tsx      | 5     |
| Maintenance.test.tsx| 8     |
| Notes.test.tsx      | 9     |
| Register.test.tsx   | 7     |
| TankList.test.tsx   | 11    |

### API (`src/api/__tests__/`)

| File           | Tests |
|----------------|-------|
| client.test.ts | 5     |

### Utils/Config (`src/utils/__tests__/`, `src/config/__tests__/`)

| File                      | Tests |
|---------------------------|-------|
| parameterRanges.test.ts   | 23    |
| price.test.ts             | 18    |
| timeline.test.ts          | 53    |

## Source Coverage Breakdown

### Well-Covered (>80% statements)

| File                             | % Stmts | % Branch | % Funcs | % Lines |
|----------------------------------|---------|----------|---------|---------|
| src/App.tsx                      | 96.73   | 33.33    | 100     | 96.73   |
| src/platform.ts                  | 84.61   | 100      | 66.66   | 84.61   |
| src/components/Footer.tsx        | 100     | 100      | 100     | 100     |
| src/components/LanguageSelector  | 100     | 100      | 100     | 100     |
| src/components/ThemeToggle.tsx   | 100     | 100      | 100     | 100     |
| src/components/VersionBanner     | 83.33   | 25       | 100     | 83.33   |
| src/components/auth/Protected... | 100     | 100      | 100     | 100     |
| src/components/banners/Banner... | 99.34   | 96.22    | 94.11   | 99.34   |
| src/components/banners/Reef...   | 100     | 100      | 100     | 100     |
| src/components/banners/index.ts  | 100     | 100      | 100     | 100     |
| src/components/common/Pagination | 100     | 100      | 100     | 100     |
| src/components/common/TankSel... | 88.46   | 71.42    | 50      | 88.46   |
| src/components/livestock/Card    | 92.91   | 77.01    | 50      | 92.91   |
| src/components/maintenance/Card  | 93.46   | 85.71    | 100     | 93.46   |
| src/components/maintenance/Form  | 83.16   | 66.66    | 9.09    | 83.16   |
| src/components/notes/NoteCard    | 100     | 100      | 100     | 100     |
| src/components/notes/NoteEditor  | 98.59   | 95       | 100     | 98.59   |
| src/components/tanks/Animation   | 100     | 100      | 100     | 100     |
| src/components/tanks/TankForm    | 98.73   | 60.60    | 50      | 98.73   |
| src/components/tanks/TankOver... | 83.56   | 84.21    | 100     | 83.56   |
| src/components/tanks/TankSide... | 88.41   | 55.55    | 42.85   | 88.41   |
| src/components/tanks/TankStats   | 100     | 100      | 100     | 100     |
| src/config/parameterRanges.ts    | 100     | 100      | 100     | 100     |
| src/hooks/useAuth.tsx            | 81.77   | 76.47    | 85.71   | 81.77   |
| src/hooks/useCurrency.tsx        | 83.33   | 50       | 66.66   | 83.33   |
| src/hooks/useSettings.tsx        | 88.15   | 50       | 25      | 88.15   |
| src/hooks/useTheme.tsx           | 93.61   | 90.90    | 71.42   | 93.61   |
| src/pages/Dashboard.tsx          | 88.35   | 56.25    | 55.55   | 88.35   |
| src/pages/Login.tsx              | 100     | 88.88    | 100     | 100     |
| src/pages/Notes.tsx              | 81.46   | 84.21    | 42.85   | 81.46   |
| src/pages/Register.tsx           | 97.86   | 92.85    | 100     | 97.86   |
| src/utils/price.ts               | 100     | 92.85    | 100     | 100     |
| src/utils/timeline.ts           | 100     | 97.67    | 100     | 100     |

### Partially Covered (20-80%)

| File                             | % Stmts |
|----------------------------------|---------|
| src/api/client.ts                | 41.65   |
| src/api/index.ts                 | 54.32   |
| src/components/tanks/TankCard    | 78.59   |
| src/components/tanks/TankTabs    | 67.93   |
| src/pages/Equipment.tsx          | 54.22   |
| src/pages/Livestock.tsx          | 67.94   |
| src/pages/Maintenance.tsx        | 69.64   |
| src/pages/TankList.tsx           | 69.68   |
| src/hooks/useScrollToItem.ts     | 52.94   |

### Not Covered (0%)

These files have no test coverage yet:

- `src/main.tsx` - App entry point
- `src/components/Layout.tsx` - Main layout shell
- `src/components/AquariumScene.tsx` - 3D scene
- `src/components/livestock/LivestockForm.tsx` - Livestock form
- `src/components/parameters/*` - Parameter chart/form
- `src/components/photos/*` - Photo gallery/upload
- `src/components/tanks/TankTimeline*.tsx` - Timeline visual components
- `src/components/tanks/TankEventForm.tsx` - Event form
- `src/components/tanks/TankImageUpload.tsx` - Image upload
- `src/pages/Admin.tsx` - Admin panel (1470 lines)
- `src/pages/Consumables.tsx` - Consumables page
- `src/pages/ICPTests.tsx` - ICP Tests page
- `src/pages/Parameters.tsx` - Parameters page
- `src/pages/Photos.tsx` - Photos page
- `src/pages/TankDetail.tsx` - Tank detail page
- `src/services/*` - Database, schema, photo storage
- `src/utils/cropImage.ts` - Image crop utility
- `src/i18n/*` - i18n config
- `src/data/*` - Seed data / default consumables
- `src/api/local/*` - Local (offline) API adapters

## How to Run

```bash
# Run all tests
cd frontend && npx vitest run

# Run with coverage
npx vitest run --coverage

# Run in watch mode
npx vitest

# Run a specific test file
npx vitest run src/components/__tests__/LivestockCard.test.tsx
```

## Coverage Improvement Priorities

1. **Large page components** (Admin, Consumables, Parameters, ICPTests) - high line count, 0% coverage
2. **Timeline visual components** (TankTimeline, TankTimelineVisual) - complex rendering logic
3. **Photo/image components** (PhotoGallery, PhotoUpload, TankImageUpload) - file handling
4. **Form components** (LivestockForm, ParameterForm) - complex user interactions
5. **Services layer** (database.ts, schema.ts) - data layer
