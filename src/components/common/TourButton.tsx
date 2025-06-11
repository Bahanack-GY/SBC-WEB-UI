import React from 'react';
import { FiHelpCircle } from 'react-icons/fi';
import { useTour } from './TourProvider';

const TourButton: React.FC = () => {
  const { startTour } = useTour();

  return (
    <button
      onClick={startTour}
      className="fixed bottom-20 right-4 bg-[#115CF6] text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
      title="Démarrer le guide"
    >
      <FiHelpCircle size={24} />
    </button>
  );
};

export default TourButton; 