#!/usr/bin/env bash
#
# Demo database seed script
# Creates two aquariums with full data across all modules:
#   1. Saltwater SPS Dominant reef tank
#   2. Freshwater Amazonian biotope
#
set -euo pipefail

API="http://localhost:8000/api/v1"
EMAIL="demo@reeflab.io"
PASS="demo1234"
USER="DemoUser"

echo "=== ReefLab Demo Seed ==="

# ── Register & Login ──────────────────────────────────────────────
echo "[1/9] Registering demo user..."
curl -sf -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"username\":\"$USER\",\"password\":\"$PASS\"}" > /dev/null 2>&1 || true

echo "[1/9] Logging in..."
TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$EMAIL&password=$PASS" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

# Helper: POST JSON, return id
post() {
  local url="$1"; shift
  curl -sf -X POST "$url" -H "$AUTH" -H "$CT" -d "$1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))"
}

# Helper: POST JSON, ignore response
post_quiet() {
  local url="$1"; shift
  curl -sf -X POST "$url" -H "$AUTH" -H "$CT" -d "$1" > /dev/null
}

# ── Create Tanks ──────────────────────────────────────────────────
echo "[2/9] Creating tanks..."

SALT_TANK=$(post "$API/tanks/" '{
  "name": "Coral Paradise",
  "water_type": "saltwater",
  "aquarium_subtype": "sps_dominant",
  "display_volume_liters": 400,
  "sump_volume_liters": 100,
  "description": "SPS dominant reef with Acropora, Montipora, and Pocillopora colonies. Triton method dosing, Radion G6 Pro lighting, Ecotech Vectra M2 return pump.",
  "setup_date": "2024-03-15"
}')
echo "  Saltwater tank: $SALT_TANK"

FRESH_TANK=$(post "$API/tanks/" '{
  "name": "Rio Negro Biotope",
  "water_type": "freshwater",
  "aquarium_subtype": "amazonian",
  "display_volume_liters": 240,
  "sump_volume_liters": 60,
  "description": "Amazonian blackwater biotope with driftwood, Indian almond leaves, and Amazon Swords. Soft acidic water with tannins.",
  "setup_date": "2024-09-01"
}')
echo "  Freshwater tank: $FRESH_TANK"

# ── Tank Events ───────────────────────────────────────────────────
echo "[3/9] Adding tank events..."

# Saltwater events
post_quiet "$API/tanks/$SALT_TANK/events" '{"title":"Initial cycle complete","event_date":"2024-04-20","event_type":"milestone","description":"Ammonia and nitrite at 0 for 7 days"}'
post_quiet "$API/tanks/$SALT_TANK/events" '{"title":"First coral added","event_date":"2024-05-01","event_type":"livestock","description":"Added 3 Montipora digitata frags"}'
post_quiet "$API/tanks/$SALT_TANK/events" '{"title":"ICP test - all clear","event_date":"2024-08-15","event_type":"test","description":"ATI ICP results within range, minor tin detected"}'
post_quiet "$API/tanks/$SALT_TANK/events" '{"title":"Upgraded to Radion G6 Pro","event_date":"2024-11-10","event_type":"equipment","description":"Replaced AI Prime with Radion G6 Pro x2"}'
post_quiet "$API/tanks/$SALT_TANK/events" '{"title":"Coral spawning observed","event_date":"2025-06-20","event_type":"milestone","description":"Acropora millepora released eggs during full moon"}'

# Freshwater events
post_quiet "$API/tanks/$FRESH_TANK/events" '{"title":"Tank cycled","event_date":"2024-10-05","event_type":"milestone","description":"Fishless cycle complete with Dr. Tims ammonia"}'
post_quiet "$API/tanks/$FRESH_TANK/events" '{"title":"First fish added","event_date":"2024-10-10","event_type":"livestock","description":"12 Cardinal Tetras added"}'
post_quiet "$API/tanks/$FRESH_TANK/events" '{"title":"Planted new swords","event_date":"2025-01-15","event_type":"maintenance","description":"Added 4 Echinodorus bleheri and Cryptocoryne wendtii"}'
post_quiet "$API/tanks/$FRESH_TANK/events" '{"title":"CO2 system installed","event_date":"2025-03-01","event_type":"equipment","description":"Pressurized CO2 with inline diffuser"}'

# ── Livestock ─────────────────────────────────────────────────────
echo "[4/9] Adding livestock..."

# Saltwater livestock (with WoRMS, iNaturalist IDs and photo URLs)
post_quiet "$API/livestock/" "{\"tank_id\":\"$SALT_TANK\",\"species_name\":\"Acropora millepora\",\"common_name\":\"Millepora Acro\",\"type\":\"coral\",\"quantity\":3,\"added_date\":\"2024-05-15\",\"notes\":\"Purple/green coloration, mid-tank placement\",\"worms_id\":\"207023\",\"inaturalist_id\":\"93299\",\"cached_photo_url\":\"https://inaturalist-open-data.s3.amazonaws.com/photos/105111643/medium.jpg\"}"
post_quiet "$API/livestock/" "{\"tank_id\":\"$SALT_TANK\",\"species_name\":\"Montipora digitata\",\"common_name\":\"Digi Monti\",\"type\":\"coral\",\"quantity\":4,\"added_date\":\"2024-05-01\",\"notes\":\"Orange and green morphs\",\"worms_id\":\"207185\",\"inaturalist_id\":\"106085\",\"cached_photo_url\":\"https://inaturalist-open-data.s3.amazonaws.com/photos/60574622/medium.jpeg\"}"
post_quiet "$API/livestock/" "{\"tank_id\":\"$SALT_TANK\",\"species_name\":\"Pocillopora damicornis\",\"common_name\":\"Pocillopora\",\"type\":\"coral\",\"quantity\":2,\"added_date\":\"2024-06-10\",\"notes\":\"Fast grower, needs frequent fragging\",\"worms_id\":\"206953\",\"inaturalist_id\":\"109862\",\"cached_photo_url\":\"https://inaturalist-open-data.s3.amazonaws.com/photos/65184323/medium.jpeg\"}"
post_quiet "$API/livestock/" "{\"tank_id\":\"$SALT_TANK\",\"species_name\":\"Seriatopora hystrix\",\"common_name\":\"Birdsnest Coral\",\"type\":\"coral\",\"quantity\":2,\"added_date\":\"2024-07-20\",\"notes\":\"Pink birdsnest, high flow area\",\"worms_id\":\"206973\",\"inaturalist_id\":\"112480\",\"cached_photo_url\":\"https://inaturalist-open-data.s3.amazonaws.com/photos/162113151/medium.jpg\"}"
post_quiet "$API/livestock/" "{\"tank_id\":\"$SALT_TANK\",\"species_name\":\"Paracanthurus hepatus\",\"common_name\":\"Blue Tang\",\"type\":\"fish\",\"quantity\":1,\"added_date\":\"2024-06-01\",\"notes\":\"Quarantined for 6 weeks before introduction\",\"worms_id\":\"219676\",\"inaturalist_id\":\"130879\",\"cached_photo_url\":\"https://inaturalist-open-data.s3.amazonaws.com/photos/30261643/medium.jpg\"}"
post_quiet "$API/livestock/" "{\"tank_id\":\"$SALT_TANK\",\"species_name\":\"Amphiprion ocellaris\",\"common_name\":\"Ocellaris Clownfish\",\"type\":\"fish\",\"quantity\":2,\"added_date\":\"2024-05-20\",\"notes\":\"Bonded pair, hosting Euphyllia\",\"worms_id\":\"278400\",\"inaturalist_id\":\"132688\",\"cached_photo_url\":\"https://inaturalist-open-data.s3.amazonaws.com/photos/106318566/medium.jpg\"}"
post_quiet "$API/livestock/" "{\"tank_id\":\"$SALT_TANK\",\"species_name\":\"Pseudanthias squamipinnis\",\"common_name\":\"Lyretail Anthias\",\"type\":\"fish\",\"quantity\":5,\"added_date\":\"2024-08-01\",\"notes\":\"1 male, 4 females. Fed 3x daily\",\"worms_id\":\"218278\",\"inaturalist_id\":\"1579843\",\"cached_photo_url\":\"https://static.inaturalist.org/photos/12505596/medium.jpg\"}"
post_quiet "$API/livestock/" "{\"tank_id\":\"$SALT_TANK\",\"species_name\":\"Tridacna maxima\",\"common_name\":\"Maxima Clam\",\"type\":\"invertebrate\",\"quantity\":1,\"added_date\":\"2024-09-15\",\"notes\":\"Blue/green mantle, placed on rock ledge\",\"worms_id\":\"207675\",\"inaturalist_id\":\"50589\",\"cached_photo_url\":\"https://inaturalist-open-data.s3.amazonaws.com/photos/57906964/medium.jpeg\"}"
post_quiet "$API/livestock/" "{\"tank_id\":\"$SALT_TANK\",\"species_name\":\"Lysmata amboinensis\",\"common_name\":\"Cleaner Shrimp\",\"type\":\"invertebrate\",\"quantity\":2,\"added_date\":\"2024-05-25\",\"notes\":\"Active cleaning station on main rock\",\"worms_id\":\"241289\",\"inaturalist_id\":\"121385\",\"cached_photo_url\":\"https://inaturalist-open-data.s3.amazonaws.com/photos/109110752/medium.jpeg\"}"

# Freshwater livestock (with WoRMS, iNaturalist IDs and photo URLs)
post_quiet "$API/livestock/" "{\"tank_id\":\"$FRESH_TANK\",\"species_name\":\"Paracheirodon axelrodi\",\"common_name\":\"Cardinal Tetra\",\"type\":\"fish\",\"quantity\":20,\"added_date\":\"2024-10-10\",\"notes\":\"Wild-caught, beautiful neon blue and red\",\"worms_id\":\"1014021\",\"inaturalist_id\":\"172380\",\"cached_photo_url\":\"https://static.inaturalist.org/photos/57765612/medium.jpg\"}"
post_quiet "$API/livestock/" "{\"tank_id\":\"$FRESH_TANK\",\"species_name\":\"Hemigrammus bleheri\",\"common_name\":\"Rummy-Nose Tetra\",\"type\":\"fish\",\"quantity\":12,\"added_date\":\"2024-10-20\",\"notes\":\"Great schooling behavior, red nose indicates good water quality\",\"worms_id\":\"1383817\",\"inaturalist_id\":\"1313179\",\"cached_photo_url\":\"https://inaturalist-open-data.s3.amazonaws.com/photos/110729201/medium.jpg\"}"
post_quiet "$API/livestock/" "{\"tank_id\":\"$FRESH_TANK\",\"species_name\":\"Corydoras sterbai\",\"common_name\":\"Sterbai Cory\",\"type\":\"fish\",\"quantity\":8,\"added_date\":\"2024-11-05\",\"notes\":\"Bottom feeders, love sand substrate\",\"worms_id\":\"1007681\",\"inaturalist_id\":\"1560813\",\"cached_photo_url\":\"https://inaturalist-open-data.s3.amazonaws.com/photos/111211197/medium.jpg\"}"
post_quiet "$API/livestock/" "{\"tank_id\":\"$FRESH_TANK\",\"species_name\":\"Apistogramma cacatuoides\",\"common_name\":\"Cockatoo Dwarf Cichlid\",\"type\":\"fish\",\"quantity\":3,\"added_date\":\"2024-12-01\",\"notes\":\"1 male, 2 females. Triple Red morph\",\"worms_id\":\"1383553\",\"inaturalist_id\":\"611210\",\"cached_photo_url\":\"https://inaturalist-open-data.s3.amazonaws.com/photos/94477007/medium.jpg\"}"
post_quiet "$API/livestock/" "{\"tank_id\":\"$FRESH_TANK\",\"species_name\":\"Otocinclus vittatus\",\"common_name\":\"Otocinclus\",\"type\":\"fish\",\"quantity\":6,\"added_date\":\"2024-11-15\",\"notes\":\"Algae crew, supplemented with blanched zucchini\",\"worms_id\":\"1018560\",\"inaturalist_id\":\"616670\",\"cached_photo_url\":\"https://static.inaturalist.org/photos/372813865/medium.jpeg\"}"
post_quiet "$API/livestock/" "{\"tank_id\":\"$FRESH_TANK\",\"species_name\":\"Caridina multidentata\",\"common_name\":\"Amano Shrimp\",\"type\":\"invertebrate\",\"quantity\":10,\"added_date\":\"2024-11-20\",\"notes\":\"Best algae eaters in the tank\",\"worms_id\":\"586329\",\"inaturalist_id\":\"434771\",\"cached_photo_url\":\"https://static.inaturalist.org/photos/163242662/medium.jpg\"}"

# ── Equipment ─────────────────────────────────────────────────────
echo "[5/9] Adding equipment..."

# Saltwater equipment
post_quiet "$API/equipment/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Radion G6 Pro\",\"equipment_type\":\"lighting\",\"manufacturer\":\"EcoTech Marine\",\"model\":\"G6 Pro\",\"purchase_date\":\"2024-11-10\",\"purchase_price\":\"899.00\",\"condition\":\"excellent\",\"status\":\"active\",\"notes\":\"Running AB+ schedule at 60% intensity\"}"
post_quiet "$API/equipment/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Vectra M2\",\"equipment_type\":\"pump\",\"manufacturer\":\"EcoTech Marine\",\"model\":\"Vectra M2\",\"purchase_date\":\"2024-03-01\",\"purchase_price\":\"449.00\",\"condition\":\"good\",\"status\":\"active\",\"notes\":\"Return pump, running at 70%\"}"
post_quiet "$API/equipment/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Nyos Quantum 160\",\"equipment_type\":\"skimmer\",\"manufacturer\":\"Nyos\",\"model\":\"Quantum 160\",\"purchase_date\":\"2024-03-01\",\"purchase_price\":\"650.00\",\"condition\":\"good\",\"status\":\"active\",\"notes\":\"Wet skim setting, cleaned weekly\"}"
post_quiet "$API/equipment/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"MP40 Vortech\",\"equipment_type\":\"wavemaker\",\"manufacturer\":\"EcoTech Marine\",\"model\":\"MP40w\",\"purchase_date\":\"2024-03-01\",\"purchase_price\":\"549.00\",\"condition\":\"good\",\"status\":\"active\",\"notes\":\"2 units in anti-sync reef crest mode\"}"
post_quiet "$API/equipment/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"GHL Doser 2.1\",\"equipment_type\":\"doser\",\"manufacturer\":\"GHL\",\"model\":\"Doser 2.1\",\"purchase_date\":\"2024-04-15\",\"purchase_price\":\"350.00\",\"condition\":\"good\",\"status\":\"active\",\"notes\":\"4-head dosing: Alk, Ca, Mg, trace elements\"}"
post_quiet "$API/equipment/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Apex Controller\",\"equipment_type\":\"controller\",\"manufacturer\":\"Neptune Systems\",\"model\":\"Apex 2024\",\"purchase_date\":\"2024-03-01\",\"purchase_price\":\"999.00\",\"condition\":\"excellent\",\"status\":\"active\",\"notes\":\"Monitoring pH, temp, ORP, salinity\"}"

# Freshwater equipment
post_quiet "$API/equipment/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Fluval FX4\",\"equipment_type\":\"filter\",\"manufacturer\":\"Fluval\",\"model\":\"FX4\",\"purchase_date\":\"2024-09-01\",\"purchase_price\":\"299.00\",\"condition\":\"good\",\"status\":\"active\",\"notes\":\"Canister filter with bio media, cleaned monthly\"}"
post_quiet "$API/equipment/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Fluval Plant 3.0\",\"equipment_type\":\"lighting\",\"manufacturer\":\"Fluval\",\"model\":\"Plant Spectrum 3.0 46W\",\"purchase_date\":\"2024-09-01\",\"purchase_price\":\"189.00\",\"condition\":\"good\",\"status\":\"active\",\"notes\":\"Custom schedule: 8h photoperiod with ramp\"}"
post_quiet "$API/equipment/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"CO2Art Pro-Elite\",\"equipment_type\":\"co2_system\",\"manufacturer\":\"CO2Art\",\"model\":\"Pro-Elite Regulator\",\"purchase_date\":\"2025-03-01\",\"purchase_price\":\"175.00\",\"condition\":\"excellent\",\"status\":\"active\",\"notes\":\"2 BPS via inline diffuser, pH controller shutoff\"}"
post_quiet "$API/equipment/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Eheim Jager 200W\",\"equipment_type\":\"heater\",\"manufacturer\":\"Eheim\",\"model\":\"Jager 200W\",\"purchase_date\":\"2024-09-01\",\"purchase_price\":\"39.00\",\"condition\":\"good\",\"status\":\"active\",\"notes\":\"Set to 26°C\"}"

# ── Maintenance Reminders ─────────────────────────────────────────
echo "[6/9] Adding maintenance reminders..."

# Saltwater maintenance
post_quiet "$API/maintenance/reminders" "{\"tank_id\":\"$SALT_TANK\",\"title\":\"10% Water Change\",\"description\":\"Red Sea Coral Pro salt mix, match temp and salinity\",\"reminder_type\":\"water_change\",\"frequency_days\":7,\"next_due\":\"2026-02-15\"}"
post_quiet "$API/maintenance/reminders" "{\"tank_id\":\"$SALT_TANK\",\"title\":\"Clean Skimmer Cup\",\"description\":\"Remove cup, rinse with RO water, wipe neck\",\"reminder_type\":\"skimmer_cleaning\",\"frequency_days\":3,\"next_due\":\"2026-02-12\"}"
post_quiet "$API/maintenance/reminders" "{\"tank_id\":\"$SALT_TANK\",\"title\":\"ICP Test\",\"description\":\"Send sample to ATI or Triton for full elemental analysis\",\"reminder_type\":\"test_kit_calibration\",\"frequency_days\":90,\"next_due\":\"2026-03-15\"}"
post_quiet "$API/maintenance/reminders" "{\"tank_id\":\"$SALT_TANK\",\"title\":\"Clean Glass\",\"description\":\"Flipper magnet cleaner on all 4 panels\",\"reminder_type\":\"glass_cleaning\",\"frequency_days\":3,\"next_due\":\"2026-02-11\"}"
post_quiet "$API/maintenance/reminders" "{\"tank_id\":\"$SALT_TANK\",\"title\":\"Refill Dosing Containers\",\"description\":\"Mix fresh Alk, Ca, Mg solutions. Check tube lines.\",\"reminder_type\":\"dosing_refill\",\"frequency_days\":30,\"next_due\":\"2026-02-28\"}"

# Freshwater maintenance
post_quiet "$API/maintenance/reminders" "{\"tank_id\":\"$FRESH_TANK\",\"title\":\"25% Water Change\",\"description\":\"Use RO water remineralized with SaltyShrimp GH+. Add Indian almond leaf.\",\"reminder_type\":\"water_change\",\"frequency_days\":7,\"next_due\":\"2026-02-14\"}"
post_quiet "$API/maintenance/reminders" "{\"tank_id\":\"$FRESH_TANK\",\"title\":\"Clean Canister Filter\",\"description\":\"Rinse bio media in tank water, replace floss pad\",\"reminder_type\":\"filter_media_change\",\"frequency_days\":30,\"next_due\":\"2026-03-01\"}"
post_quiet "$API/maintenance/reminders" "{\"tank_id\":\"$FRESH_TANK\",\"title\":\"Trim Plants\",\"description\":\"Trim stem plants, remove dead leaves from swords, replant trimmings\",\"reminder_type\":\"glass_cleaning\",\"frequency_days\":14,\"next_due\":\"2026-02-20\"}"
post_quiet "$API/maintenance/reminders" "{\"tank_id\":\"$FRESH_TANK\",\"title\":\"Refill CO2 Cylinder\",\"description\":\"Check CO2 pressure gauge, refill when below 400 PSI\",\"reminder_type\":\"dosing_refill\",\"frequency_days\":60,\"next_due\":\"2026-04-01\"}"

# ── Notes ─────────────────────────────────────────────────────────
echo "[7/9] Adding notes..."

# Saltwater notes
post_quiet "$API/notes/" "{\"tank_id\":\"$SALT_TANK\",\"content\":\"Noticed slight STN on the base of the green Acropora millepora. Increased flow in that area by adjusting the MP40 to pulse mode. Will monitor closely over the next week. Dipped in CoralRx as a precaution.\"}"
post_quiet "$API/notes/" "{\"tank_id\":\"$SALT_TANK\",\"content\":\"Alkalinity consumption has increased to 1.2 dKH/day since adding the new SPS frags. Adjusted dosing pump from 45ml to 60ml per dose. Calcium consumption also up to ~20ppm/day.\"}"
post_quiet "$API/notes/" "{\"tank_id\":\"$SALT_TANK\",\"content\":\"Anthias are eating well now. Switched from frozen mysis only to a rotation: LRS Reef Frenzy, PE Mysis, Hikari Marine S pellets. Feeding 3x daily with autofeeder for midday portion.\"}"
post_quiet "$API/notes/" "{\"tank_id\":\"$SALT_TANK\",\"content\":\"Observed the Maxima clam responding well to the Radion G6 Pro. Mantle is fully extended and colors have intensified since the light upgrade. Running at 60% on AB+ profile.\"}"

# Freshwater notes
post_quiet "$API/notes/" "{\"tank_id\":\"$FRESH_TANK\",\"content\":\"Apistogramma male is showing breeding colors and has claimed the coconut cave. Two females are displaying submission posture. Expecting fry soon!\"}"
post_quiet "$API/notes/" "{\"tank_id\":\"$FRESH_TANK\",\"content\":\"Added 6 new Indian almond leaves to maintain tannin level. Water is a beautiful amber color. pH has dropped naturally to 6.3 which is perfect for the Cardinals.\"}"
post_quiet "$API/notes/" "{\"tank_id\":\"$FRESH_TANK\",\"content\":\"CO2 drop checker showing lime green during photoperiod. Plants are pearling nicely. Echinodorus bleheri has sent up a runner with 3 plantlets.\"}"
post_quiet "$API/notes/" "{\"tank_id\":\"$FRESH_TANK\",\"content\":\"Rummy-nose tetras all showing deep red noses - good indicator of water quality. Corydoras are active and foraging during the day which is a great sign.\"}"

# ── Parameters (historical data) ──────────────────────────────────
echo "[8/9] Submitting parameter readings..."

# Saltwater parameters - 6 months of data (biweekly)
for d in 2024-10-01 2024-10-15 2024-11-01 2024-11-15 2024-12-01 2024-12-15 \
         2025-01-01 2025-01-15 2025-02-01 2025-02-15 2025-03-01 2025-03-15 \
         2025-04-01 2025-04-15 2025-05-01 2025-05-15 2025-06-01 2025-06-15 \
         2025-07-01 2025-07-15 2025-08-01 2025-08-15 2025-09-01 2025-09-15 \
         2025-10-01 2025-10-15 2025-11-01 2025-11-15 2025-12-01 2025-12-15 \
         2026-01-01 2026-01-15 2026-02-01; do

  # Add some realistic variation
  ca=$((420 + RANDOM % 20))
  mg=$((1320 + RANDOM % 60))
  alk=$(python3 -c "import random; print(round(random.uniform(7.8, 9.2), 1))")
  no3=$(python3 -c "import random; print(round(random.uniform(1.0, 6.0), 1))")
  po4=$(python3 -c "import random; print(round(random.uniform(0.01, 0.06), 3))")
  sal=$(python3 -c "import random; print(round(random.uniform(1.024, 1.027), 3))")
  temp=$(python3 -c "import random; print(round(random.uniform(25.0, 26.5), 1))")
  ph=$(python3 -c "import random; print(round(random.uniform(8.0, 8.35), 2))")

  post_quiet "$API/parameters/" "{\"tank_id\":\"$SALT_TANK\",\"timestamp\":\"${d}T10:00:00\",\"calcium\":$ca,\"magnesium\":$mg,\"alkalinity_kh\":$alk,\"nitrate\":$no3,\"phosphate\":$po4,\"salinity\":$sal,\"temperature\":$temp,\"ph\":$ph}"
done

# Freshwater parameters - 4 months of data (weekly)
for d in 2024-11-01 2024-11-08 2024-11-15 2024-11-22 2024-11-29 \
         2024-12-06 2024-12-13 2024-12-20 2024-12-27 \
         2025-01-03 2025-01-10 2025-01-17 2025-01-24 2025-01-31 \
         2025-02-07 2025-02-14 2025-02-21 2025-02-28 \
         2025-03-07 2025-03-14 2025-03-21 2025-03-28 \
         2025-04-04 2025-04-11 2025-04-18 2025-04-25 \
         2025-05-02 2025-05-09 2025-05-16 2025-05-23 2025-05-30 \
         2025-06-06 2025-06-13 2025-06-20 2025-06-27 \
         2025-07-04 2025-07-11 2025-07-18 2025-07-25 \
         2025-08-01 2025-08-08 2025-08-15 2025-08-22 2025-08-29 \
         2025-09-05 2025-09-12 2025-09-19 2025-09-26 \
         2025-10-03 2025-10-10 2025-10-17 2025-10-24 2025-10-31 \
         2025-11-07 2025-11-14 2025-11-21 2025-11-28 \
         2025-12-05 2025-12-12 2025-12-19 2025-12-26 \
         2026-01-02 2026-01-09 2026-01-16 2026-01-23 2026-01-30 \
         2026-02-06; do

  temp=$(python3 -c "import random; print(round(random.uniform(25.0, 27.0), 1))")
  ph=$(python3 -c "import random; print(round(random.uniform(6.0, 6.8), 2))")
  gh=$(python3 -c "import random; print(round(random.uniform(4.0, 7.0), 1))")
  kh=$(python3 -c "import random; print(round(random.uniform(1.5, 3.5), 1))")
  no3=$(python3 -c "import random; print(round(random.uniform(3.0, 15.0), 1))")
  po4=$(python3 -c "import random; print(round(random.uniform(0.1, 1.5), 2))")
  nh3=$(python3 -c "import random; print(round(random.uniform(0.0, 0.01), 3))")
  no2=$(python3 -c "import random; print(round(random.uniform(0.0, 0.01), 3))")

  post_quiet "$API/parameters/" "{\"tank_id\":\"$FRESH_TANK\",\"timestamp\":\"${d}T10:00:00\",\"temperature\":$temp,\"ph\":$ph,\"gh\":$gh,\"alkalinity_kh\":$kh,\"nitrate\":$no3,\"phosphate\":$po4,\"ammonia\":$nh3,\"nitrite\":$no2}"
done

echo "[9/9] Done!"
echo ""
echo "=== Demo Data Summary ==="
echo "User:       $EMAIL / $PASS"
echo "Saltwater:  Coral Paradise (SPS Dominant, 500L)"
echo "Freshwater: Rio Negro Biotope (Amazonian, 300L)"
echo ""
echo "Each tank has:"
echo "  - Tank events (milestones, equipment changes)"
echo "  - Livestock (fish, corals, invertebrates)"
echo "  - Equipment (lights, pumps, filters, dosers)"
echo "  - Maintenance reminders (water changes, cleaning)"
echo "  - Notes (observations, adjustments)"
echo "  - Parameter history (months of readings)"
echo ""
echo "Login at http://localhost with $EMAIL / $PASS"
