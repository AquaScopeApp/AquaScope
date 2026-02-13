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

echo "=== AquaScope Demo Seed ==="

# ── Safety: backup before seeding ─────────────────────────────────
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q aquascope-postgres; then
  echo "[0/13] Creating pre-seed backup..."
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  bash "$SCRIPT_DIR/backup.sh" 2>/dev/null && echo "  Backup saved to backups/" || echo "  Backup skipped (not critical)"
  echo ""
fi

# ── Register & Login ──────────────────────────────────────────────
echo "[1/13] Registering demo user..."
curl -sf -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"username\":\"$USER\",\"password\":\"$PASS\"}" > /dev/null 2>&1 || true

echo "[1/13] Logging in..."
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

# Helper: lookup livestock ID by species name (partial match)
lookup_livestock() {
  local tank_id="$1"
  local species="$2"
  curl -sf "$API/livestock/?tank_id=$tank_id" -H "$AUTH" | python3 -c "
import sys, json
data = json.load(sys.stdin)
matches = [x for x in data if '$species' in x.get('species_name','')]
print(matches[0]['id'] if matches else '')
"
}

# ── Create Tanks ──────────────────────────────────────────────────
echo "[2/13] Creating tanks..."

SALT_TANK=$(post "$API/tanks/" '{
  "name": "Coral Paradise",
  "water_type": "saltwater",
  "aquarium_subtype": "sps_dominant",
  "display_volume_liters": 400,
  "sump_volume_liters": 100,
  "description": "SPS dominant reef with Acropora, Montipora, and Pocillopora colonies. Triton method dosing, Radion G6 Pro lighting, Ecotech Vectra M2 return pump.",
  "setup_date": "2024-03-15",
  "electricity_cost_per_day": 1.20
}')
echo "  Saltwater tank: $SALT_TANK"

FRESH_TANK=$(post "$API/tanks/" '{
  "name": "Rio Negro Biotope",
  "water_type": "freshwater",
  "aquarium_subtype": "amazonian",
  "display_volume_liters": 240,
  "sump_volume_liters": 60,
  "description": "Amazonian blackwater biotope with driftwood, Indian almond leaves, and Amazon Swords. Soft acidic water with tannins.",
  "setup_date": "2024-09-01",
  "electricity_cost_per_day": 0.80
}')
echo "  Freshwater tank: $FRESH_TANK"

# ── Tank Events ───────────────────────────────────────────────────
echo "[3/13] Adding tank events..."

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
echo "[4/13] Adding livestock..."

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
echo "[5/13] Adding equipment..."

# Saltwater equipment
post_quiet "$API/equipment/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Radion G6 Pro\",\"equipment_type\":\"light\",\"manufacturer\":\"EcoTech Marine\",\"model\":\"G6 Pro\",\"purchase_date\":\"2024-11-10\",\"purchase_price\":\"899.00\",\"condition\":\"excellent\",\"status\":\"active\",\"notes\":\"Running AB+ schedule at 60% intensity\"}"
post_quiet "$API/equipment/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Vectra M2\",\"equipment_type\":\"pump\",\"manufacturer\":\"EcoTech Marine\",\"model\":\"Vectra M2\",\"purchase_date\":\"2024-03-01\",\"purchase_price\":\"449.00\",\"condition\":\"good\",\"status\":\"active\",\"notes\":\"Return pump, running at 70%\"}"
post_quiet "$API/equipment/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Nyos Quantum 160\",\"equipment_type\":\"skimmer\",\"manufacturer\":\"Nyos\",\"model\":\"Quantum 160\",\"purchase_date\":\"2024-03-01\",\"purchase_price\":\"650.00\",\"condition\":\"good\",\"status\":\"active\",\"notes\":\"Wet skim setting, cleaned weekly\"}"
post_quiet "$API/equipment/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"MP40 Vortech\",\"equipment_type\":\"wavemaker\",\"manufacturer\":\"EcoTech Marine\",\"model\":\"MP40w\",\"purchase_date\":\"2024-03-01\",\"purchase_price\":\"549.00\",\"condition\":\"good\",\"status\":\"active\",\"notes\":\"2 units in anti-sync reef crest mode\"}"
post_quiet "$API/equipment/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"GHL Doser 2.1\",\"equipment_type\":\"doser\",\"manufacturer\":\"GHL\",\"model\":\"Doser 2.1\",\"purchase_date\":\"2024-04-15\",\"purchase_price\":\"350.00\",\"condition\":\"good\",\"status\":\"active\",\"notes\":\"4-head dosing: Alk, Ca, Mg, trace elements\"}"
post_quiet "$API/equipment/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Apex Controller\",\"equipment_type\":\"controller\",\"manufacturer\":\"Neptune Systems\",\"model\":\"Apex 2024\",\"purchase_date\":\"2024-03-01\",\"purchase_price\":\"999.00\",\"condition\":\"excellent\",\"status\":\"active\",\"notes\":\"Monitoring pH, temp, ORP, salinity\"}"

# Freshwater equipment
post_quiet "$API/equipment/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Fluval FX4\",\"equipment_type\":\"filter\",\"manufacturer\":\"Fluval\",\"model\":\"FX4\",\"purchase_date\":\"2024-09-01\",\"purchase_price\":\"299.00\",\"condition\":\"good\",\"status\":\"active\",\"notes\":\"Canister filter with bio media, cleaned monthly\"}"
post_quiet "$API/equipment/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Fluval Plant 3.0\",\"equipment_type\":\"light\",\"manufacturer\":\"Fluval\",\"model\":\"Plant Spectrum 3.0 46W\",\"purchase_date\":\"2024-09-01\",\"purchase_price\":\"189.00\",\"condition\":\"good\",\"status\":\"active\",\"notes\":\"Custom schedule: 8h photoperiod with ramp\"}"
post_quiet "$API/equipment/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"CO2Art Pro-Elite\",\"equipment_type\":\"other\",\"manufacturer\":\"CO2Art\",\"model\":\"Pro-Elite Regulator\",\"purchase_date\":\"2025-03-01\",\"purchase_price\":\"175.00\",\"condition\":\"excellent\",\"status\":\"active\",\"notes\":\"CO2 system — 2 BPS via inline diffuser, pH controller shutoff\"}"
post_quiet "$API/equipment/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Eheim Jager 200W\",\"equipment_type\":\"heater\",\"manufacturer\":\"Eheim\",\"model\":\"Jager 200W\",\"purchase_date\":\"2024-09-01\",\"purchase_price\":\"39.00\",\"condition\":\"good\",\"status\":\"active\",\"notes\":\"Set to 26°C\"}"

# ── Consumables (from Stock matériel inventory) ──────────────────
echo "[6/13] Adding saltwater consumables..."

# Decoration
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"CORALGUM\",\"consumable_type\":\"other\",\"brand\":\"Tunze\",\"product_name\":\"112g\",\"quantity_on_hand\":2,\"quantity_unit\":\"units\",\"purchase_price\":\"12.99\",\"purchase_url\":\"https://www.zoanthus.fr/fr/bouturage/2218-tunze-coral-gum-112-g-0104740-4025167010415.html\",\"status\":\"active\",\"notes\":\"Epoxy putty-glue for secure coral frag mounting.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"AF Gel Fix\",\"consumable_type\":\"other\",\"brand\":\"Aquaforest\",\"product_name\":\"20g\",\"quantity_on_hand\":2,\"quantity_unit\":\"units\",\"purchase_price\":\"19.90\",\"purchase_url\":\"https://aquaforest.eu/en/products/seawater/aquascaping/af-gel-fix/\",\"status\":\"active\",\"notes\":\"Fast-drying gel for precise coral gluing. Bonds in 10 seconds.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Afix Glue\",\"consumable_type\":\"other\",\"brand\":\"Aquaforest\",\"product_name\":\"110g\",\"quantity_on_hand\":2,\"quantity_unit\":\"units\",\"purchase_price\":\"12.13\",\"status\":\"active\",\"notes\":\"Two-component paste for fixing hard corals and rocks.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"CoraFix ThermoFrag\",\"consumable_type\":\"other\",\"brand\":\"Grotech\",\"product_name\":\"200g\",\"quantity_on_hand\":3,\"quantity_unit\":\"units\",\"purchase_price\":\"19.99\",\"status\":\"active\",\"notes\":\"Thermoplastic biopolymer resin for coral fragging. Melting point 44°C.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"CoraFix SuperFast\",\"consumable_type\":\"other\",\"brand\":\"Grotech\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"27.00\",\"status\":\"active\"}"

# Food
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"ZOO-TONIC\",\"consumable_type\":\"food\",\"brand\":\"Tropic Marin\",\"product_name\":\"50ml\",\"quantity_on_hand\":4,\"quantity_unit\":\"units\",\"purchase_price\":\"19.90\",\"purchase_url\":\"https://www.tropic-marin-smartinfo.com/zootonic?lang=en\",\"status\":\"active\",\"notes\":\"Plankton replacement for filter feeders — amino acids, fatty acids, vitamins.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"ZOO-TONIC (small)\",\"consumable_type\":\"food\",\"brand\":\"Tropic Marin\",\"product_name\":\"50ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"12.80\",\"status\":\"active\",\"notes\":\"Plankton replacement (smaller bottle).\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Druide Sponge Coraux\",\"consumable_type\":\"food\",\"product_name\":\"50ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"17.00\",\"status\":\"active\",\"notes\":\"Boosts growth of ornamental sponges and gorgonians.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"LIQUIZELL\",\"consumable_type\":\"food\",\"brand\":\"Hobby\",\"product_name\":\"20ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"8.89\",\"status\":\"active\",\"notes\":\"Breeding food for artemia nauplii and invertebrates.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Artemia\",\"consumable_type\":\"food\",\"brand\":\"Hobby\",\"product_name\":\"20ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"6.98\",\"status\":\"active\",\"notes\":\"Artemia eggs for hatching — ideal live food for fry.\"}"

# Gear
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Magnetic Brush\",\"consumable_type\":\"other\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"83.00\",\"status\":\"active\",\"notes\":\"Magnetic glass cleaner with observation mirror.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"NanoStream\",\"consumable_type\":\"other\",\"brand\":\"Tunze\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"64.40\",\"status\":\"active\",\"notes\":\"Compact propeller pump — 4500 l/h at only 5W.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Super Flow Pump 1500\",\"consumable_type\":\"other\",\"brand\":\"Seio\",\"product_name\":\"1500\",\"quantity_on_hand\":3,\"quantity_unit\":\"units\",\"purchase_price\":\"50.00\",\"status\":\"active\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Super Flow Pump 530\",\"consumable_type\":\"other\",\"brand\":\"Seio\",\"product_name\":\"530\",\"quantity_on_hand\":2,\"quantity_unit\":\"units\",\"purchase_price\":\"30.00\",\"status\":\"active\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Super Flow Pump 320\",\"consumable_type\":\"other\",\"brand\":\"Seio\",\"product_name\":\"320\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"20.00\",\"status\":\"active\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Return Pump\",\"consumable_type\":\"other\",\"brand\":\"Cadrim\",\"product_name\":\"580GPH\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"30.00\",\"status\":\"active\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Return Pump\",\"consumable_type\":\"other\",\"brand\":\"Newjet\",\"product_name\":\"1200\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"45.00\",\"status\":\"active\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Jecod RW4\",\"consumable_type\":\"other\",\"brand\":\"Jebao\",\"product_name\":\"RW4\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"69.00\",\"status\":\"active\",\"notes\":\"Wavemaker pump.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Internal Filter AP-1000\",\"consumable_type\":\"other\",\"brand\":\"Hidom\",\"product_name\":\"AP-1000\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"14.00\",\"status\":\"active\",\"notes\":\"Internal filter with spray bar and venturi adapter.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"ATO Refill System\",\"consumable_type\":\"other\",\"brand\":\"Jebao\",\"product_name\":\"Jebao-150\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"35.00\",\"status\":\"active\",\"notes\":\"Auto top-off water level controller.\"}"

# Medication
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Coral Rx Pro\",\"consumable_type\":\"medication\",\"brand\":\"Coral Dip\",\"product_name\":\"30ml\",\"quantity_on_hand\":2,\"quantity_unit\":\"units\",\"purchase_price\":\"23.99\",\"status\":\"active\",\"notes\":\"Eliminates acropora flatworms, montipora nudibranch, and zoanthid parasites.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"AIPTASIA-X\",\"consumable_type\":\"medication\",\"brand\":\"Red Sea\",\"product_name\":\"60ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"18.90\",\"status\":\"active\",\"notes\":\"Aiptasia elimination — sticky formula triggers ingestion and implosion.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"EXIT\",\"consumable_type\":\"medication\",\"brand\":\"eSHa\",\"product_name\":\"20ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"6.45\",\"status\":\"active\",\"notes\":\"Treats white spot disease (Ich) and Oodinium.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"OODINEX\",\"consumable_type\":\"medication\",\"brand\":\"eSHa\",\"product_name\":\"20ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"7.49\",\"status\":\"active\",\"notes\":\"Treats 8 common reef diseases.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Aiptasia X Refill\",\"consumable_type\":\"medication\",\"brand\":\"Red Sea\",\"product_name\":\"415ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"74.00\",\"status\":\"active\",\"notes\":\"Large refill for Aiptasia-X treatment system.\"}"

# Water treatment / Additives
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"ELIMI-NP\",\"consumable_type\":\"additive\",\"brand\":\"Tropic Marin\",\"product_name\":\"50ml\",\"quantity_on_hand\":5,\"quantity_unit\":\"units\",\"purchase_price\":\"19.90\",\"purchase_url\":\"https://www.tropic-marin-smartinfo.com/elimi-np?lang=en\",\"status\":\"active\",\"notes\":\"Carbon dosing concentrate for nitrate/phosphate reduction.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"PRO-CORAL IODINE\",\"consumable_type\":\"additive\",\"brand\":\"Tropic Marin\",\"product_name\":\"50ml\",\"quantity_on_hand\":5,\"quantity_unit\":\"units\",\"purchase_price\":\"12.00\",\"status\":\"active\",\"notes\":\"Iodine supplement — essential for crustacean molting and coralline algae.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Nitribiotic\",\"consumable_type\":\"additive\",\"brand\":\"Tropic Marin\",\"product_name\":\"50ml\",\"quantity_on_hand\":3,\"quantity_unit\":\"units\",\"purchase_price\":\"12.00\",\"status\":\"active\",\"notes\":\"Probiotic + nitrifying bacteria — activates nitrification cycle.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"ELIMI-NP (large)\",\"consumable_type\":\"additive\",\"brand\":\"Tropic Marin\",\"product_name\":\"200ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"13.90\",\"status\":\"active\",\"notes\":\"Carbon dosing concentrate (larger bottle).\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"AF Protect Dip\",\"consumable_type\":\"additive\",\"brand\":\"Aquaforest\",\"product_name\":\"50ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"15.90\",\"status\":\"active\",\"notes\":\"Coral quarantine dip — reduces tissue necrosis, bleaching, and brown jelly.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"KH Alkalinity Test\",\"consumable_type\":\"test_kit\",\"brand\":\"Tropic Marin\",\"product_name\":\"100 tests\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"11.90\",\"status\":\"active\",\"notes\":\"KH/alkalinity test kit — measures buffering capacity.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"CareBacter\",\"consumable_type\":\"additive\",\"brand\":\"Tunze\",\"product_name\":\"40ml\",\"quantity_on_hand\":2,\"quantity_unit\":\"units\",\"purchase_price\":\"27.40\",\"status\":\"active\",\"notes\":\"Bacteria on Maerl gravel substrate — keeps aquarium clean.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"NitraPhos Minus\",\"consumable_type\":\"additive\",\"brand\":\"Aquaforest\",\"product_name\":\"250ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"9.89\",\"status\":\"active\",\"notes\":\"Activates nutrient-consuming bacteria — converts nitrate/phosphate to biomass.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Nitrate Plus\",\"consumable_type\":\"additive\",\"brand\":\"Colombo\",\"product_name\":\"500ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"11.90\",\"status\":\"active\",\"notes\":\"Replenishes nitrate levels in coral-heavy tanks with nitrate deficiency.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Phosguard\",\"consumable_type\":\"additive\",\"brand\":\"Seachem\",\"product_name\":\"1l\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"30.59\",\"status\":\"active\",\"notes\":\"Phosphate/silicate removal media for marine and freshwater.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Calcium\",\"consumable_type\":\"additive\",\"brand\":\"Aquaforest\",\"product_name\":\"850g\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"9.89\",\"status\":\"active\",\"notes\":\"Calcium supplement — maintains 380-460 mg/l for coral growth.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Magnesium\",\"consumable_type\":\"additive\",\"brand\":\"Aquaforest\",\"product_name\":\"750g\",\"quantity_on_hand\":2,\"quantity_unit\":\"units\",\"purchase_price\":\"6.75\",\"status\":\"active\",\"notes\":\"Magnesium supplement — ideal range 1180-1460 mg/l.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Carbon\",\"consumable_type\":\"additive\",\"brand\":\"Aquaforest\",\"product_name\":\"1l\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"11.25\",\"status\":\"active\",\"notes\":\"Activated carbon — removes unwanted chemical compounds.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Zeo Mix\",\"consumable_type\":\"additive\",\"brand\":\"Aquaforest\",\"product_name\":\"1l\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"10.00\",\"status\":\"active\",\"notes\":\"Zeolite blend — replace every 6 weeks for optimal filtration.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Reef Crystals\",\"consumable_type\":\"additive\",\"brand\":\"Aquarium Systems\",\"product_name\":\"4 kg\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"45.00\",\"status\":\"active\",\"notes\":\"Enriched reef salt — extra calcium, vitamins, and trace elements.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$SALT_TANK\",\"name\":\"Osmoseur\",\"consumable_type\":\"additive\",\"brand\":\"Aquavie\",\"product_name\":\"380l/j\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"89.70\",\"status\":\"active\",\"notes\":\"RO unit — produces high-quality osmosis water from tap water.\"}"

# ── Freshwater Consumables ────────────────────────────────────────
echo "[7/13] Adding freshwater consumables..."

# Plant fertilizers
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Flourish Comprehensive\",\"consumable_type\":\"supplement\",\"brand\":\"Seachem\",\"product_name\":\"500ml\",\"quantity_on_hand\":2,\"quantity_unit\":\"units\",\"purchase_price\":\"14.99\",\"status\":\"active\",\"notes\":\"Comprehensive plant supplement — micro and macro nutrients. Dose 5ml per 250L twice weekly.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Flourish Excel\",\"consumable_type\":\"supplement\",\"brand\":\"Seachem\",\"product_name\":\"500ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"16.99\",\"status\":\"active\",\"notes\":\"Liquid carbon supplement — bioavailable organic carbon for plant growth. Alternative to CO2 injection.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Flourish Iron\",\"consumable_type\":\"supplement\",\"brand\":\"Seachem\",\"product_name\":\"250ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"9.99\",\"status\":\"active\",\"notes\":\"Ferrous iron supplement for plants showing chlorosis. Dose 5ml per 200L every other day.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Tropica Specialised Nutrition\",\"consumable_type\":\"supplement\",\"brand\":\"Tropica\",\"product_name\":\"300ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"19.50\",\"status\":\"active\",\"notes\":\"Complete liquid fertilizer with N, P, K, Fe, and micronutrients for demanding plants.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Root Tabs\",\"consumable_type\":\"supplement\",\"brand\":\"Seachem\",\"product_name\":\"40 tabs\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"12.99\",\"status\":\"active\",\"notes\":\"Substrate fertilizer tablets for root-feeding plants like swords and crypts. Replace every 3 months.\"}"

# Water conditioners
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Prime\",\"consumable_type\":\"additive\",\"brand\":\"Seachem\",\"product_name\":\"500ml\",\"quantity_on_hand\":2,\"quantity_unit\":\"units\",\"purchase_price\":\"14.99\",\"status\":\"active\",\"notes\":\"Complete water conditioner — removes chlorine, chloramine, detoxifies ammonia, nitrite, nitrate.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"GH/KH+\",\"consumable_type\":\"additive\",\"brand\":\"SaltyShrimp\",\"product_name\":\"230g\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"18.90\",\"status\":\"active\",\"notes\":\"Remineralizer for RO water. Target GH 5-6, KH 2-3 for soft water biotope.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Indian Almond Leaves\",\"consumable_type\":\"additive\",\"brand\":\"Catappa Canada\",\"product_name\":\"50 leaves\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"24.99\",\"status\":\"active\",\"notes\":\"Releases tannins and humic acids. Anti-fungal and anti-bacterial. Add 2-3 per 100L.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Stability\",\"consumable_type\":\"additive\",\"brand\":\"Seachem\",\"product_name\":\"250ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"11.99\",\"status\":\"active\",\"notes\":\"Beneficial bacteria supplement for establishing and maintaining biological filtration.\"}"

# Food
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Bug Bites Tropical\",\"consumable_type\":\"food\",\"brand\":\"Fluval\",\"product_name\":\"125g\",\"quantity_on_hand\":2,\"quantity_unit\":\"units\",\"purchase_price\":\"8.99\",\"status\":\"active\",\"notes\":\"Black soldier fly larvae based formula. Perfect for tetras, apistos, and corydoras.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Bug Bites Bottom Feeder\",\"consumable_type\":\"food\",\"brand\":\"Fluval\",\"product_name\":\"130g\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"8.99\",\"status\":\"active\",\"notes\":\"Sinking granules for corydoras and bottom dwellers. Rich in protein.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Frozen Bloodworms\",\"consumable_type\":\"food\",\"brand\":\"Hikari\",\"product_name\":\"100g\",\"quantity_on_hand\":3,\"quantity_unit\":\"units\",\"purchase_price\":\"7.49\",\"status\":\"active\",\"notes\":\"UV sterilized frozen bloodworms. Weekly treat for all fish. Thaw before feeding.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Algae Wafers\",\"consumable_type\":\"food\",\"brand\":\"Hikari\",\"product_name\":\"82g\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"6.99\",\"status\":\"active\",\"notes\":\"Sinking wafers for otocinclus and shrimp. Supplement when algae levels are low.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Shrimp King Complete\",\"consumable_type\":\"food\",\"brand\":\"Dennerle\",\"product_name\":\"45g\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"9.99\",\"status\":\"active\",\"notes\":\"Complete feed for Amano shrimp with moringa, spinach, and walnut leaves.\"}"

# Test kits
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Freshwater Master Kit\",\"consumable_type\":\"test_kit\",\"brand\":\"API\",\"product_name\":\"800 tests\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"29.99\",\"status\":\"active\",\"notes\":\"Liquid test kit: pH, ammonia, nitrite, nitrate. More accurate than strips.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"GH & KH Test Kit\",\"consumable_type\":\"test_kit\",\"brand\":\"API\",\"product_name\":\"180 tests\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"12.99\",\"status\":\"active\",\"notes\":\"General and carbonate hardness test. Essential for soft water biotope monitoring.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"CO2 Drop Checker\",\"consumable_type\":\"test_kit\",\"brand\":\"CO2Art\",\"product_name\":\"with 4dKH solution\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"14.99\",\"status\":\"active\",\"notes\":\"Continuous CO2 monitoring. Green = 30ppm (ideal), blue = too low, yellow = too high.\"}"

# Filter media
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Purigen\",\"consumable_type\":\"filter_media\",\"brand\":\"Seachem\",\"product_name\":\"250ml\",\"quantity_on_hand\":2,\"quantity_unit\":\"units\",\"purchase_price\":\"24.99\",\"status\":\"active\",\"notes\":\"Premium synthetic adsorbent — removes dissolved organics, keeps water crystal clear. Regenerate with bleach.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Filter Floss Pads\",\"consumable_type\":\"filter_media\",\"brand\":\"Fluval\",\"product_name\":\"6 pack\",\"quantity_on_hand\":2,\"quantity_unit\":\"units\",\"purchase_price\":\"8.99\",\"status\":\"active\",\"notes\":\"Mechanical filtration pads for FX4. Replace monthly, rinse in tank water.\"}"

# Medication
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"ParaGuard\",\"consumable_type\":\"medication\",\"brand\":\"Seachem\",\"product_name\":\"250ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"11.99\",\"status\":\"active\",\"notes\":\"Aldehyde-based external parasiticide. Safe for sensitive fish. Treats ich, velvet, fungus.\"}"
post_quiet "$API/consumables/" "{\"tank_id\":\"$FRESH_TANK\",\"name\":\"Pimafix\",\"consumable_type\":\"medication\",\"brand\":\"API\",\"product_name\":\"237ml\",\"quantity_on_hand\":1,\"quantity_unit\":\"units\",\"purchase_price\":\"10.49\",\"status\":\"active\",\"notes\":\"Natural antifungal remedy from West Indian Bay Tree. Safe for scaleless fish and shrimp.\"}"

# ── Maintenance Reminders ─────────────────────────────────────────
echo "[8/13] Adding maintenance reminders..."

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
echo "[9/13] Adding notes..."

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
echo "[10/13] Submitting parameter readings..."

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

# ── ICP Tests (saltwater only) ────────────────────────────────────
echo "[11/13] Adding ICP test results..."

# ICP Test 1: August 2024 — first test after cycle, mostly good
post_quiet "$API/icp-tests/" "{\"tank_id\":\"$SALT_TANK\",\"test_date\":\"2024-08-15\",\"lab_name\":\"ATI\",\"test_id\":\"ATI-2024-08-001\",\"water_type\":\"saltwater\",\"sample_date\":\"2024-08-10\",\"received_date\":\"2024-08-13\",\"evaluated_date\":\"2024-08-15\",\"score_major_elements\":88,\"score_minor_elements\":72,\"score_pollutants\":95,\"score_base_elements\":90,\"score_overall\":86,\"salinity\":35.2,\"salinity_status\":\"ok\",\"kh\":7.8,\"kh_status\":\"low\",\"cl\":20100,\"cl_status\":\"ok\",\"na\":10800,\"na_status\":\"ok\",\"mg\":1340,\"mg_status\":\"ok\",\"s\":930,\"s_status\":\"ok\",\"ca\":425,\"ca_status\":\"ok\",\"k\":405,\"k_status\":\"ok\",\"br\":68,\"br_status\":\"ok\",\"sr\":8.4,\"sr_status\":\"ok\",\"b\":4.8,\"b_status\":\"ok\",\"f\":1.3,\"f_status\":\"ok\",\"li\":180,\"li_status\":\"ok\",\"si\":120,\"si_status\":\"ok\",\"i\":52,\"i_status\":\"low\",\"ba\":8,\"ba_status\":\"ok\",\"mo\":10,\"mo_status\":\"ok\",\"ni\":1.2,\"ni_status\":\"ok\",\"mn\":0.5,\"mn_status\":\"ok\",\"fe\":2.1,\"fe_status\":\"ok\",\"cu\":1.8,\"cu_status\":\"ok\",\"zn\":4.2,\"zn_status\":\"ok\",\"sn\":3.5,\"sn_status\":\"high\",\"no3\":3.2,\"no3_status\":\"ok\",\"po4\":0.04,\"po4_status\":\"ok\",\"al\":5,\"al_status\":\"ok\",\"pb\":0,\"pb_status\":\"ok\",\"notes\":\"First ICP test after cycle. Slight tin contamination detected — likely from heater element. Iodine low, started dosing Tropic Marin iodine.\"}"

# ICP Test 2: January 2025 — improved after adjustments
post_quiet "$API/icp-tests/" "{\"tank_id\":\"$SALT_TANK\",\"test_date\":\"2025-01-20\",\"lab_name\":\"ATI\",\"test_id\":\"ATI-2025-01-042\",\"water_type\":\"saltwater\",\"sample_date\":\"2025-01-15\",\"received_date\":\"2025-01-18\",\"evaluated_date\":\"2025-01-20\",\"score_major_elements\":94,\"score_minor_elements\":88,\"score_pollutants\":98,\"score_base_elements\":95,\"score_overall\":94,\"salinity\":35.0,\"salinity_status\":\"ok\",\"kh\":8.4,\"kh_status\":\"ok\",\"cl\":19800,\"cl_status\":\"ok\",\"na\":10700,\"na_status\":\"ok\",\"mg\":1360,\"mg_status\":\"ok\",\"s\":920,\"s_status\":\"ok\",\"ca\":435,\"ca_status\":\"ok\",\"k\":398,\"k_status\":\"ok\",\"br\":67,\"br_status\":\"ok\",\"sr\":8.6,\"sr_status\":\"ok\",\"b\":4.6,\"b_status\":\"ok\",\"f\":1.2,\"f_status\":\"ok\",\"li\":175,\"li_status\":\"ok\",\"si\":85,\"si_status\":\"ok\",\"i\":60,\"i_status\":\"ok\",\"ba\":7,\"ba_status\":\"ok\",\"mo\":11,\"mo_status\":\"ok\",\"ni\":0.8,\"ni_status\":\"ok\",\"mn\":0.4,\"mn_status\":\"ok\",\"fe\":1.8,\"fe_status\":\"ok\",\"cu\":1.2,\"cu_status\":\"ok\",\"zn\":3.8,\"zn_status\":\"ok\",\"sn\":1.2,\"sn_status\":\"ok\",\"no3\":2.8,\"no3_status\":\"ok\",\"po4\":0.03,\"po4_status\":\"ok\",\"al\":3,\"al_status\":\"ok\",\"pb\":0,\"pb_status\":\"ok\",\"notes\":\"Significant improvement. Tin levels normalized after heater replacement. Iodine back to optimal with regular dosing. All corals showing excellent polyp extension.\"}"

# ICP Test 3: July 2025 — stable mature system
post_quiet "$API/icp-tests/" "{\"tank_id\":\"$SALT_TANK\",\"test_date\":\"2025-07-10\",\"lab_name\":\"ATI\",\"test_id\":\"ATI-2025-07-089\",\"water_type\":\"saltwater\",\"sample_date\":\"2025-07-05\",\"received_date\":\"2025-07-08\",\"evaluated_date\":\"2025-07-10\",\"score_major_elements\":96,\"score_minor_elements\":92,\"score_pollutants\":100,\"score_base_elements\":97,\"score_overall\":96,\"salinity\":35.1,\"salinity_status\":\"ok\",\"kh\":8.8,\"kh_status\":\"ok\",\"cl\":19900,\"cl_status\":\"ok\",\"na\":10750,\"na_status\":\"ok\",\"mg\":1380,\"mg_status\":\"ok\",\"s\":925,\"s_status\":\"ok\",\"ca\":440,\"ca_status\":\"ok\",\"k\":400,\"k_status\":\"ok\",\"br\":68,\"br_status\":\"ok\",\"sr\":8.8,\"sr_status\":\"ok\",\"b\":4.5,\"b_status\":\"ok\",\"f\":1.3,\"f_status\":\"ok\",\"li\":178,\"li_status\":\"ok\",\"si\":60,\"si_status\":\"ok\",\"i\":58,\"i_status\":\"ok\",\"ba\":6,\"ba_status\":\"ok\",\"mo\":12,\"mo_status\":\"ok\",\"ni\":0.6,\"ni_status\":\"ok\",\"mn\":0.3,\"mn_status\":\"ok\",\"fe\":1.5,\"fe_status\":\"ok\",\"cu\":0.9,\"cu_status\":\"ok\",\"zn\":3.2,\"zn_status\":\"ok\",\"sn\":0.5,\"sn_status\":\"ok\",\"no3\":4.1,\"no3_status\":\"ok\",\"po4\":0.035,\"po4_status\":\"ok\",\"al\":2,\"al_status\":\"ok\",\"pb\":0,\"pb_status\":\"ok\",\"notes\":\"Mature system — all elements stable and within ideal range. Zero pollutants. Coral growth is excellent, Acropora encrusting onto surrounding rocks.\"}"

# ── Feeding Schedules ─────────────────────────────────────────────
echo "[12/13] Adding feeding schedules..."

# Saltwater feeding schedules
post_quiet "$API/feeding/schedules" "{\"tank_id\":\"$SALT_TANK\",\"food_name\":\"PE Mysis Shrimp\",\"quantity\":2,\"quantity_unit\":\"cube\",\"frequency_hours\":12,\"notes\":\"Morning and evening feeding for all fish\",\"is_active\":true}"
post_quiet "$API/feeding/schedules" "{\"tank_id\":\"$SALT_TANK\",\"food_name\":\"LRS Reef Frenzy\",\"quantity\":1,\"quantity_unit\":\"cube\",\"frequency_hours\":24,\"notes\":\"Evening broadcast for corals and clam\",\"is_active\":true}"
post_quiet "$API/feeding/schedules" "{\"tank_id\":\"$SALT_TANK\",\"food_name\":\"ZOO-TONIC\",\"quantity\":2,\"quantity_unit\":\"drop\",\"frequency_hours\":48,\"notes\":\"Plankton replacement for filter feeders — dose after lights off\",\"is_active\":true}"
post_quiet "$API/feeding/schedules" "{\"tank_id\":\"$SALT_TANK\",\"food_name\":\"Hikari Marine S Pellets\",\"quantity\":1,\"quantity_unit\":\"pinch\",\"frequency_hours\":12,\"notes\":\"Midday autofeeder portion for anthias\",\"is_active\":true}"
post_quiet "$API/feeding/schedules" "{\"tank_id\":\"$SALT_TANK\",\"food_name\":\"Artemia Nauplii\",\"quantity\":5,\"quantity_unit\":\"ml\",\"frequency_hours\":72,\"notes\":\"Live hatched artemia for anthias and clownfish fry\",\"is_active\":false}"

# Freshwater feeding schedules
post_quiet "$API/feeding/schedules" "{\"tank_id\":\"$FRESH_TANK\",\"food_name\":\"Bug Bites Tropical\",\"quantity\":1,\"quantity_unit\":\"pinch\",\"frequency_hours\":12,\"notes\":\"Staple food for tetras and apistos — morning and evening\",\"is_active\":true}"
post_quiet "$API/feeding/schedules" "{\"tank_id\":\"$FRESH_TANK\",\"food_name\":\"Bug Bites Bottom Feeder\",\"quantity\":3,\"quantity_unit\":\"piece\",\"frequency_hours\":24,\"notes\":\"Sinking granules for corydoras — drop at dusk\",\"is_active\":true}"
post_quiet "$API/feeding/schedules" "{\"tank_id\":\"$FRESH_TANK\",\"food_name\":\"Frozen Bloodworms\",\"quantity\":1,\"quantity_unit\":\"cube\",\"frequency_hours\":168,\"notes\":\"Weekly treat for all fish — thaw before feeding\",\"is_active\":true}"
post_quiet "$API/feeding/schedules" "{\"tank_id\":\"$FRESH_TANK\",\"food_name\":\"Algae Wafers\",\"quantity\":1,\"quantity_unit\":\"piece\",\"frequency_hours\":48,\"notes\":\"For otocinclus and amano shrimp\",\"is_active\":true}"
post_quiet "$API/feeding/schedules" "{\"tank_id\":\"$FRESH_TANK\",\"food_name\":\"Shrimp King Complete\",\"quantity\":1,\"quantity_unit\":\"piece\",\"frequency_hours\":72,\"notes\":\"Supplemental feed for amano shrimp colony\",\"is_active\":true}"

# ── Disease/Health Records ────────────────────────────────────────
echo "[13/13] Adding disease records and treatments..."

# Lookup livestock IDs for disease linking
SALT_TANG=$(lookup_livestock "$SALT_TANK" "Paracanthurus")
SALT_ACRO=$(lookup_livestock "$SALT_TANK" "Acropora millepora")
SALT_MONTI=$(lookup_livestock "$SALT_TANK" "Montipora")
FRESH_CARDINAL=$(lookup_livestock "$FRESH_TANK" "Paracheirodon")
FRESH_CORY=$(lookup_livestock "$FRESH_TANK" "Corydoras")

# 1. Marine Ich on Blue Tang — resolved, severe
if [ -n "$SALT_TANG" ]; then
  D1=$(post "$API/diseases/" "{\"livestock_id\":\"$SALT_TANG\",\"tank_id\":\"$SALT_TANK\",\"disease_name\":\"Marine Ich (Cryptocaryon irritans)\",\"symptoms\":\"White spots on body and fins, flashing against rocks, loss of appetite\",\"diagnosis\":\"Cryptocaryon irritans confirmed by visual inspection under magnification\",\"severity\":\"severe\",\"status\":\"resolved\",\"detected_date\":\"2025-01-10\",\"resolved_date\":\"2025-02-14\",\"outcome\":\"Full recovery after 5-week copper treatment in quarantine\",\"notes\":\"Caught early due to daily visual inspections. Tang was isolated within hours of first spots appearing.\"}")
  if [ -n "$D1" ]; then
    post_quiet "$API/diseases/$D1/treatments" '{"treatment_type":"quarantine","treatment_name":"Quarantine isolation","treatment_date":"2025-01-10","duration_days":35,"effectiveness":"effective","notes":"Moved to 75L quarantine tank with bare bottom and PVC fittings"}'
    post_quiet "$API/diseases/$D1/treatments" '{"treatment_type":"medication","treatment_name":"Copper Power treatment","dosage":"0.5 ppm therapeutic level","treatment_date":"2025-01-11","duration_days":30,"effectiveness":"effective","notes":"Maintained copper at 0.5 ppm, tested twice daily with Hanna checker"}'
    post_quiet "$API/diseases/$D1/treatments" '{"treatment_type":"water_change","treatment_name":"Daily 10% water change","treatment_date":"2025-01-11","duration_days":30,"effectiveness":"effective","notes":"Maintained water quality during copper treatment, matched temp and salinity"}'
  fi
fi

# 2. RTN on Acropora — monitoring, moderate
if [ -n "$SALT_ACRO" ]; then
  D2=$(post "$API/diseases/" "{\"livestock_id\":\"$SALT_ACRO\",\"tank_id\":\"$SALT_TANK\",\"disease_name\":\"Rapid Tissue Necrosis (RTN)\",\"symptoms\":\"Tissue loss from base of one colony, white skeleton exposed\",\"diagnosis\":\"RTN — rapid tissue recession starting at base, likely triggered by alkalinity swing\",\"severity\":\"moderate\",\"status\":\"monitoring\",\"detected_date\":\"2026-01-20\",\"notes\":\"Alkalinity dropped from 8.5 to 7.2 dKH overnight due to dosing pump malfunction. One colony affected.\"}")
  if [ -n "$D2" ]; then
    post_quiet "$API/diseases/$D2/treatments" '{"treatment_type":"dip","treatment_name":"CoralRx Pro dip","dosage":"20ml per 4L for 10 minutes","treatment_date":"2026-01-20","effectiveness":"partially_effective","notes":"Immediate dip to slow progression, removed loose tissue"}'
    post_quiet "$API/diseases/$D2/treatments" '{"treatment_type":"other","treatment_name":"Emergency fragging","treatment_date":"2026-01-21","effectiveness":"effective","notes":"Cut 3 healthy branches above recession line, mounted on new plugs"}'
    post_quiet "$API/diseases/$D2/treatments" '{"treatment_type":"other","treatment_name":"Flow adjustment","treatment_date":"2026-01-21","effectiveness":"too_early","notes":"Increased flow around remaining colony to improve oxygenation"}'
  fi
fi

# 3. Flatworms on Montipora — resolved, mild
if [ -n "$SALT_MONTI" ]; then
  D3=$(post "$API/diseases/" "{\"livestock_id\":\"$SALT_MONTI\",\"tank_id\":\"$SALT_TANK\",\"disease_name\":\"Montipora Eating Nudibranchs\",\"symptoms\":\"Small white marks and tissue loss on Montipora digitata, tiny egg spirals visible\",\"severity\":\"mild\",\"status\":\"resolved\",\"detected_date\":\"2025-08-05\",\"resolved_date\":\"2025-08-20\",\"outcome\":\"All nudibranchs and eggs eliminated after 3 weekly dips\",\"notes\":\"Found during routine coral inspection with magnifying glass.\"}")
  if [ -n "$D3" ]; then
    post_quiet "$API/diseases/$D3/treatments" '{"treatment_type":"dip","treatment_name":"CoralRx Pro dip","dosage":"20ml per 4L for 15 minutes","treatment_date":"2025-08-05","effectiveness":"effective","notes":"First dip — removed 6 nudibranchs, scrubbed egg spirals with soft brush"}'
  fi
fi

# 4. Ich on Cardinal Tetras — resolved, moderate
if [ -n "$FRESH_CARDINAL" ]; then
  D4=$(post "$API/diseases/" "{\"livestock_id\":\"$FRESH_CARDINAL\",\"tank_id\":\"$FRESH_TANK\",\"disease_name\":\"Freshwater Ich (Ichthyophthirius multifiliis)\",\"symptoms\":\"White spots on 5 of 20 cardinals, clamped fins, reduced schooling behavior\",\"diagnosis\":\"Classic ich presentation — white cyst stage visible\",\"severity\":\"moderate\",\"status\":\"resolved\",\"detected_date\":\"2025-04-12\",\"resolved_date\":\"2025-04-28\",\"outcome\":\"All fish recovered, no losses. Temperature method combined with ParaGuard was effective.\",\"notes\":\"Likely introduced via new plants that were not properly quarantined.\"}")
  if [ -n "$D4" ]; then
    post_quiet "$API/diseases/$D4/treatments" '{"treatment_type":"temperature","treatment_name":"Gradual temperature raise","dosage":"Raised from 26°C to 30°C over 48 hours","treatment_date":"2025-04-12","duration_days":14,"effectiveness":"effective","notes":"Accelerates ich lifecycle, combined with medication for full treatment"}'
    post_quiet "$API/diseases/$D4/treatments" '{"treatment_type":"medication","treatment_name":"ParaGuard treatment","dosage":"5ml per 40L daily","treatment_date":"2025-04-13","duration_days":14,"effectiveness":"effective","notes":"Dosed daily for 2 weeks, safe for tetras and shrimp at half dose"}'
    post_quiet "$API/diseases/$D4/treatments" '{"treatment_type":"water_change","treatment_name":"50% water changes every 3 days","treatment_date":"2025-04-14","duration_days":14,"effectiveness":"effective","notes":"Large water changes to remove free-swimming theronts and maintain water quality"}'
  fi
fi

# 5. Fungal infection on Cory — resolved, mild
if [ -n "$FRESH_CORY" ]; then
  D5=$(post "$API/diseases/" "{\"livestock_id\":\"$FRESH_CORY\",\"tank_id\":\"$FRESH_TANK\",\"disease_name\":\"Fungal Infection (Saprolegnia)\",\"symptoms\":\"White cotton-like growth on dorsal fin of one Sterbai Cory\",\"severity\":\"mild\",\"status\":\"resolved\",\"detected_date\":\"2025-11-08\",\"resolved_date\":\"2025-11-22\",\"outcome\":\"Fungal growth completely gone, fin regenerating normally\",\"notes\":\"Likely caused by minor fin damage from driftwood snag.\"}")
  if [ -n "$D5" ]; then
    post_quiet "$API/diseases/$D5/treatments" '{"treatment_type":"medication","treatment_name":"Pimafix treatment","dosage":"5ml per 40L daily","treatment_date":"2025-11-08","duration_days":7,"effectiveness":"effective","notes":"Natural antifungal safe for corydoras and shrimp"}'
    post_quiet "$API/diseases/$D5/treatments" '{"treatment_type":"water_change","treatment_name":"25% water change","treatment_date":"2025-11-15","effectiveness":"effective","notes":"Post-treatment water change with fresh Indian almond leaves for tannin boost"}'
  fi
fi

echo ""
echo "=== AquaScope Demo Seed Complete ==="
echo ""
echo "User:       $EMAIL / $PASS"
echo "Saltwater:  Coral Paradise (SPS Dominant, 500L)"
echo "Freshwater: Rio Negro Biotope (Amazonian, 300L)"
echo ""
echo "Modules seeded per tank:"
echo "  Coral Paradise (saltwater):"
echo "    - 5 tank events"
echo "    - 9 livestock (4 corals, 3 fish, 2 invertebrates)"
echo "    - 6 equipment (light, pump, skimmer, wavemaker, doser, controller)"
echo "    - 5 maintenance reminders"
echo "    - 4 notes"
echo "    - 33 parameter readings (biweekly, Oct 2024 - Feb 2026)"
echo "    - 41 consumables (additives, food, medication, gear)"
echo "    - 3 ICP tests (Aug 2024, Jan 2025, Jul 2025)"
echo "    - 5 feeding schedules (4 active, 1 inactive)"
echo "    - 3 disease records (1 resolved, 1 monitoring, 1 resolved) with treatments"
echo ""
echo "  Rio Negro Biotope (freshwater):"
echo "    - 4 tank events"
echo "    - 6 livestock (4 fish, 1 invertebrate, 1 cichlid)"
echo "    - 4 equipment (filter, light, CO2, heater)"
echo "    - 4 maintenance reminders"
echo "    - 4 notes"
echo "    - 67 parameter readings (weekly, Nov 2024 - Feb 2026)"
echo "    - 21 consumables (fertilizers, food, water conditioners, test kits, filter media, medication)"
echo "    - 5 feeding schedules (all active)"
echo "    - 2 disease records (both resolved) with treatments"
echo ""
echo "Login at http://localhost with $EMAIL / $PASS"
