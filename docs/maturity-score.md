# Tank Maturity Score

## Overview

The Tank Maturity Score is a gamification feature that gives each tank a 0–100 score reflecting how "mature" and well-established it is. The score appears as a radial gauge badge on each tank card in the Dashboard.

It rewards long-term care, consistent water chemistry, and a thriving, diverse livestock population — the three pillars of a healthy aquarium.

## Scoring Breakdown

The total score (0–100) is the sum of three independent components:

| Component | Max Points | What It Measures |
|-----------|-----------|------------------|
| **Age** | 30 | How long the tank has been running since its setup date |
| **Parameter Stability** | 40 | How consistent your water chemistry has been over the last 90 days |
| **Livestock Diversity** | 30 | Species count, type variety, and population health |

### Age Score (0–30 points)

Based on the number of days since the tank's `setup_date`, using a piecewise linear curve that rewards patience:

| Tank Age | Points |
|----------|--------|
| 0–30 days | 0–5 |
| 30–90 days | 5–15 |
| 90 days–1 year | 15–25 |
| 1–2 years | 25–28 |
| 2+ years | 30 (max) |

Tanks without a setup date receive 0 age points.

### Parameter Stability Score (0–40 points)

Measures the **coefficient of variation (CV)** of key water parameters over the last 90 days. A lower CV means more stable chemistry — and a higher score.

**Parameters measured by water type:**

| Water Type | Parameters |
|-----------|------------|
| Saltwater | Temperature, Alkalinity (KH), Calcium, Magnesium, Nitrate, Phosphate |
| Freshwater | Temperature, pH, GH |
| Brackish | Temperature, pH, Salinity |

Each parameter contributes equally. For saltwater (6 parameters), each is worth up to ~6.7 points. The CV is mapped to a 0.0–1.0 multiplier:

| CV | Score Multiplier |
|----|-----------------|
| ≤ 0.02 (very stable) | 1.0 |
| 0.02–0.05 | 0.7–1.0 |
| 0.05–0.10 | 0.4–0.7 |
| 0.10–0.20 | 0.1–0.4 |
| > 0.20 (unstable) | 0.0 |

**Requirements:**
- At least 5 readings per parameter in the last 60 days are needed; parameters with fewer readings contribute 0 points.
- If InfluxDB is unavailable, stability defaults to 0 (the dashboard still loads normally).

### Livestock Diversity Score (0–30 points)

Calculated from three sub-components using alive, non-archived livestock only:

| Sub-component | Max Points | Scale |
|--------------|-----------|-------|
| **Species Count** | 15 | 0 → 0, 1–2 → 3, 3–5 → 7, 6–10 → 11, 11–20 → 13, 21+ → 15 |
| **Type Diversity** | 10 | 1 type → 3, 2 types → 7, 3+ types → 10 (e.g., fish + coral + invertebrate) |
| **Population Health** | 5 | avg quantity ≥3 → 5, ≥2 → 3, ≥1 → 1, <1 → 0 |

## Maturity Levels

The total score maps to a named level and color:

| Score Range | Level | Badge Color |
|-------------|-------|-------------|
| 0–19 | **New** | Gray |
| 20–39 | **Growing** | Sky blue |
| 40–59 | **Established** | Dark blue |
| 60–79 | **Thriving** | Green |
| 80–100 | **Mature** | Gold |

## Dashboard Display

Each tank card on the Dashboard shows:

- A **radial gauge** (circular progress ring) with the numeric score centered
- The **maturity level label** next to the gauge, color-coded by level
- A **tooltip on hover** showing the breakdown: Age: X/30, Stability: Y/40, Diversity: Z/30

The badge appears only when the score is greater than 0, positioned between the "days up" pill and the setup date.

## API Response

The Dashboard API (`GET /api/v1/dashboard/summary`) returns maturity data for each tank:

```json
{
  "tanks": [
    {
      "tank_id": "uuid",
      "tank_name": "My Reef",
      "maturity": {
        "score": 72,
        "level": "thriving",
        "age_score": 28,
        "stability_score": 24,
        "livestock_score": 20
      }
    }
  ]
}
```

## Performance

The maturity computation adds exactly 2 batched queries to the dashboard endpoint:

1. **1 InfluxDB aggregation** — server-side `reduce()` computes count, sum, and sum-of-squares in a single Flux query across all tanks and parameters
2. **1 SQL query** — groups livestock by tank for species count, type count, and average quantity

No N+1 queries. The age score is pure date math with no database calls.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No `setup_date` set | Age score = 0 |
| No parameter data logged | Stability score = 0 |
| No livestock added | Diversity score = 0 |
| InfluxDB is down | Maturity defaults to `{score: 0, level: "new"}`, dashboard still loads |
| < 5 readings for a parameter | That parameter contributes 0 to stability |
| Unknown `water_type` | Defaults to saltwater parameter set |

## Architecture

### Backend Files

- **`backend/app/services/maturity.py`** — Core scoring engine
  - `calculate_age_score(setup_date)` — pure date arithmetic
  - `calculate_stability_scores_batch(user_id, tank_configs)` — single InfluxDB query
  - `calculate_livestock_scores_batch(db, tank_ids)` — single SQL query
  - `compute_maturity_batch(db, user_id, tanks)` — orchestrator
- **`backend/app/services/influxdb.py`** — Added `query_parameter_stats_batch()` method
- **`backend/app/schemas/dashboard.py`** — Added `MaturityScore` Pydantic model
- **`backend/app/api/v1/dashboard.py`** — Integrated maturity into dashboard response

### Frontend Files

- **`frontend/src/components/dashboard/MaturityBadge.tsx`** — SVG radial gauge component
- **`frontend/src/types/index.ts`** — `MaturityScore` TypeScript interface
- **`frontend/src/pages/Dashboard.tsx`** — Badge integration in tank cards
- **`frontend/public/locales/*/common.json`** — Translations in 6 languages (EN, FR, DE, ES, IT, PT)

## How to Improve Your Score

- **Set up your tank's setup date** to start earning age points
- **Log water parameters regularly** (at least 5 readings per parameter over 90 days) to earn stability points
- **Keep parameters consistent** — big swings reduce the stability score
- **Add diverse livestock** — mix fish, corals, and invertebrates for maximum diversity points
- **Keep livestock alive** — only alive, non-archived animals count
