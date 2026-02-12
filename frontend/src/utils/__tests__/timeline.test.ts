/**
 * Tests for timeline utility functions
 */
import { describe, it, expect } from 'vitest'
import {
  getEventIcon,
  getEventColor,
  getCategoryColor,
  buildTimelineEntries,
  groupEntriesByDate,
  CATEGORY_COLORS,
} from '../timeline'
import type {
  Tank,
  TankEvent,
  Livestock,
  Equipment,
  Photo,
  ICPTestSummary,
  TimelineCategory,
} from '../../types'

// ---------------------------------------------------------------------------
// Helpers to build minimal valid objects for each type
// ---------------------------------------------------------------------------

function makeTank(overrides: Partial<Tank> = {}): Tank {
  return {
    id: 'tank-1',
    user_id: 'user-1',
    name: 'Reef Display',
    water_type: 'saltwater',
    aquarium_subtype: null,
    display_volume_liters: 300,
    sump_volume_liters: 100,
    total_volume_liters: 400,
    description: null,
    image_url: null,
    setup_date: '2024-01-15',
    electricity_cost_per_day: null,
    is_archived: false,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    events: [],
    ...overrides,
  }
}

function makeTankEvent(overrides: Partial<TankEvent> = {}): TankEvent {
  return {
    id: 'event-1',
    tank_id: 'tank-1',
    user_id: 'user-1',
    title: 'Water Change',
    description: '20% water change',
    event_date: '2024-02-01',
    event_type: 'water_change',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
    ...overrides,
  }
}

function makeLivestock(overrides: Partial<Livestock> = {}): Livestock {
  return {
    id: 'ls-1',
    tank_id: 'tank-1',
    user_id: 'user-1',
    species_name: 'Amphiprion ocellaris',
    common_name: 'Clownfish',
    type: 'fish',
    fishbase_species_id: null,
    worms_id: null,
    inaturalist_id: null,
    cached_photo_url: null,
    quantity: 2,
    status: 'alive',
    added_date: '2024-02-10',
    removed_date: null,
    notes: null,
    purchase_price: null,
    purchase_url: null,
    is_archived: false,
    created_at: '2024-02-10T00:00:00Z',
    ...overrides,
  }
}

function makeEquipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: 'eq-1',
    tank_id: 'tank-1',
    user_id: 'user-1',
    name: 'Skimmer',
    equipment_type: 'filtration',
    manufacturer: 'Nyos',
    model: 'Quantum 160',
    specs: null,
    purchase_date: '2024-01-20',
    purchase_price: null,
    purchase_url: null,
    condition: null,
    status: 'active',
    notes: null,
    is_archived: false,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
    ...overrides,
  }
}

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: 'photo-1',
    tank_id: 'tank-1',
    user_id: 'user-1',
    filename: 'tank.jpg',
    file_path: '/uploads/tank.jpg',
    thumbnail_path: null,
    description: 'Full tank shot',
    taken_at: '2024-03-01T14:30:00Z',
    is_tank_display: false,
    created_at: '2024-03-01T14:30:00Z',
    ...overrides,
  }
}

function makeICPTest(overrides: Partial<ICPTestSummary> = {}): ICPTestSummary {
  return {
    id: 'icp-1',
    tank_id: 'tank-1',
    test_date: '2024-04-01',
    lab_name: 'Triton',
    water_type: 'saltwater',
    score_overall: 85,
    score_major_elements: 90,
    score_minor_elements: 80,
    score_pollutants: 85,
    created_at: '2024-04-01T00:00:00Z',
    ...overrides,
  }
}

// ===========================================================================
// getEventIcon
// ===========================================================================

describe('getEventIcon', () => {
  it('returns the correct icon for each known event type', () => {
    expect(getEventIcon('setup')).toBe('\u{1F3D7}\uFE0F')           // construction
    expect(getEventIcon('water_change')).toBe('\u{1F4A7}')           // droplet
    expect(getEventIcon('rescape')).toBe('\u{1FAA8}')                // rock
    expect(getEventIcon('equipment_added')).toBe('\u2699\uFE0F')     // gear
    expect(getEventIcon('equipment_removed')).toBe('\u2699\uFE0F')   // gear
    expect(getEventIcon('livestock_added')).toBe('\u{1F41F}')        // fish
    expect(getEventIcon('livestock_lost')).toBe('\u{1F494}')         // broken heart
    expect(getEventIcon('cleaning')).toBe('\u{1F9F9}')               // broom
    expect(getEventIcon('upgrade')).toBe('\u2B06\uFE0F')             // up arrow
    expect(getEventIcon('issue')).toBe('\u26A0\uFE0F')               // warning
    expect(getEventIcon('crash')).toBe('\u{1F4A5}')                  // collision
    expect(getEventIcon('milestone')).toBe('\u{1F389}')              // party popper
    expect(getEventIcon('other')).toBe('\u{1F4DD}')                  // memo
  })

  it('returns fallback icon for unknown event type', () => {
    expect(getEventIcon('unknown_type')).toBe('\u{1F4C5}')           // calendar
  })

  it('returns fallback icon for null', () => {
    expect(getEventIcon(null)).toBe('\u{1F4C5}')
  })

  it('returns fallback icon for empty string', () => {
    // empty string is falsy so same path as null
    expect(getEventIcon('')).toBe('\u{1F4C5}')
  })
})

// ===========================================================================
// getEventColor
// ===========================================================================

describe('getEventColor', () => {
  it('returns the correct color for each known event type', () => {
    expect(getEventColor('setup')).toBe('ocean')
    expect(getEventColor('water_change')).toBe('ocean')
    expect(getEventColor('rescape')).toBe('amber')
    expect(getEventColor('equipment_added')).toBe('amber')
    expect(getEventColor('equipment_removed')).toBe('amber')
    expect(getEventColor('livestock_added')).toBe('green')
    expect(getEventColor('livestock_lost')).toBe('rose')
    expect(getEventColor('cleaning')).toBe('ocean')
    expect(getEventColor('upgrade')).toBe('blue')
    expect(getEventColor('issue')).toBe('amber')
    expect(getEventColor('crash')).toBe('rose')
    expect(getEventColor('milestone')).toBe('green')
    expect(getEventColor('other')).toBe('gray')
  })

  it('returns fallback color for unknown event type', () => {
    expect(getEventColor('unknown_type')).toBe('ocean')
  })

  it('returns fallback color for null', () => {
    expect(getEventColor(null)).toBe('ocean')
  })

  it('returns fallback color for empty string', () => {
    expect(getEventColor('')).toBe('ocean')
  })
})

// ===========================================================================
// CATEGORY_COLORS
// ===========================================================================

describe('CATEGORY_COLORS', () => {
  it('has a hex color for every timeline category', () => {
    const categories: TimelineCategory[] = ['setup', 'event', 'livestock', 'equipment', 'photo', 'icp_test']
    for (const cat of categories) {
      expect(CATEGORY_COLORS[cat]).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})

// ===========================================================================
// getCategoryColor
// ===========================================================================

describe('getCategoryColor', () => {
  it('returns rose color for livestock_lost event type', () => {
    expect(getCategoryColor('livestock', 'livestock_lost')).toBe('#e11d48')
  })

  it('returns rose color for removed event type on livestock', () => {
    expect(getCategoryColor('livestock', 'removed')).toBe('#e11d48')
  })

  it('returns green for livestock without loss event type', () => {
    expect(getCategoryColor('livestock', 'livestock_added')).toBe('#16a34a')
  })

  it('returns green for livestock with null event type', () => {
    expect(getCategoryColor('livestock', null)).toBe('#16a34a')
  })

  it('returns green for livestock with undefined event type', () => {
    expect(getCategoryColor('livestock')).toBe('#16a34a')
  })

  it('returns mapped color for event category with known event type', () => {
    // water_change maps to ocean -> #0284c7
    expect(getCategoryColor('event', 'water_change')).toBe('#0284c7')
    // crash maps to rose -> #e11d48
    expect(getCategoryColor('event', 'crash')).toBe('#e11d48')
    // rescape maps to amber -> #d97706
    expect(getCategoryColor('event', 'rescape')).toBe('#d97706')
    // milestone maps to green -> #16a34a
    expect(getCategoryColor('event', 'milestone')).toBe('#16a34a')
    // upgrade maps to blue -> #2563eb
    expect(getCategoryColor('event', 'upgrade')).toBe('#2563eb')
    // other maps to gray -> #6b7280
    expect(getCategoryColor('event', 'other')).toBe('#6b7280')
  })

  it('returns default event color for event category with unknown event type', () => {
    // unknown type has no mapping in EVENT_COLORS -> undefined -> falls through to CATEGORY_COLORS.event
    expect(getCategoryColor('event', 'unknown_xyz')).toBe(CATEGORY_COLORS.event)
  })

  it('returns default event color when event category has null event type', () => {
    expect(getCategoryColor('event', null)).toBe(CATEGORY_COLORS.event)
  })

  it('returns default event color when event category has no event type', () => {
    expect(getCategoryColor('event')).toBe(CATEGORY_COLORS.event)
  })

  it('returns base category color for setup', () => {
    expect(getCategoryColor('setup')).toBe('#0284c7')
  })

  it('returns base category color for equipment', () => {
    expect(getCategoryColor('equipment')).toBe('#d97706')
  })

  it('returns base category color for photo', () => {
    expect(getCategoryColor('photo')).toBe('#9333ea')
  })

  it('returns base category color for icp_test', () => {
    expect(getCategoryColor('icp_test')).toBe('#2563eb')
  })
})

// ===========================================================================
// buildTimelineEntries
// ===========================================================================

describe('buildTimelineEntries', () => {
  it('returns empty array when tank has no setup date and all arrays are empty', () => {
    const tank = makeTank({ setup_date: null })
    const entries = buildTimelineEntries(tank, [], [], [], [], [])
    expect(entries).toEqual([])
  })

  it('creates a setup entry from the tank setup_date', () => {
    const tank = makeTank({ setup_date: '2024-01-15' })
    const entries = buildTimelineEntries(tank, [], [], [], [], [])
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      id: 'setup-tank-1',
      date: '2024-01-15',
      category: 'setup',
      title: 'Tank Setup',
      subtitle: 'Reef Display',
      icon: expect.any(String),
      color: 'ocean',
      eventType: 'setup',
      sourceId: 'tank-1',
      metadata: { water_type: 'saltwater' },
    })
  })

  it('creates entries from TankEvent records', () => {
    const tank = makeTank({ setup_date: null })
    const events = [
      makeTankEvent({ id: 'e1', title: 'Water Change', event_type: 'water_change', event_date: '2024-02-01' }),
      makeTankEvent({ id: 'e2', title: 'Rescape', event_type: 'rescape', event_date: '2024-03-15', description: null }),
    ]
    const entries = buildTimelineEntries(tank, events, [], [], [], [])
    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({
      id: 'event-e1',
      category: 'event',
      title: 'Water Change',
      subtitle: '20% water change',
      eventType: 'water_change',
    })
    expect(entries[1]).toMatchObject({
      id: 'event-e2',
      category: 'event',
      title: 'Rescape',
      subtitle: null,
      eventType: 'rescape',
    })
  })

  it('creates event entry with null event_type', () => {
    const tank = makeTank({ setup_date: null })
    const events = [makeTankEvent({ event_type: null })]
    const entries = buildTimelineEntries(tank, events, [], [], [], [])
    expect(entries).toHaveLength(1)
    expect(entries[0].eventType).toBeNull()
  })

  // ---------- Livestock entries ----------

  it('creates livestock added entry for fish', () => {
    const tank = makeTank({ setup_date: null })
    const livestock = [makeLivestock({ type: 'fish', common_name: 'Clownfish' })]
    const entries = buildTimelineEntries(tank, [], livestock, [], [], [])
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      id: 'livestock-add-ls-1',
      category: 'livestock',
      title: 'Added Clownfish',
      subtitle: '2x fish',
      color: 'green',
      eventType: 'livestock_added',
    })
  })

  it('uses species_name when common_name is null', () => {
    const tank = makeTank({ setup_date: null })
    const livestock = [makeLivestock({ common_name: null, species_name: 'Amphiprion ocellaris' })]
    const entries = buildTimelineEntries(tank, [], livestock, [], [], [])
    expect(entries[0].title).toBe('Added Amphiprion ocellaris')
  })

  it('creates coral livestock entry with coral icon', () => {
    const tank = makeTank({ setup_date: null })
    const livestock = [makeLivestock({ type: 'coral', common_name: 'Acropora' })]
    const entries = buildTimelineEntries(tank, [], livestock, [], [], [])
    expect(entries[0].icon).toBe('\u{1FAB8}')  // coral emoji
  })

  it('creates invertebrate livestock entry with shrimp icon', () => {
    const tank = makeTank({ setup_date: null })
    const livestock = [makeLivestock({ type: 'invertebrate', common_name: 'Cleaner Shrimp' })]
    const entries = buildTimelineEntries(tank, [], livestock, [], [], [])
    expect(entries[0].icon).toBe('\u{1F990}')  // shrimp emoji
  })

  it('creates livestock removed entry with "Lost" title when status is dead', () => {
    const tank = makeTank({ setup_date: null })
    const livestock = [makeLivestock({
      removed_date: '2024-06-01',
      status: 'dead',
      common_name: 'Clownfish',
    })]
    const entries = buildTimelineEntries(tank, [], livestock, [], [], [])
    // Should have both an added and a removed entry
    expect(entries).toHaveLength(2)
    const removeEntry = entries.find(e => e.id === 'livestock-rm-ls-1')!
    expect(removeEntry).toBeDefined()
    expect(removeEntry.title).toBe('Lost Clownfish')
    expect(removeEntry.color).toBe('rose')
    expect(removeEntry.eventType).toBe('livestock_lost')
    expect(removeEntry.metadata.status).toBe('dead')
  })

  it('creates livestock removed entry with "Removed" title when status is not dead', () => {
    const tank = makeTank({ setup_date: null })
    const livestock = [makeLivestock({
      removed_date: '2024-06-01',
      status: 'removed',
      common_name: 'Clownfish',
    })]
    const entries = buildTimelineEntries(tank, [], livestock, [], [], [])
    const removeEntry = entries.find(e => e.id === 'livestock-rm-ls-1')!
    expect(removeEntry.title).toBe('Removed Clownfish')
  })

  it('does not create added entry when added_date is null', () => {
    const tank = makeTank({ setup_date: null })
    const livestock = [makeLivestock({ added_date: null })]
    const entries = buildTimelineEntries(tank, [], livestock, [], [], [])
    expect(entries).toHaveLength(0)
  })

  it('does not create removed entry when removed_date is null', () => {
    const tank = makeTank({ setup_date: null })
    const livestock = [makeLivestock({ removed_date: null })]
    const entries = buildTimelineEntries(tank, [], livestock, [], [], [])
    // Only the "added" entry
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('livestock-add-ls-1')
  })

  // ---------- Equipment entries ----------

  it('creates equipment entry with manufacturer and model subtitle', () => {
    const tank = makeTank({ setup_date: null })
    const equipment = [makeEquipment({ manufacturer: 'Nyos', model: 'Quantum 160' })]
    const entries = buildTimelineEntries(tank, [], [], equipment, [], [])
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      id: 'equipment-eq-1',
      category: 'equipment',
      title: 'Skimmer',
      subtitle: 'Nyos Quantum 160',
      color: 'amber',
      eventType: 'equipment_added',
      metadata: { equipment_type: 'filtration', status: 'active' },
    })
  })

  it('falls back to equipment_type when manufacturer and model are null', () => {
    const tank = makeTank({ setup_date: null })
    const equipment = [makeEquipment({ manufacturer: null, model: null, equipment_type: 'heater' })]
    const entries = buildTimelineEntries(tank, [], [], equipment, [], [])
    expect(entries[0].subtitle).toBe('heater')
  })

  it('uses manufacturer only when model is null', () => {
    const tank = makeTank({ setup_date: null })
    const equipment = [makeEquipment({ manufacturer: 'Eheim', model: null })]
    const entries = buildTimelineEntries(tank, [], [], equipment, [], [])
    expect(entries[0].subtitle).toBe('Eheim')
  })

  it('uses model only when manufacturer is null', () => {
    const tank = makeTank({ setup_date: null })
    const equipment = [makeEquipment({ manufacturer: null, model: 'Classic 350' })]
    const entries = buildTimelineEntries(tank, [], [], equipment, [], [])
    expect(entries[0].subtitle).toBe('Classic 350')
  })

  it('does not create equipment entry when purchase_date is null', () => {
    const tank = makeTank({ setup_date: null })
    const equipment = [makeEquipment({ purchase_date: null })]
    const entries = buildTimelineEntries(tank, [], [], equipment, [], [])
    expect(entries).toHaveLength(0)
  })

  // ---------- Photo entries ----------

  it('creates photo entry and strips time from taken_at', () => {
    const tank = makeTank({ setup_date: null })
    const photos = [makePhoto({ taken_at: '2024-03-01T14:30:00Z', description: 'Full tank shot' })]
    const entries = buildTimelineEntries(tank, [], [], [], photos, [])
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      id: 'photo-photo-1',
      date: '2024-03-01',
      category: 'photo',
      title: 'Photo',
      subtitle: 'Full tank shot',
      color: 'purple',
      eventType: null,
    })
  })

  it('creates photo entry with null description', () => {
    const tank = makeTank({ setup_date: null })
    const photos = [makePhoto({ description: null })]
    const entries = buildTimelineEntries(tank, [], [], [], photos, [])
    expect(entries[0].subtitle).toBeNull()
  })

  // ---------- ICP Test entries ----------

  it('creates ICP test entry with score', () => {
    const tank = makeTank({ setup_date: null })
    const icpTests = [makeICPTest({ lab_name: 'Triton', score_overall: 85 })]
    const entries = buildTimelineEntries(tank, [], [], [], [], icpTests)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      id: 'icp-icp-1',
      date: '2024-04-01',
      category: 'icp_test',
      title: 'ICP Test - Triton',
      subtitle: 'Score: 85/100',
      color: 'blue',
      eventType: null,
      metadata: { lab_name: 'Triton', score_overall: 85 },
    })
  })

  it('creates ICP test entry with null subtitle when score_overall is null', () => {
    const tank = makeTank({ setup_date: null })
    const icpTests = [makeICPTest({ score_overall: null })]
    const entries = buildTimelineEntries(tank, [], [], [], [], icpTests)
    expect(entries[0].subtitle).toBeNull()
  })

  // ---------- Sorting ----------

  it('sorts entries chronologically (oldest first)', () => {
    const tank = makeTank({ setup_date: '2024-01-01' })
    const events = [makeTankEvent({ event_date: '2024-06-01' })]
    const livestock = [makeLivestock({ added_date: '2024-03-01' })]
    const equipment = [makeEquipment({ purchase_date: '2024-02-01' })]
    const photos = [makePhoto({ taken_at: '2024-05-01T00:00:00Z' })]
    const icpTests = [makeICPTest({ test_date: '2024-04-01' })]

    const entries = buildTimelineEntries(tank, events, livestock, equipment, photos, icpTests)

    const dates = entries.map(e => e.date)
    expect(dates).toEqual([
      '2024-01-01',   // setup
      '2024-02-01',   // equipment
      '2024-03-01',   // livestock added
      '2024-04-01',   // icp test
      '2024-05-01',   // photo
      '2024-06-01',   // event
    ])
  })

  it('handles multiple entries on the same date', () => {
    const tank = makeTank({ setup_date: null })
    const events = [
      makeTankEvent({ id: 'e1', event_date: '2024-05-01' }),
      makeTankEvent({ id: 'e2', event_date: '2024-05-01' }),
    ]
    const entries = buildTimelineEntries(tank, events, [], [], [], [])
    expect(entries).toHaveLength(2)
    // Both on same date, stable sort preserves insertion order
    expect(entries[0].id).toBe('event-e1')
    expect(entries[1].id).toBe('event-e2')
  })

  // ---------- Comprehensive integration ----------

  it('combines all data sources into a single sorted timeline', () => {
    const tank = makeTank({ id: 't1', setup_date: '2024-01-01', name: 'Main Tank' })
    const events = [makeTankEvent({ id: 'ev1', event_date: '2024-03-01', title: 'Rescape', event_type: 'rescape' })]
    const livestock = [
      makeLivestock({
        id: 'l1',
        added_date: '2024-02-01',
        removed_date: '2024-07-01',
        status: 'dead',
        common_name: 'Tang',
        type: 'fish',
        quantity: 1,
      }),
    ]
    const equipment = [makeEquipment({ id: 'eq1', purchase_date: '2024-01-20' })]
    const photos = [makePhoto({ id: 'p1', taken_at: '2024-04-15T10:00:00Z' })]
    const icpTests = [makeICPTest({ id: 'ic1', test_date: '2024-05-20' })]

    const entries = buildTimelineEntries(tank, events, livestock, equipment, photos, icpTests)

    // setup(1/1) + equipment(1/20) + livestock-add(2/1) + event(3/1) + photo(4/15) + icp(5/20) + livestock-rm(7/1) = 7
    expect(entries).toHaveLength(7)

    const categories = entries.map(e => e.category)
    expect(categories).toEqual([
      'setup',      // 2024-01-01
      'equipment',  // 2024-01-20
      'livestock',  // 2024-02-01 (added)
      'event',      // 2024-03-01
      'photo',      // 2024-04-15
      'icp_test',   // 2024-05-20
      'livestock',  // 2024-07-01 (removed/dead)
    ])
  })
})

// ===========================================================================
// groupEntriesByDate
// ===========================================================================

describe('groupEntriesByDate', () => {
  it('returns empty map for empty array', () => {
    const result = groupEntriesByDate([])
    expect(result.size).toBe(0)
  })

  it('groups a single entry under its date', () => {
    const tank = makeTank({ setup_date: '2024-01-15' })
    const entries = buildTimelineEntries(tank, [], [], [], [], [])
    const groups = groupEntriesByDate(entries)
    expect(groups.size).toBe(1)
    expect(groups.get('2024-01-15')).toHaveLength(1)
  })

  it('groups multiple entries on the same date', () => {
    const tank = makeTank({ setup_date: null })
    const events = [
      makeTankEvent({ id: 'e1', event_date: '2024-05-01' }),
      makeTankEvent({ id: 'e2', event_date: '2024-05-01' }),
      makeTankEvent({ id: 'e3', event_date: '2024-05-01' }),
    ]
    const entries = buildTimelineEntries(tank, events, [], [], [], [])
    const groups = groupEntriesByDate(entries)
    expect(groups.size).toBe(1)
    expect(groups.get('2024-05-01')).toHaveLength(3)
  })

  it('creates separate groups for different dates', () => {
    const tank = makeTank({ setup_date: null })
    const events = [
      makeTankEvent({ id: 'e1', event_date: '2024-05-01' }),
      makeTankEvent({ id: 'e2', event_date: '2024-05-02' }),
      makeTankEvent({ id: 'e3', event_date: '2024-05-03' }),
    ]
    const entries = buildTimelineEntries(tank, events, [], [], [], [])
    const groups = groupEntriesByDate(entries)
    expect(groups.size).toBe(3)
    expect(groups.get('2024-05-01')).toHaveLength(1)
    expect(groups.get('2024-05-02')).toHaveLength(1)
    expect(groups.get('2024-05-03')).toHaveLength(1)
  })

  it('strips time portion from date strings containing T', () => {
    const tank = makeTank({ setup_date: null })
    const photos = [
      makePhoto({ id: 'p1', taken_at: '2024-06-15T09:00:00Z' }),
      makePhoto({ id: 'p2', taken_at: '2024-06-15T18:30:00Z' }),
    ]
    const entries = buildTimelineEntries(tank, [], [], [], photos, [])
    const groups = groupEntriesByDate(entries)
    // Both photos are on the same day despite different times
    expect(groups.size).toBe(1)
    expect(groups.get('2024-06-15')).toHaveLength(2)
  })

  it('preserves entry references in groups', () => {
    const tank = makeTank({ setup_date: '2024-01-01' })
    const events = [makeTankEvent({ event_date: '2024-02-01' })]
    const entries = buildTimelineEntries(tank, events, [], [], [], [])
    const groups = groupEntriesByDate(entries)

    const jan = groups.get('2024-01-01')!
    expect(jan[0].category).toBe('setup')

    const feb = groups.get('2024-02-01')!
    expect(feb[0].category).toBe('event')
  })

  it('works with mixed data across multiple dates', () => {
    const tank = makeTank({ setup_date: '2024-01-01' })
    const events = [makeTankEvent({ event_date: '2024-01-01' })]
    const livestock = [makeLivestock({ added_date: '2024-01-01' })]

    const entries = buildTimelineEntries(tank, events, livestock, [], [], [])
    const groups = groupEntriesByDate(entries)

    // All three (setup, event, livestock) on same day
    expect(groups.size).toBe(1)
    expect(groups.get('2024-01-01')).toHaveLength(3)
  })
})
