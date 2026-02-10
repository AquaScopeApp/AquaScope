/**
 * Seed Consumables Data
 *
 * Extracted from Aquarium_recifal.xlsx "Stock matériel" sheet.
 * 42 products covering decoration, food, gear, medication, and water treatment.
 *
 * Used to populate the local database on first launch so users have
 * sample data to explore the app's capabilities.
 */

import type { ConsumableCreate } from '../types'

// Map Excel categories to ConsumableCreate consumable_type values
function mapCategory(category: string): string {
  switch (category) {
    case 'food': return 'food'
    case 'medication': return 'medication'
    case 'water treatment': return 'additive'
    case 'decoration': return 'other'
    case 'gear': return 'other'
    default: return 'other'
  }
}

interface SeedProduct {
  product: string
  brand: string | null
  model: string | null
  category: string
  url: string | null
  price: number | null
  quantity: number
  consumable: boolean
  notes: string | null
}

const RAW_PRODUCTS: SeedProduct[] = [
  { product: 'CORALGUM', brand: 'Tunze', model: '112g', category: 'decoration', url: 'https://www.zoanthus.fr/fr/bouturage/2218-tunze-coral-gum-112-g-0104740-4025167010415.html', price: 12.99, quantity: 2, consumable: true, notes: 'Epoxy putty-glue for secure coral frag mounting.' },
  { product: 'AF Gel Fix', brand: 'Aquaforest', model: '20g', category: 'decoration', url: 'https://aquaforest.eu/en/products/seawater/aquascaping/af-gel-fix/', price: 19.9, quantity: 2, consumable: true, notes: 'Fast-drying gel for precise coral gluing. Bonds in 10 seconds.' },
  { product: 'Afix Glue', brand: 'Aquaforest', model: '110g', category: 'decoration', url: null, price: 12.13, quantity: 2, consumable: true, notes: 'Two-component paste for fixing hard corals and rocks.' },
  { product: 'CoraFix ThermoFrag', brand: 'Grotech', model: '200g', category: 'decoration', url: null, price: 19.99, quantity: 3, consumable: true, notes: 'Thermoplastic biopolymer resin for coral fragging. Melting point 44°C.' },
  { product: 'CoraFix SuperFast', brand: 'Grotech', model: null, category: 'decoration', url: null, price: 27, quantity: 1, consumable: false, notes: null },
  { product: 'ZOO-TONIC', brand: 'Tropic Marin', model: '50ml', category: 'food', url: 'https://www.tropic-marin-smartinfo.com/zootonic?lang=en', price: 19.9, quantity: 4, consumable: true, notes: 'Plankton replacement for filter feeders — amino acids, fatty acids, vitamins.' },
  { product: 'ZOO-TONIC', brand: 'Tropic Marin', model: '50ml', category: 'food', url: null, price: 12.8, quantity: 1, consumable: true, notes: 'Plankton replacement (smaller bottle).' },
  { product: 'Druide Sponge Coraux', brand: null, model: '50ml', category: 'food', url: null, price: 17, quantity: 1, consumable: true, notes: 'Boosts growth of ornamental sponges and gorgonians.' },
  { product: 'LIQUIZELL', brand: 'Hobby', model: '20ml', category: 'food', url: null, price: 8.89, quantity: 1, consumable: true, notes: 'Breeding food for artemia nauplii and invertebrates.' },
  { product: 'Artemia', brand: 'Hobby', model: '20ml', category: 'food', url: null, price: 6.98, quantity: 1, consumable: true, notes: 'Artemia eggs for hatching — ideal live food for fry.' },
  { product: 'Magnetic Brush', brand: null, model: null, category: 'gear', url: null, price: 83, quantity: 1, consumable: false, notes: 'Magnetic glass cleaner with observation mirror.' },
  { product: 'Coral Rx Pro', brand: 'Coral Dip', model: '30ml', category: 'medication', url: null, price: 23.99, quantity: 2, consumable: true, notes: 'Eliminates acropora flatworms, montipora nudibranch, and zoanthid parasites.' },
  { product: 'AIPTASIA-X', brand: 'Red Sea', model: '60ml', category: 'medication', url: null, price: 18.9, quantity: 1, consumable: true, notes: 'Aiptasia elimination — sticky formula triggers ingestion and implosion.' },
  { product: 'EXIT', brand: 'eSHa', model: '20ml', category: 'medication', url: null, price: 6.45, quantity: 1, consumable: true, notes: 'Treats white spot disease (Ich) and Oodinium.' },
  { product: 'OODINEX', brand: 'eSHa', model: '20ml', category: 'medication', url: null, price: 7.49, quantity: 1, consumable: true, notes: 'Treats 8 common reef diseases.' },
  { product: 'Aiptasia X Refill', brand: 'Red Sea', model: '415ml', category: 'medication', url: null, price: 74, quantity: 1, consumable: true, notes: 'Large refill for Aiptasia-X treatment system.' },
  { product: 'ELIMI-NP', brand: 'Tropic Marin', model: '50ml', category: 'water treatment', url: 'https://www.tropic-marin-smartinfo.com/elimi-np?lang=en', price: 19.9, quantity: 5, consumable: true, notes: 'Carbon dosing concentrate for nitrate/phosphate reduction.' },
  { product: 'PRO-CORAL IODINE', brand: 'Tropic Marin', model: '50ml', category: 'water treatment', url: null, price: 12, quantity: 5, consumable: true, notes: 'Iodine supplement — essential for crustacean molting and coralline algae.' },
  { product: 'Nitribiotic', brand: 'Tropic Marin', model: '50ml', category: 'water treatment', url: null, price: 12, quantity: 3, consumable: true, notes: 'Probiotic + nitrifying bacteria — activates nitrification cycle.' },
  { product: 'ELIMI-NP', brand: 'Tropic Marin', model: '200ml', category: 'water treatment', url: null, price: 13.9, quantity: 1, consumable: true, notes: 'Carbon dosing concentrate (larger bottle).' },
  { product: 'AF Protect Dip', brand: 'Aquaforest', model: '50ml', category: 'water treatment', url: null, price: 15.9, quantity: 1, consumable: true, notes: 'Coral quarantine dip — reduces tissue necrosis, bleaching, and brown jelly.' },
  { product: 'KH Alkalinity Test', brand: 'Tropic Marin', model: '100 tests', category: 'water treatment', url: null, price: 11.9, quantity: 1, consumable: true, notes: 'KH/alkalinity test kit — measures buffering capacity.' },
  { product: 'CareBacter', brand: 'Tunze', model: '40ml', category: 'water treatment', url: null, price: 27.4, quantity: 2, consumable: true, notes: 'Bacteria on Maerl gravel substrate — keeps aquarium clean.' },
  { product: 'NitraPhos Minus', brand: 'Aquaforest', model: '250ml', category: 'water treatment', url: null, price: 9.89, quantity: 1, consumable: true, notes: 'Activates nutrient-consuming bacteria — converts nitrate/phosphate to biomass.' },
  { product: 'Nitrate Plus', brand: 'Colombo', model: '500ml', category: 'water treatment', url: null, price: 11.9, quantity: 1, consumable: true, notes: 'Replenishes nitrate levels in coral-heavy tanks with nitrate deficiency.' },
  { product: 'Phosguard', brand: 'Seachem', model: '1l', category: 'water treatment', url: null, price: 30.59, quantity: 1, consumable: true, notes: 'Phosphate/silicate removal media for marine and freshwater.' },
  { product: 'Calcium', brand: 'Aquaforest', model: '850g', category: 'water treatment', url: null, price: 9.89, quantity: 1, consumable: true, notes: 'Calcium supplement — maintains 380-460 mg/l for coral growth.' },
  { product: 'Magnesium', brand: 'Aquaforest', model: '750g', category: 'water treatment', url: null, price: 6.75, quantity: 2, consumable: true, notes: 'Magnesium supplement — ideal range 1180-1460 mg/l.' },
  { product: 'Carbon', brand: 'Aquaforest', model: '1l', category: 'water treatment', url: null, price: 11.25, quantity: 1, consumable: true, notes: 'Activated carbon — removes unwanted chemical compounds.' },
  { product: 'Zeo Mix', brand: 'Aquaforest', model: '1l', category: 'water treatment', url: null, price: 10, quantity: 1, consumable: true, notes: 'Zeolite blend — replace every 6 weeks for optimal filtration.' },
  { product: 'Reef Crystals', brand: 'Aquarium Systems', model: '4 kg', category: 'water treatment', url: null, price: 45, quantity: 1, consumable: true, notes: 'Enriched reef salt — extra calcium, vitamins, and trace elements.' },
  { product: 'Osmoseur', brand: 'Aquavie', model: '380l/j', category: 'water treatment', url: null, price: 89.7, quantity: 1, consumable: false, notes: 'RO unit — produces high-quality osmosis water from tap water.' },
  { product: 'NanoStream', brand: 'Tunze', model: null, category: 'gear', url: null, price: 64.4, quantity: 1, consumable: false, notes: 'Compact propeller pump — 4500 l/h at only 5W.' },
  { product: 'Super Flow Pump 1500', brand: 'Seio', model: '1500', category: 'gear', url: null, price: 50, quantity: 3, consumable: false, notes: null },
  { product: 'Super Flow Pump 530', brand: 'Seio', model: '530', category: 'gear', url: null, price: 30, quantity: 2, consumable: false, notes: null },
  { product: 'Super Flow Pump 320', brand: 'Seio', model: '320', category: 'gear', url: null, price: 20, quantity: 1, consumable: false, notes: null },
  { product: 'Return Pump', brand: 'Cadrim', model: '580GPH', category: 'gear', url: null, price: 30, quantity: 1, consumable: false, notes: null },
  { product: 'Return Pump', brand: 'Newjet', model: '1200', category: 'gear', url: null, price: 45, quantity: 1, consumable: false, notes: null },
  { product: 'Jecod RW4', brand: 'Jebao', model: 'RW4', category: 'gear', url: null, price: 69, quantity: 1, consumable: false, notes: 'Wavemaker pump.' },
  { product: 'Internal Filter AP-1000', brand: 'Hidom', model: 'AP-1000', category: 'gear', url: null, price: 14, quantity: 1, consumable: false, notes: 'Internal filter with spray bar and venturi adapter.' },
  { product: 'ATO Refill System', brand: 'Jebao', model: 'Jebao-150', category: 'gear', url: null, price: 35, quantity: 1, consumable: false, notes: 'Auto top-off water level controller.' },
]

/**
 * Generate consumable seed data for a given tank.
 */
export function getSeedConsumables(tankId: string): ConsumableCreate[] {
  return RAW_PRODUCTS.map((p) => ({
    tank_id: tankId,
    name: p.product,
    consumable_type: mapCategory(p.category),
    brand: p.brand,
    product_name: p.model,
    quantity_on_hand: p.quantity,
    quantity_unit: 'units',
    purchase_price: p.price != null ? String(p.price) : null,
    purchase_url: p.url,
    status: 'active',
    notes: p.notes,
  }))
}
