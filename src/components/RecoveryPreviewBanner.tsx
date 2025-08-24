import React from 'react';
import { motion } from 'framer-motion';

interface RecoveryPreviewBannerProps {
  isVisible: boolean;
  recoveryData: {
    notification: {
      title: string;
      message: string;
      details: string[];
    };
  };
}

const RecoveryPreviewBanner: React.FC<RecoveryPreviewBannerProps> = ({ 
  isVisible, 
  recoveryData 
}) => {
  if (!isVisible) return null;

  return (
    <motion.div
      className="recovery-preview-banner mb-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', bounce: 0.2 }}
    >
      <div className="flex items-start bg-gradient-to-r from-green-500 to-green-600 text-white p-5 rounded-xl shadow-lg">
        <div className="banner-icon text-3xl mr-4 flex-shrink-0">
          🎉
        </div>
        <div className="banner-content flex-1">
          <h3 className="font-bold text-lg mb-2">
            {recoveryData.notification.title}
          </h3>
          <p className="text-green-50 mb-3 opacity-95">
            {recoveryData.notification.message}
          </p>
          <ul className="recovery-details space-y-1">
            {recoveryData.notification.details.map((detail: string, index: number) => (
              <li key={index} className="flex items-start text-sm text-green-50">
                <span className="mr-2 text-white font-bold">✓</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

export default RecoveryPreviewBanner;