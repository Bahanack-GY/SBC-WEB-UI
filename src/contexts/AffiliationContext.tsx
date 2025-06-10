// src/contexts/AffiliationContext.tsx
import React, { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';

interface AffiliationContextType {
    affiliationCode: string | null;
    setAffiliationCode: (code: string | null) => void;
}

const AffiliationContext = createContext<AffiliationContextType | undefined>(undefined);

export const AffiliationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [affiliationCode, setAffiliationCode] = useState<string | null>(null);

    return (
        <AffiliationContext.Provider value={{ affiliationCode, setAffiliationCode }}>
            {children}
        </AffiliationContext.Provider>
    );
};

export const useAffiliation = () => {
    const context = useContext(AffiliationContext);
    if (context === undefined) {
        throw new Error('useAffiliation must be used within an AffiliationProvider');
    }
    return context;
};