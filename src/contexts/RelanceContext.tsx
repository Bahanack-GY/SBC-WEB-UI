import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { sbcApiService } from '../services/SBCApiService';
import { useAuth } from './AuthContext';

interface RelanceContextType {
  hasRelanceSubscription: boolean;
  isLoading: boolean;
  checkRelanceSubscription: () => Promise<void>;
}

const RelanceContext = createContext<RelanceContextType | undefined>(undefined);

export const RelanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isAdminOrTester = user?.role === 'admin' || user?.role === 'tester';
  const [hasRelanceSubscription, setHasRelanceSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkRelanceSubscription = async () => {
    // Admin/tester always has access
    if (isAdminOrTester) {
      setHasRelanceSubscription(true);
      setIsLoading(false);
      return;
    }
    try {
      const response = await sbcApiService.checkSubscription('RELANCE');
      const hasSub = response?.body?.data?.hasSubscription || false;
      setHasRelanceSubscription(hasSub);
    } catch (error) {
      setHasRelanceSubscription(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkRelanceSubscription();
  }, [isAdminOrTester]);

  return (
    <RelanceContext.Provider
      value={{
        hasRelanceSubscription,
        isLoading,
        checkRelanceSubscription,
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
