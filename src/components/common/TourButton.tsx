import { HugeiconsIcon } from '@hugeicons/react';
import { HelpCircleIcon } from '@hugeicons/core-free-icons';
import React from 'react';
import { useTour } from './TourProvider';

const TourButton: React.FC = () => {
  const { startTour } = useTour();

  return (
    <button
      onClick={startTour}
      className="tour-button fixed bottom-20 right-4 bg-primary text-white p-3 rounded-full hover:bg-blue-700 transition-colors z-50"
      title="Démarrer le guide"
    >
      <HugeiconsIcon icon={HelpCircleIcon} size={24} />
    </button>
  );
};

export default TourButton; 