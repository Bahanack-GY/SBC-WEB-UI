import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { sbcApiService } from '../services/SBCApiService';

interface RelanceContextType {
  hasRelanceSubscription: boolean;
  isLoading: boolean;
  checkRelanceSubscription: () => Promise<void>;
}

const RelanceContext = createContext<RelanceContextType | undefined>(undefined);

export const RelanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hasRelanceSubscription, setHasRelanceSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkRelanceSubscription = async () => {
    try {
      const response = await sbcApiService.checkSubscription('RELANCE');
      const hasSub = response?.body?.data?.hasSubscription || false;
      setHasRelanceSubscription(hasSub);
    } catch (error) {
      console.error('Error checking Relance subscription:', error);
      setHasRelanceSubscription(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkRelanceSubscription();
  }, []);

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
