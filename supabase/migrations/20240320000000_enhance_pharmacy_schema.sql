-- Enhance medications table
ALTER TABLE medications
ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255),
ADD COLUMN IF NOT EXISTS dosage_form VARCHAR(100),
ADD COLUMN IF NOT EXISTS strength VARCHAR(100),
ADD COLUMN IF NOT EXISTS barcode VARCHAR(50),
ADD COLUMN IF NOT EXISTS shelf_location VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_restocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_sold_at TIMESTAMP WITH TIME ZONE;

-- Create medication_categories table
CREATE TABLE IF NOT EXISTS medication_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create medication_batches table for better expiry tracking
CREATE TABLE IF NOT EXISTS medication_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_id UUID REFERENCES medications(id),
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INT NOT NULL,
    purchase_price DECIMAL(10,2) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    received_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stock_movements table for detailed stock tracking
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_id UUID REFERENCES medications(id),
    batch_id UUID REFERENCES medication_batches(id),
    movement_type VARCHAR(50) NOT NULL, -- 'purchase', 'sale', 'adjustment', 'return'
    quantity INT NOT NULL,
    reference_id UUID, -- links to sales, purchase_orders, etc.
    reference_type VARCHAR(50), -- 'sale', 'purchase_order', etc.
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_adjustments table
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_id UUID REFERENCES medications(id),
    batch_id UUID REFERENCES medication_batches(id),
    adjustment_type VARCHAR(50) NOT NULL, -- 'add', 'remove', 'damage', 'expired'
    quantity INT NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales_items table for detailed sales tracking
CREATE TABLE IF NOT EXISTS sales_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id),
    medication_id UUID REFERENCES medications(id),
    batch_id UUID REFERENCES medication_batches(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    medication_id UUID REFERENCES medications(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    received_quantity INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'partial', 'complete'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number VARCHAR(50) NOT NULL,
    sale_id UUID REFERENCES sales(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    medication_total DECIMAL(10,2) DEFAULT 0,
    appointment_total DECIMAL(10,2) DEFAULT 0
);

-- Create functions for stock management
CREATE OR REPLACE FUNCTION update_medication_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE medications
        SET quantity_in_stock = quantity_in_stock + NEW.quantity,
            last_restocked_at = CASE 
                WHEN NEW.movement_type = 'purchase' THEN NOW()
                ELSE last_restocked_at
            END,
            last_sold_at = CASE 
                WHEN NEW.movement_type = 'sale' THEN NOW()
                ELSE last_sold_at
            END
        WHERE id = NEW.medication_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE medications
        SET quantity_in_stock = quantity_in_stock - OLD.quantity
        WHERE id = OLD.medication_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for stock management
CREATE TRIGGER stock_movement_trigger
AFTER INSERT OR DELETE ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_medication_stock();

-- Create function to check expiry dates
CREATE OR REPLACE FUNCTION check_expiry_dates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expiry_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Expiry date cannot be in the past';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for expiry date validation
CREATE TRIGGER validate_expiry_date
BEFORE INSERT OR UPDATE ON medication_batches
FOR EACH ROW
EXECUTE FUNCTION check_expiry_dates(); 