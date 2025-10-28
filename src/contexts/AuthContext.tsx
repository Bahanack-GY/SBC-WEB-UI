import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse, setToken, removeToken, getToken } from '../utils/apiHelpers';
import { invalidateApiCache } from '../hooks/useApiCache';
import type { ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  avatar?: string;
  avatarId?: string;
  referralCode?: string;
  momoNumber?: string;
  momoOperator?: string;
  balance?: number;
  usdBalance?: number;
  cryptoWalletAddress?: string;
  cryptoWalletCurrency?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ requiresOtp: boolean; userId?: string; email?: string; hasNegativeBalance?: boolean; recoveryMessage?: string }>;
  register: (userData: any) => Promise<{ userId: string }>;
  logout: () => Promise<void>;
  verifyOtp: (userId: string, otp: string) => Promise<void>;
  updateProfile: (updates: Record<string, any>) => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user && !!getToken();

  // Load user on app start
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          await refreshUser();
        } catch (error) {
          removeToken();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (identifier: string, password: string): Promise<{ requiresOtp: boolean; userId?: string; email?: string; hasNegativeBalance?: boolean; recoveryMessage?: string }> => {
    try {
      const response = await sbcApiService.loginUser(identifier, password);

      const data = handleApiResponse(response);

      // Check if the response indicates OTP verification is required
      // This handles various possible response formats from the API
      const needsOtp = data.requiresOtp || data.otpRequired || data.needsVerification ||
        (!data.token && (data.userId || data.id)) ||
        data.status === 'pending_verification';


      if (needsOtp) {
        // OTP verification required - don't set token or user yet
        const userId = data.userId || data.id || data.user?.id;
        const userEmail = data.email || identifier;

        // Store userId temporarily for OTP verification (as per documentation)
        sessionStorage.setItem('tempUserId', userId);

        const result = {
          requiresOtp: true,
          userId: userId,
          email: userEmail
        };
        return result;
      }

      // Direct login success (no OTP required)
      if (data.token) {
        setToken(data.token);
      }

      if (data.user) {
        setUser(data.user);
        
        // Check for negative balance and recovery options
        if (data.user.balance && data.user.balance < 0) {
          try {
            const recoveryResponse = await sbcApiService.checkRecoveryLogin(identifier);
            
            if (recoveryResponse) {
              const recoveryData = handleApiResponse(recoveryResponse);
              
              if (recoveryData?.data?.hasRecoverableTransactions) {
                const recoveryInfo = recoveryData.data;
                const recoveryMessage = `Votre compte a un solde négatif car vous avez probablement des filleuls qui ont payé mais leurs comptes n'ont pas encore été restaurés. Veuillez leur demander de s'inscrire avec l'email ou le numéro de téléphone qu'ils ont utilisé précédemment. Ils n'auront pas à payer à nouveau si le compte peut vraiment être récupéré. ${recoveryInfo.totalTransactions || 0} transactions récupérables trouvées d'une valeur de ${recoveryInfo.totalAmount || 0} XAF.`;
                
                return { 
                  requiresOtp: false, 
                  hasNegativeBalance: true, 
                  recoveryMessage 
                };
              }
            }
            
            // If no recoverable transactions found but balance is still negative, show generic message
            const genericMessage = `Votre compte a un solde négatif. Cela peut être dû à des transactions de vos filleuls qui n'ont pas encore été restaurées. Veuillez contacter le support si vous pensez qu'il s'agit d'une erreur.`;
            return { 
              requiresOtp: false, 
              hasNegativeBalance: true, 
              recoveryMessage: genericMessage 
            };
          } catch (recoveryError) {
            
            // Fallback message when recovery endpoints are not available
            const fallbackMessage = `Votre compte a un solde négatif. Si vous avez des filleuls qui ont effectué des paiements récemment, demandez-leur de s'inscrire avec le même email ou numéro de téléphone qu'ils ont utilisé précédemment pour restaurer leurs comptes.`;
            return { 
              requiresOtp: false, 
              hasNegativeBalance: true, 
              recoveryMessage: fallbackMessage 
            };
          }
        }
      } else if (data.token) {
        // If user data not returned but token exists, fetch it
        await refreshUser();
      }

      return { requiresOtp: false };
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: any): Promise<{ userId: string }> => {
    try {
      const response = await sbcApiService.registerUser(userData);
      const data = handleApiResponse(response);

      const userId = data.userId || data.id;

      // Store userId for OTP verification (as per documentation)
      sessionStorage.setItem('tempUserId', userId);

      return { userId };
    } catch (error) {
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call logout API
      await sbcApiService.logoutUser();
    } catch (error) {
      // Continue with local logout even if API call fails
    } finally {
      // Always clear local state
      removeToken();
      setUser(null);

      // Clear sessionStorage to reset modal display logic for next login
      sessionStorage.clear();
    }
  };

  const verifyOtp = useCallback(async (userId: string, otp: string): Promise<void> => {
    try {
      const response = await sbcApiService.verifyOtp(userId, otp);
      const data = handleApiResponse(response);

      // Store authentication data as per documentation
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('userId', data.user?.id || userId);
        localStorage.setItem('userEmail', data.user?.email || '');
        localStorage.setItem('userName', data.user?.name || `${data.user?.firstName || ''} ${data.user?.lastName || ''}`.trim());
        localStorage.setItem('balance', data.user?.balance?.toString() || '0');
        localStorage.setItem('usdBalance', data.user?.usdBalance?.toString() || '0');

        // Store user profile data
        if (data.user?.avatar) {
          localStorage.setItem('avatar', data.user.avatar);
        }
        if (data.user?.momoNumber) {
          localStorage.setItem('momo', data.user.momoNumber);
          localStorage.setItem('momoCorrespondent', data.user.momoOperator || '');
        }
      }

      if (data.user) {
        setUser(data.user);
      } else if (data.token) {
        await refreshUser();
      }

      // Clean up temporary data
      sessionStorage.removeItem('tempUserId');

      // Invalidate specific caches used by Home.tsx after user data is refreshed
      invalidateApiCache(['transaction-stats', 'referral-stats', 'current-subscription', 'formations']);
    } catch (error) {
      throw error;
    }
  }, [setUser]);

  const updateProfile = async (updates: Record<string, any>): Promise<void> => {
    try {
      const response = await sbcApiService.updateUserProfile(updates);
      const data = handleApiResponse(response);

      if (data.user) {
        setUser(data.user);
      } else {
        // Refresh user data to get updated info
        await refreshUser();
      }
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const response = await sbcApiService.getUserProfile();
      const userData = handleApiResponse(response);
      setUser(userData);
      // Invalidate specific caches used by Home.tsx after user data is refreshed
      invalidateApiCache(['transaction-stats', 'referral-stats', 'current-subscription', 'formations']);
    } catch (error: any) {
      // If unauthorized, log out and set session expired flag
      if (error?.status === 401 || (error?.message && error.message.toLowerCase().includes('unauthorized'))) {
        await logout();
        localStorage.setItem('sessionExpired', '1');
      }
      throw error;
    }
  }, [setUser, logout]);

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    verifyOtp,
    updateProfile,
    refreshUser,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
