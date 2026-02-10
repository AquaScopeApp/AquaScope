/**
 * Local ICP Tests API
 *
 * Stores element values as a JSON blob in the 'elements' column.
 * Includes a client-side ATI CSV parser.
 */

import type { ICPTest, ICPTestCreate, ICPTestUpdate, ICPTestSummary } from '../../types'
import { db, generateId, now, getLocalUserId, parseJSON } from './helpers'

// All possible element fields from the ICPTest type
const ELEMENT_FIELDS = [
  'salinity', 'salinity_status', 'kh', 'kh_status',
  'cl', 'cl_status', 'na', 'na_status', 'mg', 'mg_status', 's', 's_status',
  'ca', 'ca_status', 'k', 'k_status', 'br', 'br_status', 'sr', 'sr_status',
  'b', 'b_status', 'f', 'f_status',
  'li', 'li_status', 'si', 'si_status', 'i', 'i_status', 'ba', 'ba_status',
  'mo', 'mo_status', 'ni', 'ni_status', 'mn', 'mn_status', 'as', 'as_status',
  'be', 'be_status', 'cr', 'cr_status', 'co', 'co_status', 'fe', 'fe_status',
  'cu', 'cu_status', 'se', 'se_status', 'ag', 'ag_status', 'v', 'v_status',
  'zn', 'zn_status', 'sn', 'sn_status',
  'no3', 'no3_status', 'p', 'p_status', 'po4', 'po4_status',
  'al', 'al_status', 'sb', 'sb_status', 'bi', 'bi_status', 'pb', 'pb_status',
  'cd', 'cd_status', 'la', 'la_status', 'tl', 'tl_status', 'ti', 'ti_status',
  'w', 'w_status', 'hg', 'hg_status',
]

function rowToICPTest(row: any): ICPTest {
  const elements = parseJSON<Record<string, any>>(row.elements) || {}
  const result: any = {
    id: row.id,
    tank_id: row.tank_id,
    user_id: row.user_id,
    test_date: row.test_date,
    lab_name: row.lab_name,
    test_id: row.test_id || null,
    water_type: row.water_type,
    sample_date: row.sample_date || null,
    received_date: row.received_date || null,
    evaluated_date: row.evaluated_date || null,
    score_major_elements: row.score_major_elements ?? null,
    score_minor_elements: row.score_minor_elements ?? null,
    score_pollutants: row.score_pollutants ?? null,
    score_base_elements: row.score_base_elements ?? null,
    score_overall: row.score_overall ?? null,
    recommendations: parseJSON(row.recommendations),
    dosing_instructions: parseJSON(row.dosing_instructions),
    pdf_filename: row.pdf_filename || null,
    pdf_path: row.pdf_path || null,
    notes: row.notes || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }

  // Spread element values from JSON blob
  for (const field of ELEMENT_FIELDS) {
    result[field] = elements[field] ?? null
  }

  return result as ICPTest
}

function rowToSummary(row: any): ICPTestSummary {
  return {
    id: row.id,
    tank_id: row.tank_id,
    test_date: row.test_date,
    lab_name: row.lab_name,
    water_type: row.water_type,
    score_overall: row.score_overall ?? null,
    score_major_elements: row.score_major_elements ?? null,
    score_minor_elements: row.score_minor_elements ?? null,
    score_pollutants: row.score_pollutants ?? null,
    created_at: row.created_at,
  }
}

function extractElements(data: any): Record<string, any> {
  const elements: Record<string, any> = {}
  for (const field of ELEMENT_FIELDS) {
    if (data[field] !== undefined && data[field] !== null) {
      elements[field] = data[field]
    }
  }
  return elements
}

export const icpTestsApi = {
  list: async (params?: {
    tank_id?: string; lab_name?: string; from_date?: string; to_date?: string
    skip?: number; limit?: number
  }): Promise<ICPTestSummary[]> => {
    const userId = getLocalUserId()
    const conditions = ['user_id = ?']
    const values: any[] = [userId]

    if (params?.tank_id) { conditions.push('tank_id = ?'); values.push(params.tank_id) }
    if (params?.lab_name) { conditions.push('lab_name = ?'); values.push(params.lab_name) }
    if (params?.from_date) { conditions.push('test_date >= ?'); values.push(params.from_date) }
    if (params?.to_date) { conditions.push('test_date <= ?'); values.push(params.to_date) }

    const limit = params?.limit || 100
    const skip = params?.skip || 0

    const rows = await db.query(
      `SELECT * FROM icp_tests WHERE ${conditions.join(' AND ')} ORDER BY test_date DESC LIMIT ? OFFSET ?`,
      [...values, limit, skip]
    )
    return rows.map(rowToSummary)
  },

  get: async (id: string): Promise<ICPTest> => {
    const row = await db.queryOne('SELECT * FROM icp_tests WHERE id = ?', [id])
    if (!row) throw new Error('ICP Test not found')
    return rowToICPTest(row)
  },

  create: async (data: ICPTestCreate): Promise<ICPTest> => {
    const id = generateId()
    const userId = getLocalUserId()
    const timestamp = now()
    const elements = extractElements(data)

    await db.execute(
      `INSERT INTO icp_tests (id, tank_id, user_id, test_date, lab_name, test_id, water_type,
       sample_date, received_date, evaluated_date,
       score_major_elements, score_minor_elements, score_pollutants, score_base_elements, score_overall,
       elements, recommendations, dosing_instructions, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.tank_id, userId, data.test_date, data.lab_name, data.test_id ?? null,
       data.water_type ?? 'saltwater', data.sample_date ?? null,
       data.received_date ?? null, data.evaluated_date ?? null,
       data.score_major_elements ?? null, data.score_minor_elements ?? null,
       data.score_pollutants ?? null, data.score_base_elements ?? null,
       data.score_overall ?? null, JSON.stringify(elements),
       null, null, null, timestamp, timestamp]
    )

    return icpTestsApi.get(id)
  },

  upload: async (tank_id: string, file: File): Promise<ICPTest[]> => {
    // Client-side ATI CSV parser
    const text = await file.text()
    const tests = parseATICSV(text, tank_id)

    const results: ICPTest[] = []
    for (const testData of tests) {
      const test = await icpTestsApi.create(testData)
      results.push(test)
    }
    return results
  },

  update: async (id: string, data: ICPTestUpdate): Promise<ICPTest> => {
    const existing = await db.queryOne<any>('SELECT * FROM icp_tests WHERE id = ?', [id])
    if (!existing) throw new Error('ICP Test not found')

    const metaFields = ['test_date', 'lab_name', 'test_id', 'water_type',
      'sample_date', 'received_date', 'evaluated_date', 'notes']
    const sets: string[] = []
    const values: any[] = []

    for (const field of metaFields) {
      if (data[field] !== undefined) {
        sets.push(`${field} = ?`)
        values.push(data[field])
      }
    }

    // Merge element updates into existing elements JSON
    const existingElements = parseJSON<Record<string, any>>(existing.elements) || {}
    const newElements = extractElements(data)
    if (Object.keys(newElements).length > 0) {
      const merged = { ...existingElements, ...newElements }
      sets.push('elements = ?')
      values.push(JSON.stringify(merged))
    }

    sets.push('updated_at = ?')
    values.push(now())
    values.push(id)

    await db.execute(`UPDATE icp_tests SET ${sets.join(', ')} WHERE id = ?`, values)
    return icpTestsApi.get(id)
  },

  delete: async (id: string): Promise<void> => {
    await db.execute('DELETE FROM icp_tests WHERE id = ?', [id])
  },
}

/**
 * Minimal ATI CSV parser (client-side port of backend ati_parser.py).
 * Handles the standard ATI ICP-OES export format.
 */
function parseATICSV(csv: string, tankId: string): ICPTestCreate[] {
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length < 2) return []

  // ATI CSV typically has: element name, unit, reference min, reference max, value, status
  const tests: ICPTestCreate[] = []
  const elements: Record<string, any> = {}
  let testDate = now().split('T')[0]
  let labName = 'ATI'

  // Try to find date from headers
  for (const line of lines.slice(0, 5)) {
    const dateMatch = line.match(/(\d{2})[./](\d{2})[./](\d{4})/)
    if (dateMatch) {
      testDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      break
    }
  }

  // Element name mapping (ATI names to our field names)
  const nameMap: Record<string, string> = {
    'Calcium': 'ca', 'Magnesium': 'mg', 'Sodium': 'na', 'Potassium': 'k',
    'Strontium': 'sr', 'Boron': 'b', 'Bromine': 'br', 'Fluorine': 'f',
    'Sulfur': 's', 'Chlorine': 'cl', 'Lithium': 'li', 'Silicon': 'si',
    'Iodine': 'i', 'Barium': 'ba', 'Molybdenum': 'mo', 'Nickel': 'ni',
    'Manganese': 'mn', 'Arsenic': 'as', 'Beryllium': 'be', 'Chromium': 'cr',
    'Cobalt': 'co', 'Iron': 'fe', 'Copper': 'cu', 'Selenium': 'se',
    'Silver': 'ag', 'Vanadium': 'v', 'Zinc': 'zn', 'Tin': 'sn',
    'Aluminium': 'al', 'Aluminum': 'al', 'Antimony': 'sb', 'Bismuth': 'bi',
    'Lead': 'pb', 'Cadmium': 'cd', 'Lanthanum': 'la', 'Thallium': 'tl',
    'Titanium': 'ti', 'Tungsten': 'w', 'Mercury': 'hg',
    'Phosphorus': 'p', 'Nitrate': 'no3', 'Phosphate': 'po4',
    'Salinity': 'salinity', 'KH': 'kh',
  }

  for (const line of lines) {
    const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/"/g, ''))
    if (parts.length < 2) continue

    const name = parts[0]
    const field = nameMap[name]
    if (!field) continue

    // Find the numeric value (usually the last numeric column)
    for (let i = parts.length - 1; i >= 1; i--) {
      const val = parseFloat(parts[i])
      if (!isNaN(val)) {
        elements[field] = val
        // Check for status in adjacent column
        if (i + 1 < parts.length && ['ok', 'low', 'high', 'critical'].includes(parts[i + 1].toLowerCase())) {
          elements[`${field}_status`] = parts[i + 1].toLowerCase()
        }
        break
      }
    }
  }

  if (Object.keys(elements).length > 0) {
    tests.push({
      tank_id: tankId,
      test_date: testDate,
      lab_name: labName,
      water_type: 'saltwater',
      ...elements,
    })
  }

  return tests
}
