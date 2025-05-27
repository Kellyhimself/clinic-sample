'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMedications, fetchPatients, createSale, updateSaleStatus } from '@/lib/newSale';
import { addBatch } from '@/app/lib/inventory';
import { fetchSales, getTopSellingMedications, getMedicationProfitMargins } from '@/lib/rpcActions';

// Query keys
export const queryKeys = {
  medications: (tenantId?: string) => ['medications', tenantId] as const,
  patients: (tenantId?: string) => ['patients', tenantId] as const,
  sales: (tenantId?: string) => ['sales', tenantId] as const,
  batches: (tenantId?: string) => ['batches', tenantId] as const,
  topSelling: (tenantId?: string) => ['topSelling', tenantId] as const,
  profitMargins: (tenantId?: string) => ['profitMargins', tenantId] as const,
  salesHistory: (params: { search?: string; timeframe?: string; page?: number; tenantId?: string }) => 
    ['salesHistory', params] as const,
};

// Custom hooks for pharmacy data
export function useMedications(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.medications(tenantId),
    queryFn: fetchMedications,
  });
}

export function usePatients(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.patients(tenantId),
    queryFn: fetchPatients,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createSale,
    onSuccess: (data, variables) => {
      // Invalidate relevant queries with tenant context
      const tenantId = data.tenant_id;
      queryClient.invalidateQueries({ queryKey: queryKeys.sales(tenantId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.medications(tenantId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.topSelling(tenantId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profitMargins(tenantId) });
    },
  });
}

export function useAddBatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: addBatch,
    onSuccess: (data, variables) => {
      // Invalidate medications query with tenant context
      const tenantId = data.tenant_id;
      queryClient.invalidateQueries({ queryKey: queryKeys.medications(tenantId) });
    },
  });
}

// Sales History hooks
export function useSalesHistory(params: { 
  search?: string; 
  timeframe?: string; 
  page?: number;
  pageSize?: number;
  tenantId?: string;
}) {
  return useQuery({
    queryKey: queryKeys.salesHistory(params),
    queryFn: () => fetchSales(params.search || '', params.timeframe || 'all', params.page || 1, params.pageSize || 10),
    placeholderData: (previousData) => previousData,
  });
}

export function useUpdateSaleStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updateData }: { id: string; updateData: { payment_status?: string; payment_method?: string } }) => 
      updateSaleStatus(id, updateData),
    onSuccess: (data, variables) => {
      // Invalidate sales-related queries with tenant context
      const tenantId = data.tenant_id;
      queryClient.invalidateQueries({ queryKey: queryKeys.sales(tenantId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.topSelling(tenantId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profitMargins(tenantId) });
    },
  });
}

// Analytics hooks
export function useTopSellingMedications(timeframe?: string, tenantId?: string) {
  return useQuery({
    queryKey: [...queryKeys.topSelling(tenantId), timeframe],
    queryFn: () => getTopSellingMedications(timeframe),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useMedicationProfitMargins(timeframe?: string, tenantId?: string) {
  return useQuery({
    queryKey: [...queryKeys.profitMargins(tenantId), timeframe],
    queryFn: () => getMedicationProfitMargins(timeframe),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Inventory management hooks
export function useInventoryStatus(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.medications(tenantId),
    queryFn: fetchMedications,
    select: (medications) => {
      return medications.map(med => ({
        ...med,
        lowStock: med.batches.reduce((total, batch) => total + batch.quantity, 0) < 10,
        needsReorder: med.batches.reduce((total, batch) => total + batch.quantity, 0) < 5,
        totalStock: med.batches.reduce((total, batch) => total + batch.quantity, 0),
      }));
    },
  });
}

// Batch management hooks
export function useBatchManagement(medicationId?: string, tenantId?: string) {
  return useQuery({
    queryKey: [...queryKeys.medications(tenantId), medicationId],
    queryFn: fetchMedications,
    select: (medications) => {
      if (!medicationId) return [];
      const medication = medications.find(m => m.id === medicationId);
      return medication?.batches || [];
    },
    enabled: !!medicationId,
  });
} 