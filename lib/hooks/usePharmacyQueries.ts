'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMedications, fetchPatients, createSale, updateSaleStatus } from '@/lib/newSale';
import { addBatch } from '@/app/lib/inventory';
import { fetchSales, getTopSellingMedications, getMedicationProfitMargins } from '@/lib/rpcActions';
import type { Patient, Medication, Sale } from '@/types/supabase';

// Query keys
export const queryKeys = {
  medications: ['medications'] as const,
  patients: ['patients'] as const,
  sales: ['sales'] as const,
  batches: ['batches'] as const,
  topSelling: ['topSelling'] as const,
  profitMargins: ['profitMargins'] as const,
  salesHistory: (params: { search?: string; timeframe?: string; page?: number }) => 
    ['salesHistory', params] as const,
};

// Custom hooks for pharmacy data
export function useMedications() {
  return useQuery({
    queryKey: queryKeys.medications,
    queryFn: fetchMedications,
  });
}

export function usePatients() {
  return useQuery({
    queryKey: queryKeys.patients,
    queryFn: fetchPatients,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.sales });
      queryClient.invalidateQueries({ queryKey: queryKeys.medications });
      queryClient.invalidateQueries({ queryKey: queryKeys.topSelling });
      queryClient.invalidateQueries({ queryKey: queryKeys.profitMargins });
    },
  });
}

export function useAddBatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: addBatch,
    onSuccess: () => {
      // Invalidate medications query to reflect new batch
      queryClient.invalidateQueries({ queryKey: queryKeys.medications });
    },
  });
}

// Sales History hooks
export function useSalesHistory(params: { 
  search?: string; 
  timeframe?: string; 
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: queryKeys.salesHistory(params),
    queryFn: () => fetchSales(params.search || '', params.timeframe || 'all', params.page || 1, params.pageSize || 10),
    placeholderData: (previousData) => previousData, // Keep previous data while loading new data
  });
}

export function useUpdateSaleStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updateData }: { id: string; updateData: { payment_status?: string; payment_method?: string } }) => 
      updateSaleStatus(id, updateData),
    onSuccess: () => {
      // Invalidate sales-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.sales });
      queryClient.invalidateQueries({ queryKey: queryKeys.topSelling });
      queryClient.invalidateQueries({ queryKey: queryKeys.profitMargins });
    },
  });
}

// Analytics hooks
export function useTopSellingMedications(timeframe?: string) {
  return useQuery({
    queryKey: [...queryKeys.topSelling, timeframe],
    queryFn: () => getTopSellingMedications(),
  });
}

export function useMedicationProfitMargins(timeframe?: string) {
  return useQuery({
    queryKey: [...queryKeys.profitMargins, timeframe],
    queryFn: () => getMedicationProfitMargins(),
  });
}

// Inventory management hooks
export function useInventoryStatus() {
  return useQuery({
    queryKey: queryKeys.medications,
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
export function useBatchManagement(medicationId?: string) {
  return useQuery({
    queryKey: [...queryKeys.medications, medicationId],
    queryFn: fetchMedications,
    select: (medications) => {
      if (!medicationId) return [];
      const medication = medications.find(m => m.id === medicationId);
      return medication?.batches || [];
    },
    enabled: !!medicationId,
  });
} 