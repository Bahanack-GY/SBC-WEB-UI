import { useState, useEffect } from 'react';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { ApiResponse } from '../services/ApiResponse';
import type { Product, Transaction, ProductFilters, TransactionFilters } from '../types/api';

/**
 * Custom hook for API calls with loading and error states
 */
export const useApi = <T>(
  apiCall: () => Promise<ApiResponse>,
  dependencies: unknown[] = [],
  immediate: boolean = true
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  const execute = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall();
      const result = handleApiResponse(response);
      setData(result as T);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, dependencies);

  return {
    data,
    loading,
    error,
    execute,
    refetch: execute
  };
};

/**
 * Hook for products
 */
export const useProducts = (filters?: ProductFilters) => {
  return useApi<Product[]>(
    () => sbcApiService.getProducts(filters),
    [JSON.stringify(filters)]
  );
};

/**
 * Hook for user profile
 */
export const useUserProfile = () => {
  return useApi(() => sbcApiService.getUserProfile());
};

/**
 * Hook for transaction history
 */
export const useTransactionHistory = (filters?: TransactionFilters) => {
  return useApi<Transaction[]>(
    () => sbcApiService.getTransactionHistory(filters),
    [JSON.stringify(filters)]
  );
};

/**
 * Hook for subscription plans
 */
export const useSubscriptionPlans = () => {
  return useApi(
    () => sbcApiService.getSubscriptionPlans(),
    [],
    true
  );
};

/**
 * Hook for notifications
 */
export const useNotifications = () => {
  return useApi(() => sbcApiService.getNotifications());
};

/**
 * Hook for flash sales
 */
export const useFlashSales = () => {
  return useApi(
    () => sbcApiService.getFlashSales(),
    [],
    true
  );
};

/**
 * Hook for events
 */
export const useEvents = () => {
  return useApi(
    () => sbcApiService.getEvents(),
    [],
    true
  );
};

/**
 * Hook for tombola
 */
export const useTombola = () => {
  return useApi(
    () => sbcApiService.getCurrentTombola(),
    [],
    true
  );
};

/**
 * Hook for advertising packs
 */
export const useAdvertisingPacks = () => {
  return useApi(
    () => sbcApiService.getAdvertisingPacks(),
    [],
    true
  );
};

/**
 * Hook for app settings
 */
export const useAppSettings = () => {
  return useApi(
    () => sbcApiService.getAppSettings(),
    [],
    true
  );
};
