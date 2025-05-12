-- First, drop the existing function
DROP FUNCTION IF EXISTS get_tenant_sales(text,text,integer,integer);

-- Then create the new function with debugging
CREATE OR REPLACE FUNCTION get_tenant_sales(
  p_search_term text DEFAULT '',
  p_timeframe text DEFAULT 'all',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  payment_method varchar(50),
  payment_status varchar(50),
  total_amount numeric,
  transaction_id varchar(100),
  patient jsonb,
  items jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_start_date timestamptz;
  v_end_date timestamptz;
  v_offset integer;
  v_debug_info jsonb;
  v_total_sales integer;
BEGIN
  -- Get tenant ID from context
  v_tenant_id := current_setting('app.current_tenant_id', true)::uuid;
  
  -- Debug info
  v_debug_info := jsonb_build_object(
    'tenant_id', v_tenant_id,
    'search_term', p_search_term,
    'timeframe', p_timeframe,
    'page', p_page,
    'page_size', p_page_size
  );
  
  -- Log debug info
  RAISE NOTICE 'Debug info: %', v_debug_info;
  
  -- Check total number of sales for this tenant
  SELECT COUNT(*) INTO v_total_sales
  FROM sales
  WHERE tenant_id = v_tenant_id;
  
  RAISE NOTICE 'Total sales for tenant: %', v_total_sales;
  
  -- Calculate date range based on timeframe
  IF p_timeframe = 'today' THEN
    v_start_date := date_trunc('day', now());
    v_end_date := date_trunc('day', now() + interval '1 day');
  ELSIF p_timeframe = 'week' THEN
    v_start_date := date_trunc('week', now());
    v_end_date := date_trunc('week', now() + interval '1 week');
  ELSIF p_timeframe = 'month' THEN
    v_start_date := date_trunc('month', now());
    v_end_date := date_trunc('month', now() + interval '1 month');
  ELSIF p_timeframe = 'year' THEN
    v_start_date := date_trunc('year', now());
    v_end_date := date_trunc('year', now() + interval '1 year');
  END IF;
  
  -- Calculate offset for pagination
  v_offset := (p_page - 1) * p_page_size;
  
  -- Log the query parameters
  RAISE NOTICE 'Query parameters: start_date=%, end_date=%, offset=%', 
    v_start_date, v_end_date, v_offset;
  
  -- First check if there are any sales for this tenant
  RAISE NOTICE 'Checking for sales with tenant_id: %', v_tenant_id;
  
  -- Debug: Check sales table structure
  RAISE NOTICE 'Sales table columns: %', (
    SELECT string_agg(column_name, ', ')
    FROM information_schema.columns
    WHERE table_name = 'sales'
  );
  
  -- Debug: Check a sample of sales
  RAISE NOTICE 'Sample sales: %', (
    SELECT json_agg(s)
    FROM (
      SELECT id, tenant_id, created_at, total_amount
      FROM sales
      WHERE tenant_id = v_tenant_id
      LIMIT 5
    ) s
  );
  
  RETURN QUERY
  WITH sale_items_agg AS (
    SELECT 
      si.sale_id,
      jsonb_agg(
        jsonb_build_object(
          'item_id', si.id,
          'quantity', si.quantity,
          'unit_price', si.unit_price,
          'total_price', si.total_price,
          'medication_id', m.id,
          'medication_name', m.name,
          'medication_dosage_form', m.dosage_form,
          'medication_strength', m.strength,
          'batch_number', b.batch_number,
          'batch_expiry_date', b.expiry_date
        )
      ) as items
    FROM sale_items si
    LEFT JOIN medications m ON si.medication_id = m.id
    LEFT JOIN medication_batches b ON si.batch_id = b.id
    GROUP BY si.sale_id
  )
  SELECT 
    s.id,
    s.created_at,
    s.payment_method,
    s.payment_status,
    s.total_amount,
    s.transaction_id,
    jsonb_build_object(
      'full_name', p.full_name,
      'phone_number', p.phone_number
    ) as patient,
    COALESCE(sia.items, '[]'::jsonb) as items
  FROM sales s
  LEFT JOIN guest_patients p ON s.patient_id = p.id
  LEFT JOIN sale_items_agg sia ON s.id = sia.sale_id
  WHERE s.tenant_id = v_tenant_id
    AND (
      p_timeframe = 'all' OR
      (s.created_at >= v_start_date AND s.created_at < v_end_date)
    )
    AND (
      p_search_term = '' OR
      p.full_name ILIKE '%' || p_search_term || '%' OR
      EXISTS (
        SELECT 1
        FROM sale_items si
        JOIN medications m ON si.medication_id = m.id
        WHERE si.sale_id = s.id
        AND m.name ILIKE '%' || p_search_term || '%'
      )
    )
  ORDER BY s.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
  
  -- Log the number of rows returned
  GET DIAGNOSTICS v_debug_info = ROW_COUNT;
  RAISE NOTICE 'Number of rows returned: %', v_debug_info;
END;
$$; 