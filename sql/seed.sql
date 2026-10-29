-- ============================================================================
-- UAE COMPLIANT POS INITIAL SEED DATA
-- Includes Cafeteria Menu, Stationery Catalog, UAE TRN, and Users
-- ============================================================================

-- 1. Tenant & Branch
INSERT INTO tenants (id, legal_name_en, legal_name_ar, trade_license_no, trn, country_code, currency_code, vat_rate, is_tax_inclusive)
VALUES (
    't_uae_001',
    'AL BARAKAH MODERN TRADING LLC',
    'شركة البركة للتجارة الحديثة ذ.م.م',
    'CN-2894512',
    '100458923100003',
    'AE',
    'AED',
    0.0500,
    TRUE
) ON CONFLICT (id) DO NOTHING;

INSERT INTO branches (id, tenant_id, branch_code, name_en, name_ar, emirate, address_en, address_ar, phone, email, operational_mode, thermal_printer_width)
VALUES (
    'b_dxb_001',
    't_uae_001',
    'DXB-01',
    'Al Rigga Branch',
    'فرع شارع الرقة',
    'Dubai',
    'Shop 3, Al Rigga Road, Deira, Dubai, UAE',
    'محل 3، شارع الرقة، ديرة، دبي، الإمارات العربية المتحدة',
    '+971 4 223 8890',
    'pos.rigga@albarakah.ae',
    'CAFETERIA',
    '80mm'
) ON CONFLICT (id) DO NOTHING;

-- 2. Users (Cashier, Supervisor, Admin)
INSERT INTO users (id, tenant_id, branch_id, username, full_name, role, pin_hash, can_apply_discount, can_void_item, can_open_drawer_manual)
VALUES
    ('u_c01', 't_uae_001', 'b_dxb_001', 'cashier1', 'Rashid Al Nuaimi', 'CASHIER', '1234', FALSE, FALSE, FALSE),
    ('u_s01', 't_uae_001', 'b_dxb_001', 'supervisor', 'Tariq Mansoor', 'SUPERVISOR', '9999', TRUE, TRUE, TRUE),
    ('u_a01', 't_uae_001', 'b_dxb_001', 'admin', 'Fatima Zahra', 'ADMIN', '8888', TRUE, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Categories
INSERT INTO categories (id, tenant_id, name_en, name_ar, color_code, icon_name, sort_order)
VALUES
    ('cat_hot', 't_uae_001', 'Hot Beverages', 'مشروبات ساخنة', '#b45309', 'Coffee', 1),
    ('cat_sand', 't_uae_001', 'Sandwiches & Paratha', 'سندويشات وبراتا', '#ea580c', 'Utensils', 2),
    ('cat_shaw', 't_uae_001', 'Shawarma & Grills', 'شاورما ومشويات', '#dc2626', 'Flame', 3),
    ('cat_juice', 't_uae_001', 'Fresh Juices', 'عصائر طازجة', '#16a34a', 'Citrus', 4),
    ('cat_paper', 't_uae_001', 'Paper & Stationery', 'ورق وقرطاسية', '#2563eb', 'Files', 5),
    ('cat_pens', 't_uae_001', 'Writing Instruments', 'أقلام وأدوات كتابة', '#7c3aed', 'PenTool', 6)
ON CONFLICT (id) DO NOTHING;

-- 4. Products (Prices are AED, VAT inclusive)
INSERT INTO products (id, tenant_id, category_id, sku, barcode, name_en, name_ar, selling_price, vat_rate, unit, track_stock, is_quick_order)
VALUES
    ('p_c01', 't_uae_001', 'cat_hot', 'BEV-KARAK', '6291001001', 'Special Karak Chai', 'شاي كرك مميز', 1.50, 0.05, 'PORTION', FALSE, TRUE),
    ('p_c02', 't_uae_001', 'cat_hot', 'BEV-SULAIMANI', '6291001002', 'Sulaimani Black Tea', 'شاي سليماني أحمر', 1.00, 0.05, 'PORTION', FALSE, TRUE),
    ('p_c03', 't_uae_001', 'cat_sand', 'FNB-OMAN-PARATHA', '6291001003', 'Oman Chips & Cheese Paratha', 'براتا بطاطس عمان وجبن', 5.00, 0.05, 'PORTION', FALSE, TRUE),
    ('p_c04', 't_uae_001', 'cat_sand', 'FNB-CLUB-JUMBO', '6291001004', 'Chicken Club Sandwich Jumbo', 'كلوب ساندوتش دجاج جمبو', 15.00, 0.05, 'PORTION', FALSE, TRUE),
    ('p_c05', 't_uae_001', 'cat_shaw', 'FNB-SHAW-ARABIC', '6291001005', 'Chicken Shawarma Arabic Plate', 'صحن شاورما دجاج عربي', 18.00, 0.05, 'PORTION', FALSE, TRUE),
    ('p_c06', 't_uae_001', 'cat_juice', 'BEV-ORANGE-FRESH', '6291001006', 'Fresh Orange Juice 500ml', 'عصير برتقال طازج', 12.00, 0.05, 'PORTION', FALSE, TRUE),
    -- Stationery Items
    ('p_s01', 't_uae_001', 'cat_paper', 'PAP-DBLA-A4', '8851907001015', 'Double A Copy Paper A4 80gsm (500 Sheets)', 'ورق تصوير دبل ايه A4 80 جرام', 18.50, 0.05, 'PACK', TRUE, FALSE),
    ('p_s02', 't_uae_001', 'cat_pens', 'PEN-FC-07B', '4005401423512', 'Faber-Castell 0.7mm Blue Pen (Box of 10)', 'أقلام حبر فايبر كاستل أزرق 0.7 مم', 12.00, 0.05, 'BOX', TRUE, FALSE),
    ('p_s03', 't_uae_001', 'cat_pens', 'PEN-UNI-EYE-BK', '4902778913925', 'Uni-ball Eye UB-150 Micro Black', 'قلم حبر سائل يوني بول آي أسود', 7.50, 0.05, 'PCS', TRUE, FALSE),
    ('p_s04', 't_uae_001', 'cat_paper', 'CALC-CAS-991', '4549526600747', 'Casio FX-991EX Scientific Calculator', 'آلة حاسبة علمية كاسيو 991', 75.00, 0.05, 'PCS', TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- 5. Modifiers
INSERT INTO modifier_groups (id, tenant_id, name_en, name_ar, min_selection, max_selection)
VALUES
    ('mg_sugar', 't_uae_001', 'Sugar Level', 'مستوى السكر', 1, 1),
    ('mg_addon', 't_uae_001', 'Add-ons', 'إضافات', 0, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO modifiers (id, group_id, name_en, name_ar, price_delta, is_default)
VALUES
    ('mod_s1', 'mg_sugar', 'Normal Sugar', 'سكر عادي', 0.00, TRUE),
    ('mod_s2', 'mg_sugar', 'Less Sugar', 'سكر خفيف', 0.00, FALSE),
    ('mod_s3', 'mg_sugar', 'No Sugar (Sada)', 'بدون سكر (سادة)', 0.00, FALSE),
    ('mod_a1', 'mg_addon', 'Extra Cheese Slice', 'شريحة جبن إضافية', 1.50, FALSE),
    ('mod_a2', 'mg_addon', 'Spicy Jalapeno / Hot Sauce', 'صلصة حارة / هلابينو', 1.00, FALSE),
    ('mod_a3', 'mg_addon', 'Extra Karak Saffron & Cardamom', 'زعفران وهيل إضافي', 0.50, FALSE)
ON CONFLICT (id) DO NOTHING;
