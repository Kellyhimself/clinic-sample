-- Create function to decrement batch quantity
CREATE OR REPLACE FUNCTION public.decrement_batch_quantity(
  p_batch_id UUID,
  p_quantity INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Update the batch quantity
  UPDATE public.medication_batches
  SET quantity = quantity - p_quantity
  WHERE id = p_batch_id
  AND quantity >= p_quantity;

  -- Check if the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock or batch not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.decrement_batch_quantity TO authenticated; 