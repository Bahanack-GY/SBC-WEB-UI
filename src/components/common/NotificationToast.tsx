import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, Cancel01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationToastProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  autoClose?: boolean;
  duration?: number;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  autoClose = true,
  duration = 4000,
}) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <HugeiconsIcon icon={Tick02Icon} size={20} />;
      case 'error':
        return <HugeiconsIcon icon={Cancel01Icon} size={20} />;
      case 'info':
        return <HugeiconsIcon icon={AlertCircleIcon} size={20} />;
      default:
        return <HugeiconsIcon icon={Tick02Icon} size={20} />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-500',
          border: 'border-success',
          text: 'text-white',
          icon: 'text-white'
        };
      case 'error':
        return {
          bg: 'bg-red-500',
          border: 'border-danger',
          text: 'text-white',
          icon: 'text-white'
        };
      case 'info':
        return {
          bg: 'bg-blue-500',
          border: 'border-primary',
          text: 'text-white',
          icon: 'text-white'
        };
      default:
        return {
          bg: 'bg-green-500',
          border: 'border-success',
          text: 'text-white',
          icon: 'text-white'
        };
    }
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed top-4 right-4 z-[9999] max-w-sm w-full"
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
        >
          <div className={`${colors.bg} ${colors.border} border rounded-lg p-4`}>
            <div className="flex items-start">
              <div className={`${colors.icon} mr-3 mt-0.5`}>
                {getIcon()}
              </div>
              <div className="flex-1">
                <h4 className={`${colors.text} font-semibold text-sm`}>
                  {title}
                </h4>
                <p className={`${colors.text} text-xs mt-1 opacity-90`}>
                  {message}
                </p>
              </div>
              <button
                onClick={onClose}
                className={`${colors.text} opacity-70 hover:opacity-100 ml-2`}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationToast;