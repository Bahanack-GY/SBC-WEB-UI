import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { useAuth } from './AuthContext';

interface RelanceContextType {
  emailBalance: number;
  smsBalance: number;
  hasCredits: boolean;            // true if either balance > 0 OR admin/tester
  isLoading: boolean;
  refreshBalance: () => Promise<void>;

  // Backward compat aliases (read-only): older code may still call this name.
  hasRelanceSubscription: boolean;
  checkRelanceSubscription: () => Promise<void>;
}

const RelanceContext = createContext<RelanceContextType | undefined>(undefined);

export const RelanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const isAdminOrTester = user?.role === 'admin' || user?.role === 'tester';
  const [emailBalance, setEmailBalance] = useState(0);
  const [smsBalance, setSmsBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshBalance = async () => {
    if (!isAuthenticated) {
      setEmailBalance(0);
      setSmsBalance(0);
      setIsLoading(false);
      return;
    }
    try {
      const response = await sbcApiService.relanceGetBalance();
      const data = handleApiResponse(response);
      setEmailBalance(data?.emailBalance ?? 0);
      setSmsBalance(data?.smsBalance ?? 0);
    } catch (error) {
      setEmailBalance(0);
      setSmsBalance(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshBalance();
  }, [isAuthenticated]);

  const hasCredits = isAdminOrTester || emailBalance > 0 || smsBalance > 0;

  return (
    <RelanceContext.Provider
      value={{
        emailBalance,
        smsBalance,
        hasCredits,
        isLoading,
        refreshBalance,
        // Backward-compat aliases
        hasRelanceSubscription: hasCredits,
        checkRelanceSubscription: refreshBalance,
      }}
    >
      {children}
    </RelanceContext.Provider>
  );
};

export const useRelance = (): RelanceContextType => {
  const context = useContext(RelanceContext);
  if (context === undefined) {
    throw new Error('useRelance must be used within a RelanceProvider');
  }
  return context;
};
