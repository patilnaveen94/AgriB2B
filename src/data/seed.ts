import type {
  Announcement,
  AppUser,
  AppNotification,
  Batch,
  CreditLedgerEntry,
  InventoryLog,
  InventoryCategory,
  Order,
  Product,
  ProductCategory,
  RakeArrival,
} from '@/types';
import { DEFAULT_INVENTORY_CATEGORIES } from '@/types';
import { isoInDays, nowIso, priceLine } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Product imagery — clean, on-brand SVG illustrations rendered as data-URLs so
// the demo works fully offline with zero external image dependencies.
// ---------------------------------------------------------------------------

const CATEGORY_GRADIENTS: Record<ProductCategory, [string, string][]> = {
  FERTILIZER: [
    ['#065f46', '#10b981'],
    ['#047857', '#34d399'],
    ['#064e3b', '#059669'],
  ],
  PESTICIDE: [
    ['#b45309', '#f59e0b'],
    ['#c2410c', '#fb923c'],
    ['#92400e', '#fbbf24'],
  ],
  SEED: [
    ['#5b21b6', '#8b5cf6'],
    ['#6d28d9', '#a78bfa'],
    ['#4c1d95', '#7c3aed'],
  ],
};

function categoryIcon(category: ProductCategory): string {
  const stroke =
    "fill='none' stroke='white' stroke-width='12' stroke-linecap='round' stroke-linejoin='round' opacity='0.95'";
  if (category === 'FERTILIZER') {
    // A fertilizer sack.
    return `<g ${stroke}><path d='M-72 -58 q72 -34 144 0 l-14 150 a22 22 0 0 1 -22 20 h-72 a22 22 0 0 1 -22 -20 z'/><path d='M-30 30 h60'/></g>`;
  }
  if (category === 'PESTICIDE') {
    // A spray bottle.
    return `<g ${stroke}><rect x='-46' y='-24' width='92' height='150' rx='18'/><path d='M-22 -24 v-34 h44 v34'/><path d='M22 -58 h46 v20 h-46'/><path d='M-24 44 h48'/></g>`;
  }
  // SEED — a sprout with two leaves.
  return `<g ${stroke}><path d='M0 120 V-6'/><path d='M0 40 C -70 40 -86 -18 -86 -60 C -30 -58 6 -12 0 40 Z'/><path d='M0 22 C 70 22 86 -38 86 -80 C 30 -78 -6 -32 0 22 Z'/></g>`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Build a category-themed product image as an inline SVG data-URL. */
export function productImage(category: ProductCategory, key: string): string {
  const variants = CATEGORY_GRADIENTS[category];
  const [c1, c2] = variants[hashCode(key) % variants.length];
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='460' viewBox='0 0 600 460'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/>` +
    `</linearGradient></defs>` +
    `<rect width='600' height='460' fill='url(#g)'/>` +
    `<circle cx='300' cy='210' r='168' fill='white' opacity='0.07'/>` +
    `<circle cx='300' cy='210' r='120' fill='white' opacity='0.07'/>` +
    `<g transform='translate(300 205)'>${categoryIcon(category)}</g>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Seed dataset used by the demo data-layer. Everything here mirrors the
 * Firestore document shapes so switching to live mode requires no component
 * changes — only the service implementation swaps.
 */

export interface SeedData {
  users: AppUser[];
  products: Product[];
  batches: Batch[];
  orders: Order[];
  announcements: Announcement[];
  rakeArrivals: RakeArrival[];
  ledgers: CreditLedgerEntry[];
  inventoryLogs: InventoryLog[];
  categories: InventoryCategory[];
  notifications: AppNotification[];
}

// --- Users ------------------------------------------------------------------

const users: AppUser[] = [
  {
    uid: 'admin_1',
    email: 'admin@agriflow.test',
    role: 'super_admin',
    staffFunction: 'super_admin',
    status: 'ACTIVE',
    business: {
      businessName: 'Shri Balaji Fertilizer',
      ownerName: 'Meera Nair',
      phone: '+91 98200 10001',
      taxId: '27AAAAA0000A1Z5',
      fertilizerLicenseNo: 'HQ-LIC-0001',
      addressLine: 'Mahalingpur',
      city: 'Mahalingpur',
      state: 'Karnataka',
      pincode: '',
    },
    createdAt: isoInDays(-120),
  },
  {
    uid: 'staff_godown_1',
    email: 'godown@agriflow.test',
    role: 'staff',
    staffFunction: 'godown_worker',
    status: 'ACTIVE',
    business: {
      businessName: 'Shri Balaji Fertilizer',
      ownerName: 'Ravi Shinde',
      phone: '+91 98200 10002',
      taxId: '27AAAAA0000A1Z5',
      fertilizerLicenseNo: 'HQ-LIC-0001',
      addressLine: 'Mahalingpur',
      city: 'Mahalingpur',
      state: 'Karnataka',
      pincode: '',
    },
    createdAt: isoInDays(-110),
  },
  {
    uid: 'staff_sales_1',
    email: 'sales@agriflow.test',
    role: 'staff',
    staffFunction: 'sales_executive',
    status: 'ACTIVE',
    business: {
      businessName: 'Shri Balaji Fertilizer',
      ownerName: 'Priya Deshmukh',
      phone: '+91 98200 10003',
      taxId: '27AAAAA0000A1Z5',
      fertilizerLicenseNo: 'HQ-LIC-0001',
      addressLine: 'Mahalingpur',
      city: 'Mahalingpur',
      state: 'Karnataka',
      pincode: '',
    },
    createdAt: isoInDays(-108),
  },
  {
    uid: 'retailer_1',
    email: 'retailer@agriflow.test',
    role: 'retailer',
    status: 'ACTIVE',
    business: {
      businessName: 'Green Valley Agro Center',
      ownerName: 'Suresh Patil',
      phone: '+91 90000 22001',
      taxId: '27BBBBB1111B2Z6',
      fertilizerLicenseNo: 'MH-FERT-22910',
      addressLine: 'Shop 4, Market Yard Road',
      city: 'Nashik',
      state: 'Maharashtra',
      pincode: '422001',
    },
    retailer: {
      creditLimit: 500000,
      outstandingBalance: 182500,
      licenseFileName: 'green-valley-license.pdf',
    },
    createdAt: isoInDays(-90),
    approvedAt: isoInDays(-88),
    approvedBy: 'admin_1',
  },
  {
    uid: 'retailer_2',
    email: 'kisan@agriflow.test',
    role: 'retailer',
    status: 'ACTIVE',
    business: {
      businessName: 'Kisan Seva Kendra',
      ownerName: 'Anil Jadhav',
      phone: '+91 90000 22002',
      taxId: '27CCCCC2222C3Z7',
      fertilizerLicenseNo: 'MH-FERT-33021',
      addressLine: 'Near Bus Stand, Station Road',
      city: 'Aurangabad',
      state: 'Maharashtra',
      pincode: '431001',
    },
    retailer: {
      creditLimit: 300000,
      outstandingBalance: 96000,
      licenseFileName: 'kisan-seva-license.pdf',
    },
    createdAt: isoInDays(-60),
    approvedAt: isoInDays(-58),
    approvedBy: 'admin_1',
  },
  {
    uid: 'retailer_pending_1',
    email: 'newretailer@agriflow.test',
    role: 'retailer',
    status: 'PENDING_APPROVAL',
    business: {
      businessName: 'Shetkari Agro Mart',
      ownerName: 'Vikram More',
      phone: '+91 90000 22003',
      taxId: '27DDDDD3333D4Z8',
      fertilizerLicenseNo: 'MH-FERT-40155',
      addressLine: 'Plot 12, Krishi Nagar',
      city: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416001',
    },
    retailer: {
      creditLimit: 0,
      outstandingBalance: 0,
      licenseFileName: 'shetkari-license.pdf',
    },
    createdAt: isoInDays(-3),
  },
  {
    uid: 'retailer_pending_2',
    email: 'agrostar@agriflow.test',
    role: 'retailer',
    status: 'PENDING_APPROVAL',
    business: {
      businessName: 'AgroStar Distributors',
      ownerName: 'Deepak Kulkarni',
      phone: '+91 90000 22004',
      taxId: '27EEEEE4444E5Z9',
      fertilizerLicenseNo: 'MH-FERT-41890',
      addressLine: 'Industrial Estate Phase 2',
      city: 'Solapur',
      state: 'Maharashtra',
      pincode: '413001',
    },
    retailer: {
      creditLimit: 0,
      outstandingBalance: 0,
      licenseFileName: 'agrostar-license.pdf',
    },
    createdAt: isoInDays(-1),
  },
];

// --- Products & Batches -----------------------------------------------------

interface ProductSeed
  extends Omit<
    Product,
    'totalStock' | 'heldStock' | 'stockAdjustment' | 'createdAt'
  > {
  _batches: Array<Omit<Batch, 'id' | 'productId' | 'createdAt'>>;
}

const productSeeds: ProductSeed[] = [
  {
    id: 'prod_urea',
    name: 'Urea 46% N',
    brand: 'IFFCO',
    category: 'FERTILIZER',
    description: 'High-nitrogen granular urea for broad-acre crops.',
    unit: 'MT',
    packSize: 1000,
    packUnit: 'kg',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '31021000',
    taxRatePct: 5,
    basePrice: 5900,
    volumeTiers: [],
    lowStockThreshold: 300,
    active: true,
    _batches: [
      {
        batchNumber: 'UREA-B2601',
        quantity: 640,
        manufactureDate: isoInDays(-40),
        expiryDate: isoInDays(540),
        mrp: 6200,
      },
      {
        batchNumber: 'UREA-B2602',
        quantity: 220,
        manufactureDate: isoInDays(-12),
        expiryDate: isoInDays(600),
        mrp: 6200,
      },
    ],
  },
  {
    id: 'prod_dap',
    name: 'DAP 18-46-0',
    brand: 'Coromandel',
    category: 'FERTILIZER',
    description: 'Di-ammonium phosphate, premium base fertilizer.',
    unit: 'MT',
    packSize: 1000,
    packUnit: 'kg',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '31053000',
    taxRatePct: 5,
    basePrice: 27000,
    volumeTiers: [],
    lowStockThreshold: 150,
    active: true,
    _batches: [
      {
        batchNumber: 'DAP-B0912',
        quantity: 95,
        manufactureDate: isoInDays(-30),
        expiryDate: isoInDays(720),
        mrp: 29980,
      },
    ],
  },
  {
    id: 'prod_mop',
    name: 'MOP Potash',
    brand: 'Zuari',
    category: 'FERTILIZER',
    description: 'Muriate of potash for fruit and tuber development.',
    unit: 'MT',
    packSize: 1000,
    packUnit: 'kg',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '31042000',
    taxRatePct: 5,
    basePrice: 34000,
    volumeTiers: [],
    lowStockThreshold: 100,
    active: true,
    _batches: [
      {
        batchNumber: 'MOP-B4410',
        quantity: 410,
        manufactureDate: isoInDays(-55),
        expiryDate: isoInDays(900),
        mrp: 37000,
      },
    ],
  },
  {
    id: 'prod_glypho',
    name: 'Glyphosate 41% SL',
    brand: 'Bayer',
    category: 'PESTICIDE',
    description: 'Broad-spectrum systemic herbicide. Box of 12 × 1 L.',
    unit: 'Box',
    packSize: 12,
    packUnit: 'L',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '38089199',
    taxRatePct: 18,
    basePrice: 5040,
    volumeTiers: [],
    lowStockThreshold: 120,
    active: true,
    _batches: [
      {
        batchNumber: 'GLY-2233',
        quantity: 60,
        manufactureDate: isoInDays(-20),
        expiryDate: isoInDays(400),
        mrp: 6240,
      },
      {
        batchNumber: 'GLY-2240',
        quantity: 48,
        manufactureDate: isoInDays(-5),
        expiryDate: isoInDays(430),
        mrp: 6240,
      },
    ],
  },
  {
    id: 'prod_imida',
    name: 'Imidacloprid 17.8% SL',
    brand: 'UPL',
    description: 'Systemic insecticide for sucking pests. Box of 24 × 500 ml.',
    category: 'PESTICIDE',
    unit: 'Box',
    packSize: 12,
    packUnit: 'L',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '38089390',
    taxRatePct: 18,
    basePrice: 7440,
    volumeTiers: [],
    lowStockThreshold: 80,
    active: true,
    _batches: [
      {
        batchNumber: 'IMI-7781',
        quantity: 300,
        manufactureDate: isoInDays(-15),
        expiryDate: isoInDays(500),
        mrp: 8100,
      },
    ],
  },
  {
    id: 'prod_bt_cotton',
    name: 'Bt Cotton Hybrid Seed',
    brand: 'Rasi Seeds',
    category: 'SEED',
    description: 'High-yield bollworm-resistant cotton hybrid.',
    unit: 'Packet',
    packSize: 450,
    packUnit: 'g',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '12079990',
    taxRatePct: 5,
    basePrice: 767,
    volumeTiers: [],
    lowStockThreshold: 60,
    active: true,
    _batches: [
      {
        batchNumber: 'COT-SS-01',
        quantity: 240,
        manufactureDate: isoInDays(-70),
        expiryDate: isoInDays(300),
        mrp: 850,
      },
    ],
  },
  {
    id: 'prod_hybrid_maize',
    name: 'Hybrid Maize Seed',
    brand: 'Pioneer',
    category: 'SEED',
    description: 'Drought-tolerant maize hybrid, 110-day maturity.',
    unit: 'Bag',
    packSize: 4,
    packUnit: 'kg',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '10059000',
    taxRatePct: 5,
    basePrice: 1120,
    volumeTiers: [],
    lowStockThreshold: 40,
    active: true,
    _batches: [
      {
        batchNumber: 'MAZ-PN-14',
        quantity: 30,
        manufactureDate: isoInDays(-45),
        expiryDate: isoInDays(210),
        mrp: 1260,
      },
    ],
  },
  {
    id: 'prod_paddy',
    name: 'Paddy Seed IR-64',
    brand: 'Kaveri',
    category: 'SEED',
    description: 'Popular medium-grain paddy variety.',
    unit: 'Bag',
    packSize: 10,
    packUnit: 'kg',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '10061010',
    taxRatePct: 5,
    basePrice: 640,
    volumeTiers: [],
    lowStockThreshold: 50,
    active: true,
    _batches: [
      {
        batchNumber: 'PAD-KV-09',
        quantity: 180,
        manufactureDate: isoInDays(-25),
        expiryDate: isoInDays(180),
        mrp: 720,
      },
    ],
  },
  {
    id: 'prod_npk_complex',
    name: 'NPK 10:26:26 Complex',
    brand: 'IPL',
    category: 'FERTILIZER',
    description: 'Balanced complex fertilizer for flowering and fruit set.',
    unit: 'MT',
    packSize: 1000,
    packUnit: 'kg',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '31059090',
    taxRatePct: 5,
    basePrice: 28500,
    volumeTiers: [],
    lowStockThreshold: 80,
    active: true,
    _batches: [
      {
        batchNumber: 'NPK-C-3301',
        quantity: 120,
        manufactureDate: isoInDays(-18),
        expiryDate: isoInDays(720),
        mrp: 31000,
      },
    ],
  },
  {
    id: 'prod_zinc',
    name: 'Zinc Sulphate 21%',
    brand: 'Aries Agro',
    category: 'FERTILIZER',
    description: 'Micronutrient supplement correcting zinc deficiency in soil.',
    unit: 'Bag',
    packSize: 25,
    packUnit: 'kg',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '28332990',
    taxRatePct: 5,
    basePrice: 1450,
    volumeTiers: [],
    lowStockThreshold: 40,
    active: true,
    _batches: [
      {
        batchNumber: 'ZN-2210',
        quantity: 26,
        manufactureDate: isoInDays(-25),
        expiryDate: isoInDays(900),
        mrp: 1650,
      },
    ],
  },
  {
    id: 'prod_vermicompost',
    name: 'Organic Vermicompost',
    brand: 'GreenEarth',
    category: 'FERTILIZER',
    description: 'Nutrient-rich organic soil conditioner for healthy root growth.',
    unit: 'Bag',
    packSize: 40,
    packUnit: 'kg',
    minOrderQty: 2,
    orderStep: 1,
    hsnCode: '31010099',
    taxRatePct: 0,
    basePrice: 480,
    volumeTiers: [],
    lowStockThreshold: 60,
    active: true,
    _batches: [
      {
        batchNumber: 'VC-8890',
        quantity: 320,
        manufactureDate: isoInDays(-10),
        expiryDate: isoInDays(365),
        mrp: 560,
      },
    ],
  },
  {
    id: 'prod_ws_npk',
    name: 'Water Soluble NPK 19:19:19',
    brand: 'Yara',
    category: 'FERTILIZER',
    description: 'Fully water-soluble grade for fertigation and foliar spray.',
    unit: 'Bag',
    packSize: 25,
    packUnit: 'kg',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '31059090',
    taxRatePct: 5,
    basePrice: 3200,
    volumeTiers: [],
    lowStockThreshold: 30,
    active: true,
    _batches: [
      {
        batchNumber: 'WS-1911',
        quantity: 75,
        manufactureDate: isoInDays(-14),
        expiryDate: isoInDays(540),
        mrp: 3600,
      },
    ],
  },
  {
    id: 'prod_mancozeb',
    name: 'Mancozeb 75% WP',
    brand: 'Indofil',
    category: 'PESTICIDE',
    description: 'Contact fungicide for blight and downy mildew. Box of 20 × 1 kg.',
    unit: 'Box',
    packSize: 20,
    packUnit: 'kg',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '38089290',
    taxRatePct: 18,
    basePrice: 3600,
    volumeTiers: [],
    lowStockThreshold: 50,
    active: true,
    _batches: [
      {
        batchNumber: 'MZ-4521',
        quantity: 70,
        manufactureDate: isoInDays(-22),
        expiryDate: isoInDays(500),
        mrp: 4200,
      },
    ],
  },
  {
    id: 'prod_chlorpyriphos',
    name: 'Chlorpyriphos 20% EC',
    brand: 'Dhanuka',
    category: 'PESTICIDE',
    description: 'Broad-spectrum insecticide for soil and foliar pests. Box of 12 × 1 L.',
    unit: 'Box',
    packSize: 12,
    packUnit: 'L',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '38089199',
    taxRatePct: 18,
    basePrice: 4800,
    volumeTiers: [],
    lowStockThreshold: 40,
    active: true,
    _batches: [
      {
        batchNumber: 'CP-7712',
        quantity: 28,
        manufactureDate: isoInDays(-16),
        expiryDate: isoInDays(430),
        mrp: 5400,
      },
    ],
  },
  {
    id: 'prod_24d',
    name: '2,4-D Amine Salt 58%',
    brand: 'Crystal',
    category: 'PESTICIDE',
    description: 'Selective herbicide for broadleaf weed control. Box of 12 × 1 L.',
    unit: 'Box',
    packSize: 12,
    packUnit: 'L',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '38089390',
    taxRatePct: 18,
    basePrice: 4200,
    volumeTiers: [],
    lowStockThreshold: 35,
    active: true,
    _batches: [
      {
        batchNumber: '24D-3390',
        quantity: 64,
        manufactureDate: isoInDays(-9),
        expiryDate: isoInDays(460),
        mrp: 4700,
      },
    ],
  },
  {
    id: 'prod_tomato',
    name: 'Hybrid Tomato Seed',
    brand: 'Syngenta',
    category: 'SEED',
    description: 'High-yield determinate tomato hybrid with disease tolerance.',
    unit: 'Packet',
    packSize: 10,
    packUnit: 'g',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '12099100',
    taxRatePct: 5,
    basePrice: 540,
    volumeTiers: [],
    lowStockThreshold: 80,
    active: true,
    _batches: [
      {
        batchNumber: 'TOM-SG-11',
        quantity: 150,
        manufactureDate: isoInDays(-35),
        expiryDate: isoInDays(240),
        mrp: 620,
      },
    ],
  },
  {
    id: 'prod_onion',
    name: 'Onion Seed N-53',
    brand: 'Nunhems',
    category: 'SEED',
    description: 'Popular kharif onion variety with good storage life.',
    unit: 'Packet',
    packSize: 500,
    packUnit: 'g',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '12099100',
    taxRatePct: 5,
    basePrice: 1250,
    volumeTiers: [],
    lowStockThreshold: 40,
    active: true,
    _batches: [
      {
        batchNumber: 'ON-53-22',
        quantity: 52,
        manufactureDate: isoInDays(-28),
        expiryDate: isoInDays(210),
        mrp: 1420,
      },
    ],
  },
  {
    id: 'prod_soybean',
    name: 'Soybean Seed JS-335',
    brand: 'Mahyco',
    category: 'SEED',
    description: 'Widely grown soybean variety, ~95-day maturity.',
    unit: 'Bag',
    packSize: 30,
    packUnit: 'kg',
    minOrderQty: 1,
    orderStep: 1,
    hsnCode: '12010010',
    taxRatePct: 5,
    basePrice: 3300,
    volumeTiers: [],
    lowStockThreshold: 25,
    active: true,
    _batches: [
      {
        batchNumber: 'SOY-335-8',
        quantity: 44,
        manufactureDate: isoInDays(-20),
        expiryDate: isoInDays(160),
        mrp: 3600,
      },
    ],
  },
];

const products: Product[] = [];
const batches: Batch[] = [];

for (const seed of productSeeds) {
  const { _batches, ...rest } = seed;
  let total = 0;
  _batches.forEach((b, i) => {
    total += b.quantity;
    batches.push({
      id: `${seed.id}_batch_${i + 1}`,
      productId: seed.id,
      createdAt: b.manufactureDate,
      ...b,
    });
  });
  products.push({
    ...rest,
    imageUrl: rest.imageUrl ?? productImage(rest.category, rest.id),
    totalStock: total,
    heldStock: 0,
    stockAdjustment: 0,
    createdAt: isoInDays(-100),
  });
}

// --- Orders -----------------------------------------------------------------

function buildOrder(
  id: string,
  orderNumber: string,
  retailer: AppUser,
  lines: Array<{ productId: string; qty: number }>,
  status: Order['status'],
  paymentMode: Order['paymentMode'],
  poNumber: string,
  createdAtIso: string,
  freight = 0,
  etaDays?: number,
): Order {
  const items = lines.map((l) => {
    const product = products.find((p) => p.id === l.productId)!;
    const pricing = priceLine(product, l.qty);
    return {
      productId: product.id,
      name: product.name,
      category: product.category,
      unit: product.unit,
      hsnCode: product.hsnCode,
      taxRatePct: product.taxRatePct,
      unitPrice: pricing.unitPrice,
      discountPct: pricing.discountPct,
      requestedQty: l.qty,
      approvedQty: l.qty,
      lineTotal: pricing.lineSubTotal,
      taxAmount: pricing.taxAmount,
    };
  });
  const subTotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const taxTotal = items.reduce((s, i) => s + i.taxAmount, 0);
  const freightCharges = Math.round(freight * 100) / 100;

  const pipelineIdx = [
    'SUBMITTED',
    'QUANTITY_APPROVED',
    'PACKING',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
  ].indexOf(status);
  const timeline = [
    'SUBMITTED',
    'QUANTITY_APPROVED',
    'PACKING',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
  ]
    .slice(0, pipelineIdx + 1)
    .map((s, i) => ({
      status: s as Order['status'],
      at: new Date(new Date(createdAtIso).getTime() + i * 3600_000 * 8).toISOString(),
      by: i === 0 ? retailer.uid : 'staff_sales_1',
    }));

  return {
    id,
    orderNumber,
    retailerId: retailer.uid,
    retailerName: retailer.business.businessName,
    poNumber,
    paymentMode,
    status,
    items,
    subTotal: Math.round(subTotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    freightCharges,
    grandTotal: Math.round((subTotal + taxTotal + freightCharges) * 100) / 100,
    challanNumber: pipelineIdx >= 2 ? `CH-${orderNumber.slice(-4)}` : undefined,
    // Approved-or-later orders carry a promised delivery date.
    expectedDeliveryDate:
      pipelineIdx >= 1 ? isoInDays(etaDays ?? 5) : undefined,
    timeline,
    createdAt: createdAtIso,
    updatedAt: timeline[timeline.length - 1]?.at ?? createdAtIso,
  };
}

const r1 = users.find((u) => u.uid === 'retailer_1')!;
const r2 = users.find((u) => u.uid === 'retailer_2')!;

const orders: Order[] = [
  buildOrder('order_1', 'AGF-2026-000101', r1,
    [{ productId: 'prod_urea', qty: 220 }, { productId: 'prod_dap', qty: 40 }],
    'DELIVERED', 'CREDIT', 'PO-GV-5501', isoInDays(-22), 2500, -20),
  buildOrder('order_2', 'AGF-2026-000102', r1,
    [{ productId: 'prod_glypho', qty: 96 }],
    'OUT_FOR_DELIVERY', 'CASH', 'PO-GV-5510', isoInDays(-5), 1800, 2),
  buildOrder('order_3', 'AGF-2026-000103', r1,
    [{ productId: 'prod_bt_cotton', qty: 30 }, { productId: 'prod_mop', qty: 50 }],
    'SUBMITTED', 'CREDIT', 'PO-GV-5522', isoInDays(-1)),
  buildOrder('order_4', 'AGF-2026-000104', r2,
    [{ productId: 'prod_imida', qty: 50 }],
    'PACKING', 'CREDIT', 'PO-KS-2201', isoInDays(-3), 1200, 3),
  buildOrder('order_5', 'AGF-2026-000105', r2,
    [{ productId: 'prod_paddy', qty: 40 }],
    'QUANTITY_APPROVED', 'CASH', 'PO-KS-2208', isoInDays(-2), 900, 4),
  buildOrder('order_6', 'AGF-2026-000106', r2,
    [{ productId: 'prod_hybrid_maize', qty: 25 }],
    'DELIVERED', 'CREDIT', 'PO-KS-2150', isoInDays(-14), 1500, -12),
];

// Reserve stock for orders that are approved but not yet delivered so the
// admin inventory reflects held vs available quantities out of the box.
const ACTIVE_APPROVED = ['QUANTITY_APPROVED', 'PACKING', 'OUT_FOR_DELIVERY'];
for (const order of orders) {
  if (!ACTIVE_APPROVED.includes(order.status)) continue;
  for (const item of order.items) {
    const p = products.find((x) => x.id === item.productId);
    if (p) p.heldStock += item.approvedQty;
  }
}

// --- Announcements ----------------------------------------------------------

const announcements: Announcement[] = [
  {
    id: 'ann_1',
    type: 'SCHEME',
    title: 'Kharif Booster — 9% off Urea',
    body: 'Order 500+ bags of Urea before month end to unlock additional quantity-based savings and priority rake allocation.',
    category: 'FERTILIZER',
    startsAt: isoInDays(-4),
    endsAt: isoInDays(20),
    active: true,
    createdAt: isoInDays(-4),
  },
  {
    id: 'ann_2',
    type: 'SCHEME',
    title: 'Seed Season Cashback',
    body: 'Flat 8% off on Bt Cotton hybrid seeds for orders above 100 packs.',
    category: 'SEED',
    startsAt: isoInDays(-2),
    endsAt: isoInDays(30),
    active: true,
    createdAt: isoInDays(-2),
  },
  {
    id: 'ann_3',
    type: 'BANNER',
    title: 'Monsoon Preparedness Drive',
    body: 'Stock up on crop-protection essentials. New pesticide batches now in godown.',
    bannerColor: '#047857',
    startsAt: isoInDays(-6),
    endsAt: isoInDays(15),
    active: true,
    createdAt: isoInDays(-6),
  },
];

// --- Rake arrivals ----------------------------------------------------------

/** Build a rake line item from a product, allocation ratio and booked qty. */
function rakeItem(
  productId: string,
  quantity: number,
  ratio: number,
  bookedQty = 0,
  priceOverride?: number,
): RakeArrival['items'][number] {
  const p = products.find((x) => x.id === productId)!;
  return {
    productId: p.id,
    productName: p.name,
    category: p.category,
    unit: p.unit,
    hsnCode: p.hsnCode,
    taxRatePct: p.taxRatePct,
    quantity,
    bookedQty,
    ratio,
    pricePerUnit: priceOverride ?? p.basePrice,
  };
}

const rakeArrivals: RakeArrival[] = [
  {
    id: 'rake_1',
    rakeNumber: 'RK-KHARIF-8841',
    originStation: 'Kandla Port',
    destinationGodown: 'Pune MIDC',
    status: 'IN_TRANSIT',
    expectedArrival: isoInDays(4),
    openForOrders: true,
    notes: 'Kharif combo rake — order fertilizers in the recommended 4:1:1 ratio.',
    items: [
      rakeItem('prod_urea', 2600, 4, 640, 5700),
      rakeItem('prod_dap', 700, 1, 120, 26000),
      rakeItem('prod_mop', 700, 1, 90, 33000),
    ],
    createdAt: isoInDays(-3),
  },
  {
    id: 'rake_2',
    rakeNumber: 'RK-DAP-2290',
    originStation: 'Vizag',
    destinationGodown: 'Pune MIDC',
    status: 'SCHEDULED',
    expectedArrival: isoInDays(9),
    openForOrders: true,
    notes: 'Base-fertilizer rake for Rabi pre-booking.',
    items: [
      rakeItem('prod_dap', 1800, 2, 0, 26500),
      rakeItem('prod_urea', 900, 1, 0, 5800),
    ],
    createdAt: isoInDays(-1),
  },
  {
    id: 'rake_3',
    rakeNumber: 'RK-MOP-5512',
    originStation: 'Mundra',
    destinationGodown: 'Nashik Depot',
    status: 'ARRIVED',
    expectedArrival: isoInDays(-1),
    openForOrders: false,
    notes: 'Fully allocated.',
    items: [rakeItem('prod_mop', 1200, 1, 1200, 33500)],
    createdAt: isoInDays(-6),
  },
];

// --- Ledgers ----------------------------------------------------------------

const ledgers: CreditLedgerEntry[] = [
  {
    id: 'led_1', retailerId: 'retailer_1', type: 'DEBIT', amount: 120000,
    balanceAfter: 120000, reference: 'AGF-2026-000101', note: 'Order on credit',
    createdAt: isoInDays(-22),
  },
  {
    id: 'led_2', retailerId: 'retailer_1', type: 'CREDIT', amount: 60000,
    balanceAfter: 60000, reference: 'PAY-8841', note: 'Part payment received',
    createdAt: isoInDays(-15),
  },
  {
    id: 'led_3', retailerId: 'retailer_1', type: 'DEBIT', amount: 122500,
    balanceAfter: 182500, reference: 'AGF-2026-000103', note: 'Order on credit',
    createdAt: isoInDays(-1),
  },
  {
    id: 'led_4', retailerId: 'retailer_2', type: 'DEBIT', amount: 96000,
    balanceAfter: 96000, reference: 'AGF-2026-000104', note: 'Order on credit',
    createdAt: isoInDays(-3),
  },
];

// --- Inventory logs ---------------------------------------------------------

const inventoryLogs: InventoryLog[] = [
  {
    id: 'ilog_1', productId: 'prod_urea', productName: 'Urea 46% N',
    batchNumber: 'UREA-B2602', action: 'BATCH_ADDED', quantityDelta: 220,
    by: 'staff_godown_1', note: 'New batch inward', createdAt: isoInDays(-12),
  },
  {
    id: 'ilog_2', productId: 'prod_glypho', productName: 'Glyphosate 41% SL',
    batchNumber: 'GLY-2240', action: 'BATCH_ADDED', quantityDelta: 48,
    by: 'staff_godown_1', createdAt: isoInDays(-5),
  },
];

export function buildSeedData(): SeedData {
  return {
    users,
    products,
    batches,
    orders,
    announcements,
    rakeArrivals,
    ledgers,
    inventoryLogs,
    categories: DEFAULT_INVENTORY_CATEGORIES.map((category) => ({ ...category })),
    notifications: [],
  };
}

/** Demo login directory shown on the sign-in screen. */
export const DEMO_LOGINS = [
  { label: 'Super Admin', email: 'admin@agriflow.test', role: 'super_admin' },
  { label: 'Godown Worker', email: 'godown@agriflow.test', role: 'staff' },
  { label: 'Sales Executive', email: 'sales@agriflow.test', role: 'staff' },
  { label: 'Retailer', email: 'retailer@agriflow.test', role: 'retailer' },
] as const;

export const DEMO_PASSWORD = 'demo1234';

export const _seedTimestamp = nowIso();
