import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import type { CallBackProps } from 'react-joyride';
import { useLocation } from 'react-router-dom';
import {
  homeTour,
  walletTour,
  marketplaceTour,
  profileTour,
  partnerSpaceTour,
  contactsTour,
  adsPackTour,
  subscriptionTour,
  productManagementTour
} from '../../config/tours';

interface TourContextType {
  startTour: () => void;
  endTour: () => void;
  hasSeenTour: boolean;
}

const TourContext = createContext<TourContextType>({
  startTour: () => {},
  endTour: () => {},
  hasSeenTour: false,
});

export const useTour = () => useContext(TourContext);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [run, setRun] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(() => {
    return localStorage.getItem('hasSeenTour') === 'true';
  });
  const location = useLocation();

  useEffect(() => {
    // Start tour automatically if user hasn't seen it
    if (!hasSeenTour && getTourSteps().length > 0) {
      setRun(true);
    }
  }, [location.pathname, hasSeenTour]);

  const getTourSteps = useCallback(() => {
    switch (location.pathname) {
      case '/':
        return homeTour;
      case '/wallet':
        return walletTour;
      case '/marketplace':
        return marketplaceTour;
      case '/profile':
        return profileTour;
      case '/partenaire':
        return partnerSpaceTour;
      case '/contacts':
        return contactsTour;
      case '/ads-pack':
        return adsPackTour;
      case '/abonnement':
      case '/changer-abonnement':
        return subscriptionTour;
      case '/mes-produits':
        return productManagementTour;
      default:
        return [];
    }
  }, [location.pathname]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      if (status === STATUS.FINISHED) {
        setHasSeenTour(true);
        localStorage.setItem('hasSeenTour', 'true');
      }
    }
  };

  const startTour = useCallback(() => {
    setRun(true);
  }, []);

  const endTour = useCallback(() => {
    setRun(false);
  }, []);

  return (
    <TourContext.Provider value={{ startTour, endTour, hasSeenTour }}>
      {children}
      <Joyride
        steps={getTourSteps()}
        run={run}
        continuous
        showProgress
        showSkipButton
        styles={{
          options: {
            primaryColor: '#115CF6',
            zIndex: 1000,
          },
          tooltip: {
            fontSize: '14px',
            padding: '15px',
          },
          buttonNext: {
            backgroundColor: '#115CF6',
            padding: '8px 16px',
            borderRadius: '8px',
          },
          buttonBack: {
            marginRight: '10px',
            color: '#115CF6',
          },
        }}
        locale={{
          last: 'Terminer',
          skip: 'Passer',
          next: 'Suivant',
          back: 'Précédent',
        }}
        callback={handleJoyrideCallback}
      />
    </TourContext.Provider>
  );
}; 