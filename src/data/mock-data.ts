// ============================================================================
// UAE POS SEED / DEMO MASTER DATA
// ============================================================================

import {
  TenantInfo,
  BranchInfo,
  User,
  Category,
  Product,
  QuickServiceItem
} from '../types/pos';

export const INITIAL_TENANT: TenantInfo = {
  id: 't_uae_001',
  legalNameEn: 'AL BARAKAH MODERN TRADING LLC',
  legalNameAr: 'شركة البركة للتجارة الحديثة ذ.م.م',
  tradeLicenseNo: 'CN-2894512',
  trn: '100458923100003', // 15-digit FTA TRN
  countryCode: 'AE',
  currencyCode: 'AED',
  vatRate: 0.05,
  isTaxInclusive: true
};

export const INITIAL_BRANCH: BranchInfo = {
  id: 'b_dxb_001',
  tenantId: 't_uae_001',
  branchCode: 'DXB-01',
  nameEn: 'Al Rigga Branch',
  nameAr: 'فرع شارع الرقة',
  emirate: 'Dubai',
  addressEn: 'Shop 3, Al Rigga Road, Deira, Dubai, UAE',
  addressAr: 'محل 3، شارع الرقة، ديرة، دبي، الإمارات العربية المتحدة',
  phone: '+971 4 223 8890',
  email: 'pos.rigga@albarakah.ae',
  operationalMode: 'CAFETERIA',
  thermalPrinterWidth: '80mm',
  cashDrawerEnabled: true
};

export const INITIAL_USERS: User[] = [
  {
    id: 'u_c01',
    username: 'cashier1',
    fullName: 'Rashid Al Nuaimi',
    role: 'CASHIER',
    pin: '1234',
    canApplyDiscount: false,
    canVoidItem: false,
    canOpenDrawerManual: false
  },
  {
    id: 'u_s01',
    username: 'supervisor',
    fullName: 'Tariq Mansoor',
    role: 'SUPERVISOR',
    pin: '9999',
    canApplyDiscount: true,
    canVoidItem: true,
    canOpenDrawerManual: true
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_hot', nameEn: 'Hot Drinks', nameAr: 'مشروبات ساخنة', colorCode: '#d97706', sortOrder: 1 },
  { id: 'cat_sand', nameEn: 'Sandwiches & Paratha', nameAr: 'سندويشات وبراتا', colorCode: '#ea580c', sortOrder: 2 },
  { id: 'cat_shaw', nameEn: 'Shawarma & Grills', nameAr: 'شاورما ومشويات', colorCode: '#dc2626', sortOrder: 3 },
  { id: 'cat_juice', nameEn: 'Fresh Juices', nameAr: 'عصائر طازجة', colorCode: '#16a34a', sortOrder: 4 },
  { id: 'cat_paper', nameEn: 'Paper & Files', nameAr: 'ورق وملفات', colorCode: '#2563eb', sortOrder: 5 },
  { id: 'cat_pens', nameEn: 'Writing & Pens', nameAr: 'أقلام وأدوات كتابة', colorCode: '#7c3aed', sortOrder: 6 },
  { id: 'cat_srv', nameEn: 'Services & Copying', nameAr: 'خدمات وتصوير', colorCode: '#0891b2', sortOrder: 7 }
];

export const INITIAL_PRODUCTS: Product[] = [
  // --- Cafeteria Items ---
  {
    id: 'p_c01',
    sku: 'BEV-KARAK',
    barcode: '6291001001',
    nameEn: 'Special Karak Chai',
    nameAr: 'شاي كرك مميز',
    categoryId: 'cat_hot',
    costPrice: 0.40,
    sellingPrice: 1.50,
    vatRate: 0.05,
    isTaxInclusive: true,
    unit: 'PORTION',
    trackStock: false,
    isQuickOrder: true,
    modifierGroups: [
      {
        id: 'mg_sugar',
        nameEn: 'Sugar Level',
        nameAr: 'مستوى السكر',
        minSelection: 1,
        maxSelection: 1,
        modifiers: [
          { id: 'm_s1', nameEn: 'Normal Sugar', nameAr: 'سكر عادي', priceDelta: 0, isDefault: true },
          { id: 'm_s2', nameEn: 'Less Sugar', nameAr: 'سكر قليل', priceDelta: 0 },
          { id: 'm_s3', nameEn: 'Sugar Free', nameAr: 'بدون سكر (سادة)', priceDelta: 0 },
          { id: 'm_s4', nameEn: 'Extra Sweet', nameAr: 'سكر زيادة', priceDelta: 0 }
        ]
      },
      {
        id: 'mg_spice',
        nameEn: 'Aroma & Spices',
        nameAr: 'النكهات والبهارات',
        minSelection: 0,
        maxSelection: 2,
        modifiers: [
          { id: 'm_sp1', nameEn: 'Extra Cardamom & Saffron', nameAr: 'هيل وزعفران إضافي', priceDelta: 0.50 },
          { id: 'm_sp2', nameEn: 'Ginger Infusion', nameAr: 'زنجبيل طازج', priceDelta: 0.50 }
        ]
      }
    ]
  },
  {
    id: 'p_c02',
    sku: 'BEV-SULAIMANI',
    barcode: '6291001002',
    nameEn: 'Sulaimani Mint Tea',
    nameAr: 'شاي سليماني بالنعناع',
    categoryId: 'cat_hot',
    costPrice: 0.30,
    sellingPrice: 1.00,
    vatRate: 0.05,
    isTaxInclusive: true,
    unit: 'PORTION',
    trackStock: false,
    isQuickOrder: true
  },
  {
    id: 'p_c03',
    sku: 'FNB-OMAN-PARATHA',
    barcode: '6291001003',
    nameEn: 'Oman Chips & Cheese Paratha',
    nameAr: 'براتا بطاطس عمان وجبن كرافت',
    categoryId: 'cat_sand',
    costPrice: 1.80,
    sellingPrice: 5.00,
    vatRate: 0.05,
    isTaxInclusive: true,
    unit: 'PORTION',
    trackStock: false,
    isQuickOrder: true,
    modifierGroups: [
      {
        id: 'mg_cheese',
        nameEn: 'Cheese & Add-ons',
        nameAr: 'إضافات الجبن',
        minSelection: 0,
        maxSelection: 2,
        modifiers: [
          { id: 'm_ch1', nameEn: 'Extra Kraft Cheese', nameAr: 'جبن كرافت مضاعف', priceDelta: 1.50 },
          { id: 'm_ch2', nameEn: 'Extra Oman Chips Pack', nameAr: 'كيس بطاطس عمان إضافي', priceDelta: 1.00 },
          { id: 'm_ch3', nameEn: 'Add Hot Sauce / Daqoos', nameAr: 'إضافة دقوس حار', priceDelta: 0.50 }
        ]
      }
    ]
  },
  {
    id: 'p_c04',
    sku: 'FNB-CLUB-JUMBO',
    barcode: '6291001004',
    nameEn: 'Chicken Club Sandwich Jumbo',
    nameAr: 'كلوب ساندوتش دجاج جامبو مع البطاطس',
    categoryId: 'cat_sand',
    costPrice: 5.50,
    sellingPrice: 15.00,
    vatRate: 0.05,
    isTaxInclusive: true,
    unit: 'PORTION',
    trackStock: false,
    isQuickOrder: true,
    modifierGroups: [
      {
        id: 'mg_egg',
        nameEn: 'Preparation & Extras',
        nameAr: 'خيارات التحضير',
        minSelection: 0,
        maxSelection: 2,
        modifiers: [
          { id: 'm_e1', nameEn: 'Extra Fried Egg', nameAr: 'بيض مقلي إضافي', priceDelta: 2.00 },
          { id: 'm_e2', nameEn: 'No Mayonnaise', nameAr: 'بدون مايونيز', priceDelta: 0 },
          { id: 'm_e3', nameEn: 'Extra French Fries Portion', nameAr: 'صحن بطاطس مقلية إضافي', priceDelta: 3.50 }
        ]
      }
    ]
  },
  {
    id: 'p_c05',
    sku: 'FNB-SHAW-ARABIC',
    barcode: '6291001005',
    nameEn: 'Chicken Shawarma Arabic Plate',
    nameAr: 'صحن شاورما دجاج عربي مقطع',
    categoryId: 'cat_shaw',
    costPrice: 6.00,
    sellingPrice: 18.00,
    vatRate: 0.05,
    isTaxInclusive: true,
    unit: 'PORTION',
    trackStock: false,
    isQuickOrder: true,
    modifierGroups: [
      {
        id: 'mg_shaw',
        nameEn: 'Sauce Preference',
        nameAr: 'نوع الصوص',
        minSelection: 0,
        maxSelection: 2,
        modifiers: [
          { id: 'm_sh1', nameEn: 'Extra Garlic Toum', nameAr: 'ثومية إضافية', priceDelta: 1.00 },
          { id: 'm_sh2', nameEn: 'Spicy Tahina', nameAr: 'طحينة حارة', priceDelta: 1.00 },
          { id: 'm_sh3', nameEn: 'Extra Pickles', nameAr: 'مخلل إضافي', priceDelta: 0 }
        ]
      }
    ]
  },
  {
    id: 'p_c06',
    sku: 'BEV-ORANGE-FRESH',
    barcode: '6291001006',
    nameEn: 'Fresh Orange Juice 500ml',
    nameAr: 'عصير برتقال طازج 500 مل',
    categoryId: 'cat_juice',
    costPrice: 3.50,
    sellingPrice: 12.00,
    vatRate: 0.05,
    isTaxInclusive: true,
    unit: 'PORTION',
    trackStock: false,
    isQuickOrder: true
  },
  {
    id: 'p_c07',
    sku: 'BEV-AVIL-MILK',
    barcode: '6291001007',
    nameEn: 'Avil Milk Special Dry Fruits',
    nameAr: 'عصير آفل ميلك الخاص بالمكسرات',
    categoryId: 'cat_juice',
    costPrice: 4.20,
    sellingPrice: 14.00,
    vatRate: 0.05,
    isTaxInclusive: true,
    unit: 'PORTION',
    trackStock: false,
    isQuickOrder: true
  },

  // --- Stationery & Retail Items ---
  {
    id: 'p_s01',
    sku: 'PAP-DBLA-A4',
    barcode: '8851907001015',
    nameEn: 'Double A Copy Paper A4 80gsm (500 Sheets)',
    nameAr: 'ورق تصوير دبل ايه A4 80 جرام (500 ورقة)',
    categoryId: 'cat_paper',
    costPrice: 13.50,
    sellingPrice: 18.50,
    vatRate: 0.05,
    isTaxInclusive: true,
    unit: 'PACK',
    trackStock: true,
    stockOnHand: 45,
    minReorderLevel: 10
  },
  {
    id: 'p_s02',
    sku: 'PEN-FC-07B',
    barcode: '4005401423512',
    nameEn: 'Faber-Castell Ball Pen 0.7mm Blue (Box of 10)',
    nameAr: 'أقلام حبر جاف فايبر كاستل أزرق 0.7 مم (علبة 10)',
    categoryId: 'cat_pens',
    costPrice: 7.50,
    sellingPrice: 12.00,
    vatRate: 0.05,
    isTaxInclusive: true,
    unit: 'BOX',
    trackStock: true,
    stockOnHand: 32,
    minReorderLevel: 8
  },
  {
    id: 'p_s03',
    sku: 'PEN-UNI-EYE-BK',
    barcode: '4902778913925',
    nameEn: 'Uni-ball Eye UB-150 Micro Rollerball Black',
    nameAr: 'قلم حبر سائل يوني بول آي أسود دقيق',
    categoryId: 'cat_pens',
    costPrice: 4.80,
    sellingPrice: 7.50,
    vatRate: 0.05,
    isTaxInclusive: true,
    unit: 'PCS',
    trackStock: true,
    stockOnHand: 24,
    minReorderLevel: 5
  },
  {
    id: 'p_s04',
    sku: 'CALC-CAS-991',
    barcode: '4549526600747',
    nameEn: 'Casio FX-991EX ClassWiz Scientific Calculator',
    nameAr: 'آلة حاسبة علمية كاسيو كلاسويز 991',
    categoryId: 'cat_paper',
    costPrice: 58.00,
    sellingPrice: 75.00,
    vatRate: 0.05,
    isTaxInclusive: true,
    unit: 'PCS',
    trackStock: true,
    stockOnHand: 6, // Low stock indicator
    minReorderLevel: 8
  },
  {
    id: 'p_s05',
    sku: 'FIL-CLR-40P',
    barcode: '6291012345678',
    nameEn: 'A4 Display Clear Book 40 Pockets',
    nameAr: 'ملف عرض شفاف A4 عدد 40 جيب',
    categoryId: 'cat_paper',
    costPrice: 5.00,
    sellingPrice: 8.50,
    vatRate: 0.05,
    isTaxInclusive: true,
    unit: 'PCS',
    trackStock: true,
    stockOnHand: 18,
    minReorderLevel: 5
  },
  {
    id: 'p_s06',
    sku: 'ADH-3M-TAPE',
    barcode: '051131642844',
    nameEn: 'Scotch Transparent Tape 19mm x 33m',
    nameAr: 'شريط لاصق شفاف سكوتش 19 مم × 33 م',
    categoryId: 'cat_pens',
    costPrice: 2.80,
    sellingPrice: 4.50,
    vatRate: 0.05,
    isTaxInclusive: true,
    unit: 'PCS',
    trackStock: true,
    stockOnHand: 28,
    minReorderLevel: 6
  }
];

export const QUICK_SERVICE_RATES: QuickServiceItem[] = [
  { id: 'srv_copy_bw', nameEn: 'Photocopy B&W (A4)', nameAr: 'تصوير مستندات أبيض وأسود A4', unitRate: 0.25, unitLabel: 'pages', category: 'PHOTOCOPY' },
  { id: 'srv_print_clr', nameEn: 'Color Laser Print (A4)', nameAr: 'طباعة ليزر ملونة A4', unitRate: 1.00, unitLabel: 'pages', category: 'PRINT' },
  { id: 'srv_lam_a4', nameEn: 'Thermal Lamination (A4)', nameAr: 'تغليف حراري A4', unitRate: 2.50, unitLabel: 'sheets', category: 'LAMINATION' },
  { id: 'srv_lam_a3', nameEn: 'Thermal Lamination (A3)', nameAr: 'تغليف حراري A3', unitRate: 5.00, unitLabel: 'sheets', category: 'LAMINATION' },
  { id: 'srv_bind_sp', nameEn: 'Plastic Spiral Binding', nameAr: 'تجليد حلزوني بلاستيك', unitRate: 7.00, unitLabel: 'books', category: 'BINDING' }
];

export const INITIAL_TABLES = [
  'T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07', 'T-08', 'Out-1', 'Out-2'
];
