-- ============================================================================
-- UAE COMPLIANT POS & ERP DATABASE SCHEMA (PostgreSQL / SQLite Compatible)
-- Standards: UAE Federal Tax Authority (FTA) Cabinet Decision No. (52) of 2017
--            Federal Decree-Law No. (8) of 2017 on Value Added Tax
--            E-Invoicing Readiness (Peppol PINT-AE / Decentralized CTC Model)
-- Supported Modes: Small Cafeteria / F&B and Stationery / Retail
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TENANTS & MULTI-BRANCH CONFIGURATION
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(36) PRIMARY KEY,                  -- UUID
    legal_name_en VARCHAR(255) NOT NULL,         -- e.g., "Al Barakah Cafeteria LLC"
    legal_name_ar VARCHAR(255) NOT NULL,         -- e.g., "كافتيريا البركة ذ.م.م"
    trade_license_no VARCHAR(100),               -- UAE DED License Number
    trn VARCHAR(15) NOT NULL,                    -- 15-digit FTA Tax Registration Number (e.g. 100xxxxxxxxxxxx)
    country_code VARCHAR(2) DEFAULT 'AE',
    currency_code VARCHAR(3) DEFAULT 'AED',
    vat_rate NUMERIC(5, 4) DEFAULT 0.0500,       -- 5% Standard VAT
    is_tax_inclusive BOOLEAN DEFAULT TRUE,       -- Retail & Cafeterias legally quote prices VAT-inclusive
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_trn_format CHECK (LENGTH(trn) = 15)
);

CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_code VARCHAR(20) NOT NULL,            -- e.g., "DXB-01", "SHJ-02"
    name_en VARCHAR(255) NOT NULL,               -- e.g., "Al Rigga Branch"
    name_ar VARCHAR(255) NOT NULL,               -- e.g., "فرع الرقة"
    emirate VARCHAR(50) DEFAULT 'Dubai',         -- Dubai, Abu Dhabi, Sharjah, Ajman, RAK, UAQ, Fujairah
    address_en TEXT NOT NULL,
    address_ar TEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    operational_mode VARCHAR(20) DEFAULT 'CAFETERIA', -- 'CAFETERIA' or 'STATIONERY'
    thermal_printer_width VARCHAR(10) DEFAULT '80mm', -- '80mm' (48-col) or '58mm' (32-col)
    cash_drawer_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. RBAC & USER MANAGEMENT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id VARCHAR(36) REFERENCES branches(id) ON DELETE SET NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,                   -- 'ADMIN', 'SUPERVISOR', 'CASHIER'
    pin_hash VARCHAR(255) NOT NULL,              -- 4-6 digit fast login & authorization PIN
    can_apply_discount BOOLEAN DEFAULT FALSE,    -- Cashiers need supervisor PIN override
    can_void_item BOOLEAN DEFAULT FALSE,
    can_open_drawer_manual BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. PRODUCT CATEGORIES & CATALOG (BILINGUAL)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parent_id VARCHAR(36) REFERENCES categories(id) ON DELETE SET NULL,
    name_en VARCHAR(150) NOT NULL,               -- e.g., "Hot Beverages", "Writing & Pens"
    name_ar VARCHAR(150) NOT NULL,               -- e.g., "مشروبات ساخنة", "أقلام وأدوات كتابة"
    color_code VARCHAR(10) DEFAULT '#2563eb',    -- Hex code for quick-order touchscreen grid
    icon_name VARCHAR(50),                       -- Lucide icon reference
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id VARCHAR(36) REFERENCES categories(id) ON DELETE SET NULL,
    sku VARCHAR(100) NOT NULL,                   -- Stock Keeping Unit
    barcode VARCHAR(100),                        -- EAN-13, Code 128, etc.
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    description TEXT,
    cost_price NUMERIC(10, 2) DEFAULT 0.00,      -- In AED
    selling_price NUMERIC(10, 2) NOT NULL,       -- In AED (VAT inclusive or exclusive based on tenant)
    vat_rate NUMERIC(5, 4) DEFAULT 0.0500,       -- 0.0500 (5%), 0.0000 (Zero-rate), -1 (Exempt)
    is_tax_inclusive BOOLEAN DEFAULT TRUE,
    unit VARCHAR(20) DEFAULT 'PCS',              -- 'PCS', 'BOX', 'PACK', 'PORTION', 'PAGE', 'SERVICE'
    track_stock BOOLEAN DEFAULT TRUE,            -- False for kitchen recipes, loose printing services
    image_url TEXT,
    is_quick_order BOOLEAN DEFAULT TRUE,         -- Display on Cafeteria touch grid
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. MODIFIER GROUPS & RECIPE ADD-ONS (FOR CAFETERIA / F&B)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS modifier_groups (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name_en VARCHAR(100) NOT NULL,               -- e.g., "Sugar Level", "Cheese Add-ons", "Bread Type"
    name_ar VARCHAR(100) NOT NULL,               -- e.g., "مستوى السكر", "إضافات الجبن", "نوع الخبز"
    min_selection INT DEFAULT 0,                 -- 0 for optional, 1 for required (single choice)
    max_selection INT DEFAULT 1,                 -- 1 for single radio, >1 for multi-select
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS product_modifier_groups (
    product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    modifier_group_id VARCHAR(36) NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, modifier_group_id)
);

CREATE TABLE IF NOT EXISTS modifiers (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name_en VARCHAR(100) NOT NULL,               -- e.g., "Extra Karak Spice", "Less Sugar", "Extra Cheese"
    name_ar VARCHAR(100) NOT NULL,               -- e.g., "هيل زعفران إضافي", "سكر قليل", "جبن إضافي"
    price_delta NUMERIC(10, 2) DEFAULT 0.00,     -- e.g., +1.50 AED
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- 5. INVENTORY & STOCK TRACKING (FOR STATIONERY / RETAIL)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stock_on_hand NUMERIC(12, 3) DEFAULT 0.000,
    min_reorder_level NUMERIC(12, 3) DEFAULT 5.000,
    max_reorder_level NUMERIC(12, 3) DEFAULT 100.000,
    last_counted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_branch_product UNIQUE (branch_id, product_id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    product_id VARCHAR(36) NOT NULL REFERENCES products(id),
    movement_type VARCHAR(20) NOT NULL,          -- 'SALE', 'PURCHASE', 'ADJUSTMENT', 'TRANSFER', 'WASTE'
    quantity_change NUMERIC(12, 3) NOT NULL,     -- Negative for sale, positive for restock
    stock_after NUMERIC(12, 3) NOT NULL,
    reference_id VARCHAR(100),                   -- Invoice ID or PO Number
    reason TEXT,
    created_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. SHIFT SESSIONS & CASH DRAWER CONTROLS (X & Z REPORTS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shift_sessions (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    terminal_id VARCHAR(50) NOT NULL,            -- e.g., "POS-01"
    cashier_id VARCHAR(36) NOT NULL REFERENCES users(id),
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_float NUMERIC(10, 2) NOT NULL,       -- Initial cash in drawer (e.g. 500 AED)
    
    -- Real-time aggregations
    cash_sales NUMERIC(10, 2) DEFAULT 0.00,
    card_sales NUMERIC(10, 2) DEFAULT 0.00,
    credit_sales NUMERIC(10, 2) DEFAULT 0.00,
    cash_in NUMERIC(10, 2) DEFAULT 0.00,         -- Cash added during shift
    cash_out NUMERIC(10, 2) DEFAULT 0.00,        -- Petty cash / expense payouts
    
    -- End-of-day reconciliation (Z-Report)
    expected_cash NUMERIC(10, 2),                -- opening_float + cash_sales + cash_in - cash_out
    counted_cash NUMERIC(10, 2),                 -- Actual cash counted by cashier
    discrepancy NUMERIC(10, 2),                  -- counted_cash - expected_cash (Over/Short)
    closing_notes TEXT,
    supervisor_id VARCHAR(36) REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'OPEN'            -- 'OPEN', 'CLOSED'
);

-- ----------------------------------------------------------------------------
-- 7. SALES INVOICES (UAE FTA SIMPLIFIED TAX INVOICE & E-INVOICING)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_invoices (
    id VARCHAR(36) PRIMARY KEY,                  -- UUID v4
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    shift_id VARCHAR(36) REFERENCES shift_sessions(id),
    cashier_id VARCHAR(36) NOT NULL REFERENCES users(id),
    terminal_id VARCHAR(50) NOT NULL,
    
    -- Sequential Numbering (Idempotent per branch/terminal)
    invoice_number VARCHAR(100) NOT NULL UNIQUE, -- e.g. "INV-DXB01-20261029-0042"
    sequence_number BIGINT NOT NULL,
    
    order_type VARCHAR(20) DEFAULT 'WALK_IN',    -- 'WALK_IN', 'TAKEAWAY', 'DINE_IN', 'RETAIL'
    table_number VARCHAR(20),                    -- For Dine-In cafeteria orders
    customer_name VARCHAR(150),
    customer_trn VARCHAR(15),                    -- For B2B Simplified/Tax Invoice
    
    -- Statutory Monetary Totals in AED
    subtotal_taxable NUMERIC(10, 2) NOT NULL,    -- Net Taxable Base
    discount_total NUMERIC(10, 2) DEFAULT 0.00,
    vat_total NUMERIC(10, 2) NOT NULL,           -- Standard 5% VAT
    rounding_difference NUMERIC(5, 2) DEFAULT 0.00, -- Nearest 5 or 25 fils
    grand_total NUMERIC(10, 2) NOT NULL,         -- Final gross payable in AED
    
    payment_status VARCHAR(20) DEFAULT 'PAID',   -- 'PAID', 'PARTIAL', 'CREDIT', 'VOIDED'
    payment_method VARCHAR(20) NOT NULL,         -- 'CASH', 'CARD', 'SPLIT', 'CUSTOMER_TAB'
    
    -- UAE FTA TLV QR Code & Cryptographic Ledger (E-Invoicing Readiness)
    qr_tlv_base64 TEXT NOT NULL,                 -- Base64 encoded TLV byte stream
    invoice_hash VARCHAR(64),                    -- SHA-256 hash of invoice payload
    previous_invoice_hash VARCHAR(64),           -- Chained ledger hash for tamper prevention
    peppol_pint_uuid VARCHAR(36),                -- UUID mapped for UAE PINT-AE e-invoicing transmission
    asp_sync_status VARCHAR(20) DEFAULT 'LOCAL', -- 'LOCAL', 'QUEUED', 'SUBMITTED', 'REJECTED'
    
    -- Local Offline-First Replication
    local_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    server_synced_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id VARCHAR(36) PRIMARY KEY,
    invoice_id VARCHAR(36) NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    product_id VARCHAR(36) NOT NULL REFERENCES products(id),
    sku VARCHAR(100) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    quantity NUMERIC(10, 3) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,          -- Base rate per unit
    discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    taxable_amount NUMERIC(10, 2) NOT NULL,      -- (quantity * unit_price) - discount
    vat_rate NUMERIC(5, 4) DEFAULT 0.0500,       -- Standard 5%
    vat_amount NUMERIC(10, 2) NOT NULL,          -- taxable_amount * vat_rate
    line_total NUMERIC(10, 2) NOT NULL,          -- taxable_amount + vat_amount
    modifiers_json TEXT,                         -- JSON array of selected options
    kitchen_notes TEXT                           -- Special requests: e.g. "No onions, less ice"
);

CREATE TABLE IF NOT EXISTS invoice_payments (
    id VARCHAR(36) PRIMARY KEY,
    invoice_id VARCHAR(36) NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    payment_method VARCHAR(20) NOT NULL,         -- 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'APPLE_PAY'
    amount_paid NUMERIC(10, 2) NOT NULL,
    tendered_amount NUMERIC(10, 2),              -- Cash given by customer (e.g. AED 100)
    change_given NUMERIC(10, 2) DEFAULT 0.00,    -- Change returned (e.g. AED 25.50)
    card_auth_code VARCHAR(50),                  -- POS Terminal authorization code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 8. TABLE TABS & PARKED TICKETS (HOLD / RECALL)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS held_orders (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    cashier_id VARCHAR(36) NOT NULL REFERENCES users(id),
    table_number VARCHAR(20),
    guest_count INT DEFAULT 1,
    cart_json TEXT NOT NULL,                     -- Serialized items, modifiers, and subtotal
    held_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ACTIVE'          -- 'ACTIVE', 'RECALLED', 'MERGED', 'SPLIT'
);

-- ----------------------------------------------------------------------------
-- 9. PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON sales_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON sales_invoices(local_created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_sync ON sales_invoices(asp_sync_status);
CREATE INDEX IF NOT EXISTS idx_inventory_lookup ON inventory(branch_id, product_id);
CREATE INDEX IF NOT EXISTS idx_shift_terminal ON shift_sessions(terminal_id, status);
