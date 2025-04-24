'use server';

import { getSupabaseClient } from './supabase-server';

/**
 * Server action to fetch top selling medications
 */
export async function getTopSellingMedications() {
  try {
    const supabase = await getSupabaseClient();
    
    // Custom query since the RPC function has the wrong table structure
    const { data, error } = await supabase
      .from('sale_items')
      .select(`
        id,
        medication_id,
        quantity,
        medication:medications (
          id,
          name
        )
      `)
      .order('quantity', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error('Error fetching top selling medications:', error);
      throw new Error('Failed to fetch top selling medications');
    }
    
    // Transform the data to match the expected format
    const transformedData = data.map(item => ({
      medication_id: item.medication_id,
      medication_name: item.medication.name,
      total_quantity: item.quantity
    }));
    
    return transformedData || [];
  } catch (error) {
    console.error('Error in getTopSellingMedications:', error);
    throw error;
  }
}

/**
 * Server action to calculate profit and reorders data
 */
export async function calculateProfitAndReorders() {
  try {
    const supabase = await getSupabaseClient();
    
    // First, get all medications
    const { data: medications, error: medicationsError } = await supabase
      .from('medications')
      .select(`
        id,
        name,
        unit_price,
        quantity_in_stock,
        reorder_level
      `);
      
    if (medicationsError) {
      console.error('Error fetching medications:', medicationsError);
      throw new Error('Failed to fetch medications');
    }
    
    // Then, get all sale items to calculate sales
    const { data: saleItems, error: saleItemsError } = await supabase
      .from('sale_items')
      .select(`
        id,
        medication_id,
        quantity,
        unit_price
      `);
      
    if (saleItemsError) {
      console.error('Error fetching sale items:', saleItemsError);
      throw new Error('Failed to fetch sale items');
    }
    
    // Calculate profits and reorder status for each medication
    const profitData = medications.map(medication => {
      // Get all sale items for this medication
      const medicationSales = saleItems.filter(item => 
        item.medication_id === medication.id
      );
      
      // Calculate totals
      const totalSales = medicationSales.reduce((sum, item) => 
        sum + (item.quantity * item.unit_price), 0);
      
      const totalCost = medicationSales.reduce((sum, item) => 
        sum + (item.quantity * medication.unit_price), 0);
      
      // Calculate profit margin
      let profitMargin = 0;
      if (totalCost > 0) {
        profitMargin = ((totalSales - totalCost) / totalCost) * 100;
      }
      
      return {
        id: medication.id,
        name: medication.name,
        total_sales: totalSales,
        total_cost: totalCost,
        profit_margin: profitMargin,
        reorder_suggested: medication.quantity_in_stock <= medication.reorder_level
      };
    });
    
    return profitData;
  } catch (error) {
    console.error('Error in calculateProfitAndReorders:', error);
    throw error;
  }
} 