# Internationalization (i18n) Implementation Plan

## Overview

Add multi-language support to ReefLab to make it accessible to the global reef keeping community.

## Recommended Approach

### Frontend: react-i18next

**Why react-i18next?**
- Industry standard for React applications
- Excellent TypeScript support
- Lazy loading of translations
- Pluralization and interpolation
- Context-aware translations
- Compatible with existing React code

### Backend: FastAPI i18n

**Why FastAPI i18n?**
- Native Python gettext support
- Request-based language detection
- Easy integration with FastAPI
- Supports same language files as frontend

## Implementation Plan

### Phase 1: Setup & Configuration (2-3 hours)

#### 1.1 Install Dependencies

**Frontend**:
```bash
cd frontend
npm install i18next react-i18next i18next-browser-languagedetector i18next-http-backend
```

**Backend**:
```bash
cd backend
pip install babel python-i18n
# Add to requirements.txt
```

#### 1.2 Initialize i18next

**File**: `frontend/src/i18n/config.ts`
```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'

i18n
  .use(Backend) // Load translations from backend
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n to react-i18next
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr', 'de', 'es', 'it', 'pt', 'ja', 'zh'],
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // React already escapes
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  })

export default i18n
```

#### 1.3 Update App.tsx

```typescript
import './i18n/config'  // Import before App component

function App() {
  // ... rest of your app
}
```

#### 1.4 Create Translation Files

**Directory Structure**:
```
frontend/public/locales/
├── en/
│   ├── common.json      # Common UI strings
│   ├── tanks.json       # Tank-specific strings
│   ├── parameters.json  # Parameter strings
│   ├── maintenance.json # Maintenance strings
│   └── ...
├── fr/
│   ├── common.json
│   └── ...
└── es/
    ├── common.json
    └── ...
```

### Phase 2: Create Translation Files (4-6 hours)

#### 2.1 English (en) - Base Language

**File**: `frontend/public/locales/en/common.json`
```json
{
  "app": {
    "name": "ReefLab",
    "tagline": "Reef Aquarium Management System"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "tanks": "Tanks",
    "parameters": "Parameters",
    "photos": "Photos",
    "notes": "Notes",
    "maintenance": "Maintenance",
    "livestock": "Livestock",
    "equipment": "Equipment",
    "icpTests": "ICP Tests"
  },
  "actions": {
    "add": "Add",
    "edit": "Edit",
    "delete": "Delete",
    "save": "Save",
    "cancel": "Cancel",
    "close": "Close",
    "upload": "Upload",
    "download": "Download",
    "search": "Search",
    "filter": "Filter"
  },
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "success": "Success!",
    "noData": "No data available",
    "confirm": "Are you sure?"
  }
}
```

**File**: `frontend/public/locales/en/tanks.json`
```json
{
  "title": "Tanks",
  "addTank": "Add Tank",
  "editTank": "Edit Tank",
  "deleteTank": "Delete Tank",
  "tankDetails": "Tank Details",
  "fields": {
    "name": "Tank Name",
    "description": "Description",
    "displayVolume": "Display Volume (L)",
    "sumpVolume": "Sump Volume (L)",
    "totalVolume": "Total Volume (L)",
    "setupDate": "Setup Date",
    "daysRunning": "{{count}} days running",
    "daysRunning_plural": "{{count}} days running"
  },
  "tabs": {
    "overview": "Overview",
    "events": "Events",
    "equipment": "Equipment",
    "livestock": "Livestock",
    "photos": "Photos",
    "notes": "Notes",
    "icpTests": "ICP Tests",
    "maintenance": "Maintenance"
  },
  "emptyState": {
    "noTanks": "No tanks yet",
    "noTanksDescription": "Create your first tank to get started"
  }
}
```

#### 2.2 Additional Languages

Create equivalent files for:
- **French** (fr): Reef keeping is popular in France
- **German** (de): Strong European community
- **Spanish** (es): Large Spanish-speaking community
- **Italian** (it): Italian reef keepers
- **Portuguese** (pt): Brazil has large reef community
- **Japanese** (ja): Advanced reef keeping culture
- **Chinese** (zh): Growing reef keeping community

### Phase 3: Implement in Components (6-8 hours)

#### 3.1 Update Components to Use Translations

**Example**: Layout Component

**Before**:
```typescript
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { name: 'Tanks', href: '/tanks', icon: '🐠' },
  // ...
]
```

**After**:
```typescript
import { useTranslation } from 'react-i18next'

function Layout() {
  const { t } = useTranslation('common')

  const navigation = [
    { name: t('navigation.dashboard'), href: '/dashboard', icon: '🏠' },
    { name: t('navigation.tanks'), href: '/tanks', icon: '🐠' },
    { name: t('navigation.parameters'), href: '/parameters', icon: '📊' },
    // ...
  ]

  return (
    // ... rest of component
  )
}
```

#### 3.2 Components Priority Order

1. **Navigation & Layout** (highest priority)
   - Layout.tsx
   - Footer.tsx
   - VersionBanner.tsx

2. **Dashboard**
   - Dashboard.tsx
   - Tank cards
   - Statistics

3. **Tank Management**
   - Tanks.tsx
   - TankDetail.tsx
   - TankSidebar.tsx
   - TankTabs.tsx

4. **Other Pages** (lower priority)
   - Parameters
   - Photos
   - Notes
   - Maintenance
   - Livestock
   - Equipment
   - ICP Tests

### Phase 4: Language Selector Component (2 hours)

#### 4.1 Create Language Selector

**File**: `frontend/src/components/LanguageSelector.tsx`
```typescript
import { useTranslation } from 'react-i18next'

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
]

export default function LanguageSelector() {
  const { i18n } = useTranslation()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
  }

  return (
    <div className="relative">
      <select
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </div>
  )
}
```

#### 4.2 Add to Layout

Add language selector to top navigation:
```typescript
<div className="flex items-center space-x-4">
  <LanguageSelector />
  <span className="text-sm text-gray-700">{user?.username}</span>
  <button onClick={logout}>
    {t('common:actions.logout')}
  </button>
</div>
```

### Phase 5: Backend i18n (Optional, 3-4 hours)

#### 5.1 Add Language Detection

**File**: `backend/app/core/i18n.py`
```python
from fastapi import Request
from babel import Locale

def get_locale(request: Request) -> str:
    """
    Detect user's preferred language from:
    1. Query parameter (?lang=en)
    2. Accept-Language header
    3. Default to English
    """
    # Check query parameter
    lang = request.query_params.get('lang')
    if lang:
        return lang

    # Check Accept-Language header
    accept_language = request.headers.get('accept-language', '')
    if accept_language:
        # Parse first language
        lang = accept_language.split(',')[0].split(';')[0].strip()
        return lang[:2]  # Get language code (en from en-US)

    return 'en'  # Default
```

#### 5.2 Translate API Responses (Optional)

For error messages and API responses:
```python
from app.core.i18n import get_locale

@router.post("/tanks")
def create_tank(
    request: Request,
    data: TankCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    locale = get_locale(request)

    try:
        tank = Tank(**data.dict(), user_id=current_user.id)
        db.add(tank)
        db.commit()
        return tank
    except Exception as e:
        error_messages = {
            'en': 'Failed to create tank',
            'fr': 'Échec de la création du réservoir',
            'de': 'Fehler beim Erstellen des Tanks',
            # ...
        }
        raise HTTPException(
            status_code=400,
            detail=error_messages.get(locale, error_messages['en'])
        )
```

### Phase 6: Testing & Quality Assurance (2-3 hours)

#### 6.1 Test Checklist

- [ ] All UI strings are translated
- [ ] Language selector works in all pages
- [ ] Language persists after page refresh
- [ ] Pluralization works correctly
- [ ] Date/time formatting respects locale
- [ ] Number formatting respects locale
- [ ] RTL languages display correctly (if supported)
- [ ] Fallback to English works for missing translations

#### 6.2 Translation Quality

- Use native speakers for review
- Test with real users from different regions
- Check cultural appropriateness
- Verify technical terminology

## Timeline

**Total Estimated Time**: 19-26 hours

| Phase | Task | Time | Priority |
|-------|------|------|----------|
| 1 | Setup & Configuration | 2-3h | High |
| 2 | Create Translation Files | 4-6h | High |
| 3 | Implement in Components | 6-8h | High |
| 4 | Language Selector | 2h | High |
| 5 | Backend i18n (Optional) | 3-4h | Medium |
| 6 | Testing & QA | 2-3h | High |

## Benefits

1. **Accessibility**: Make ReefLab available to non-English speakers
2. **Community Growth**: Attract international reef keepers
3. **User Experience**: Users comfortable in native language
4. **Professionalism**: Shows attention to global user base

## Challenges

1. **Maintenance**: Keep translations updated with new features
2. **Quality**: Ensure accurate technical translations
3. **Coverage**: Not all languages may be fully translated
4. **Testing**: Need native speakers to verify translations

## Alternative: Start with Key Languages

Instead of 8 languages, start with top 3:
1. **English** (en) - Base language
2. **French** (fr) - Large European community
3. **Spanish** (es) - Large Spanish-speaking community

Add more languages based on user demand.

## Implementation Strategy

### Option A: Incremental (Recommended)
1. Week 1: Setup + English translations
2. Week 2: Core pages (Dashboard, Tanks, Parameters)
3. Week 3: Remaining pages + French
4. Week 4: Spanish + Testing

### Option B: Big Bang
- Complete all translations at once
- Launch with full multi-language support
- Higher risk, longer development time

## Resources

- **i18next Documentation**: https://www.i18next.com/
- **react-i18next**: https://react.i18next.com/
- **Translation Services**: DeepL, Google Translate (for initial drafts)
- **Community**: Ask for translation volunteers in reef forums

## Next Steps

1. Review this plan
2. Decide on languages to support
3. Set timeline for implementation
4. Find translation volunteers or service
5. Start with Phase 1: Setup

---

**Ready to make ReefLab truly global!** 🌍🐠
