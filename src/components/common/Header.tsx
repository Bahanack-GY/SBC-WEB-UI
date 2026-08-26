import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon, User02Icon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { useState } from "react";
import logo from "../../assets/img/logo-sbc.png";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

function Header() {
  const navigate = useNavigate();
  const [showAppModal, setShowAppModal] = useState(false);

  return (
    <>
      <header>
        <div className="flex justify-between items-center px-3 py-1  bg-white">
          <img src={logo} alt="logo" className="w-32 " />
          <div className="flex gap-3 items-center">
            <button onClick={() => setShowAppModal(true)}><HugeiconsIcon icon={Download01Icon} size={22} /></button>
            <button onClick={() => navigate("/wallet")}><HugeiconsIcon icon={Wallet01Icon} size={22} /></button>
            <button onClick={() => navigate("/profile")}><HugeiconsIcon icon={User02Icon} size={22} /></button>
          </div>
        </div>
      </header>

      {/* Mobile App Coming Soon Modal */}
      <AnimatePresence>
        {showAppModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAppModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full border border-border"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="text-5xl mb-4">📱</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Application Mobile</h3>
                <p className="text-gray-600 mb-6">L'application mobile sera disponible prochainement</p>
                <button
                  onClick={() => setShowAppModal(false)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Header;
