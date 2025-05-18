export async function addBatch(batchData: {
  medication_id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  unit_price: number;
  purchase_price: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'pharmacist'].includes(profile.role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can add batches');
  }

  if (!profile.tenant_id) {
    throw new Error('No tenant ID found for user');
  }

  // Set tenant context
  const { error: setContextError } = await supabase
    .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

  if (setContextError) {
    throw new Error('Failed to set tenant context');
  }

  // Get tenant ID from context
  const { data: tenantId, error: getTenantError } = await supabase
    .rpc('get_tenant_id');

  if (getTenantError || !tenantId) {
    throw new Error('Failed to get tenant ID');
  }

  try {
    // First check if a batch with this number already exists
    const { data: existingBatch, error: checkError } = await supabase
      .from('medication_batches')
      .select('id, quantity')
      .eq('medication_id', batchData.medication_id)
      .eq('batch_number', batchData.batch_number)
      .eq('tenant_id', tenantId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw new Error(`Failed to check existing batch: ${checkError.message}`);
    }

    if (existingBatch) {
      // Update existing batch by adding to its quantity
      const { error: updateError } = await supabase
        .from('medication_batches')
        .update({
          quantity: existingBatch.quantity + batchData.quantity,
          unit_price: batchData.unit_price, // Update price to latest
          purchase_price: batchData.purchase_price, // Update purchase price to latest
          expiry_date: batchData.expiry_date // Update expiry date to latest
        })
        .eq('id', existingBatch.id)
        .eq('tenant_id', tenantId);

      if (updateError) {
        throw new Error(`Failed to update existing batch: ${updateError.message}`);
      }
    } else {
      // Insert new batch
      const { error: insertError } = await supabase
        .from('medication_batches')
        .insert({
          medication_id: batchData.medication_id,
          batch_number: batchData.batch_number,
          expiry_date: batchData.expiry_date,
          quantity: batchData.quantity,
          unit_price: batchData.unit_price,
          purchase_price: batchData.purchase_price,
          tenant_id: tenantId
        });

      if (insertError) {
        throw new Error(`Failed to create new batch: ${insertError.message}`);
      }
    }
  } catch (error) {
    console.error('Error in addBatch:', error);
    throw error;
  }
} 