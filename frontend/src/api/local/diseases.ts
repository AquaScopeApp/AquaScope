/**
 * Local Diseases/Health Tracking API
 */

import type {
  DiseaseRecord, DiseaseRecordCreate, DiseaseRecordUpdate,
  DiseaseRecordDetail, DiseaseTreatment, DiseaseTreatmentCreate,
  DiseaseHealthSummary,
} from '../../types'
import { db, generateId, now, getLocalUserId } from './helpers'

function rowToRecord(row: any): DiseaseRecord {
  return {
    id: row.id,
    livestock_id: row.livestock_id,
    tank_id: row.tank_id,
    user_id: row.user_id,
    disease_name: row.disease_name,
    symptoms: row.symptoms || null,
    diagnosis: row.diagnosis || null,
    severity: row.severity,
    status: row.status,
    detected_date: row.detected_date,
    resolved_date: row.resolved_date || null,
    outcome: row.outcome || null,
    notes: row.notes || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function rowToTreatment(row: any): DiseaseTreatment {
  return {
    id: row.id,
    disease_record_id: row.disease_record_id,
    user_id: row.user_id,
    consumable_id: row.consumable_id || null,
    treatment_type: row.treatment_type,
    treatment_name: row.treatment_name,
    dosage: row.dosage || null,
    quantity_used: row.quantity_used ?? null,
    quantity_unit: row.quantity_unit || null,
    treatment_date: row.treatment_date,
    duration_days: row.duration_days ?? null,
    effectiveness: row.effectiveness || null,
    notes: row.notes || null,
    created_at: row.created_at,
  }
}

export const diseasesApi = {
  list: async (params?: {
    tank_id?: string; livestock_id?: string; status?: string; severity?: string
  }): Promise<DiseaseRecord[]> => {
    const userId = getLocalUserId()
    const conditions = ['user_id = ?']
    const values: any[] = [userId]

    if (params?.tank_id) { conditions.push('tank_id = ?'); values.push(params.tank_id) }
    if (params?.livestock_id) { conditions.push('livestock_id = ?'); values.push(params.livestock_id) }
    if (params?.status) { conditions.push('status = ?'); values.push(params.status) }
    if (params?.severity) { conditions.push('severity = ?'); values.push(params.severity) }

    const rows = await db.query(
      `SELECT * FROM disease_records WHERE ${conditions.join(' AND ')} ORDER BY detected_date DESC`,
      values
    )
    return rows.map(rowToRecord)
  },

  get: async (id: string): Promise<DiseaseRecordDetail> => {
    const row = await db.queryOne('SELECT * FROM disease_records WHERE id = ?', [id])
    if (!row) throw new Error('Disease record not found')
    const record = rowToRecord(row)

    const treatmentRows = await db.query(
      'SELECT * FROM disease_treatments WHERE disease_record_id = ? ORDER BY treatment_date DESC',
      [id]
    )

    return { ...record, treatments: treatmentRows.map(rowToTreatment) }
  },

  create: async (data: DiseaseRecordCreate): Promise<DiseaseRecord> => {
    const id = generateId()
    const userId = getLocalUserId()
    const timestamp = now()

    await db.execute(
      `INSERT INTO disease_records (id, livestock_id, tank_id, user_id, disease_name, symptoms, diagnosis,
       severity, status, detected_date, resolved_date, outcome, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.livestock_id, data.tank_id, userId, data.disease_name,
       data.symptoms ?? null, data.diagnosis ?? null,
       data.severity ?? 'moderate', data.status ?? 'active',
       data.detected_date, data.resolved_date ?? null,
       data.outcome ?? null, data.notes ?? null, timestamp, timestamp]
    )

    const row = await db.queryOne('SELECT * FROM disease_records WHERE id = ?', [id])
    return rowToRecord(row)
  },

  update: async (id: string, data: DiseaseRecordUpdate): Promise<DiseaseRecord> => {
    const fields = ['disease_name', 'symptoms', 'diagnosis', 'severity', 'status',
      'detected_date', 'resolved_date', 'outcome', 'notes']
    const sets: string[] = []
    const values: any[] = []

    for (const field of fields) {
      if ((data as any)[field] !== undefined) {
        sets.push(`${field} = ?`)
        values.push((data as any)[field])
      }
    }

    // Auto-set resolved_date when status changes to resolved
    if (data.status === 'resolved' && !data.resolved_date) {
      const existing = await db.queryOne('SELECT resolved_date FROM disease_records WHERE id = ?', [id])
      if (existing && !existing.resolved_date) {
        sets.push('resolved_date = ?')
        values.push(now().split('T')[0])
      }
    }

    sets.push('updated_at = ?')
    values.push(now())
    values.push(id)

    await db.execute(`UPDATE disease_records SET ${sets.join(', ')} WHERE id = ?`, values)

    const row = await db.queryOne('SELECT * FROM disease_records WHERE id = ?', [id])
    return rowToRecord(row)
  },

  delete: async (id: string): Promise<void> => {
    await db.execute('DELETE FROM disease_records WHERE id = ?', [id])
  },

  addTreatment: async (diseaseId: string, data: DiseaseTreatmentCreate): Promise<DiseaseTreatment> => {
    const id = generateId()
    const userId = getLocalUserId()
    const timestamp = now()

    await db.execute(
      `INSERT INTO disease_treatments (id, disease_record_id, user_id, consumable_id, treatment_type,
       treatment_name, dosage, quantity_used, quantity_unit, treatment_date, duration_days,
       effectiveness, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, diseaseId, userId, data.consumable_id ?? null, data.treatment_type,
       data.treatment_name, data.dosage ?? null, data.quantity_used ?? null,
       data.quantity_unit ?? null, data.treatment_date, data.duration_days ?? null,
       data.effectiveness ?? null, data.notes ?? null, timestamp]
    )

    const row = await db.queryOne('SELECT * FROM disease_treatments WHERE id = ?', [id])
    return rowToTreatment(row)
  },

  updateTreatment: async (diseaseId: string, treatmentId: string, data: DiseaseTreatmentCreate): Promise<DiseaseTreatment> => {
    const fields = ['treatment_type', 'treatment_name', 'consumable_id', 'dosage',
      'quantity_used', 'quantity_unit', 'treatment_date', 'duration_days',
      'effectiveness', 'notes']
    const sets: string[] = []
    const values: any[] = []

    for (const field of fields) {
      if ((data as any)[field] !== undefined) {
        sets.push(`${field} = ?`)
        values.push((data as any)[field])
      }
    }
    values.push(treatmentId)
    values.push(diseaseId)

    await db.execute(
      `UPDATE disease_treatments SET ${sets.join(', ')} WHERE id = ? AND disease_record_id = ?`,
      values
    )

    const row = await db.queryOne('SELECT * FROM disease_treatments WHERE id = ?', [treatmentId])
    return rowToTreatment(row)
  },

  deleteTreatment: async (diseaseId: string, treatmentId: string): Promise<void> => {
    await db.execute(
      'DELETE FROM disease_treatments WHERE id = ? AND disease_record_id = ?',
      [treatmentId, diseaseId]
    )
  },

  getSummary: async (tankId: string): Promise<DiseaseHealthSummary> => {
    const userId = getLocalUserId()

    const activeCount = (await db.queryOne(
      'SELECT COUNT(*) as c FROM disease_records WHERE tank_id = ? AND user_id = ? AND status = ?',
      [tankId, userId, 'active']
    ))?.c || 0

    const monitoringCount = (await db.queryOne(
      'SELECT COUNT(*) as c FROM disease_records WHERE tank_id = ? AND user_id = ? AND status = ?',
      [tankId, userId, 'monitoring']
    ))?.c || 0

    const chronicCount = (await db.queryOne(
      'SELECT COUNT(*) as c FROM disease_records WHERE tank_id = ? AND user_id = ? AND status = ?',
      [tankId, userId, 'chronic']
    ))?.c || 0

    const resolvedCount = (await db.queryOne(
      'SELECT COUNT(*) as c FROM disease_records WHERE tank_id = ? AND user_id = ? AND status = ?',
      [tankId, userId, 'resolved']
    ))?.c || 0

    const totalTreatments = (await db.queryOne(
      `SELECT COUNT(*) as c FROM disease_treatments dt
       JOIN disease_records dr ON dt.disease_record_id = dr.id
       WHERE dr.tank_id = ? AND dr.user_id = ?`,
      [tankId, userId]
    ))?.c || 0

    const recentRows = await db.query(
      'SELECT * FROM disease_records WHERE tank_id = ? AND user_id = ? ORDER BY detected_date DESC LIMIT 5',
      [tankId, userId]
    )

    return {
      tank_id: tankId,
      active_count: activeCount,
      monitoring_count: monitoringCount,
      chronic_count: chronicCount,
      resolved_count: resolvedCount,
      total_treatments: totalTreatments,
      recent_diseases: recentRows.map(rowToRecord),
    }
  },
}
