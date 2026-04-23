import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { removeAccents } from '../utils/apiHelpers';
import {
  professionOptions,
  predefinedInterestOptions,
  getInterestBaseValue,
} from './ModifierLeProfil';
import ProtectedRoute from '../components/common/ProtectedRoute';

function CompleteProfile() {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();
  const [profession, setProfession] = useState('');
  const [langue, setLangue] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleInterestClick = (displayInterest: string) => {
    const baseInterest = getInterestBaseValue(displayInterest);
    setInterests(prev =>
      prev.includes(baseInterest)
        ? prev.filter(i => i !== baseInterest)
        : [...prev, baseInterest]
    );
  };

  const handleSkip = () => {
    localStorage.setItem('profileCompletionSkipped', 'true');
    navigate('/');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updates: Record<string, any> = {};
      if (profession) updates.profession = removeAccents(profession);
      if (langue) updates.language = langue;
      if (interests.length > 0) updates.interests = interests.map(i => removeAccents(i));

      await updateProfile(updates);
      localStorage.setItem('profileCompletionDone', 'true');
      navigate('/');
    } catch (err: any) {
      const errorMessage = err?.message || 'Erreur lors de la sauvegarde du profil.';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
        <motion.div
          className="w-full max-w-md bg-white rounded-3xl shadow-lg p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Complétez votre profil
          </h2>
          <p className="text-center text-gray-500 mb-6">
            Aidez-nous à mieux vous connaître pour personnaliser votre expérience
          </p>

          <div className="flex flex-col gap-4">
            {/* Profession */}
            <div>
              <label className="block text-gray-700 mb-1">💼 Profession</label>
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#115CF6]"
              >
                <option value="">Sélectionner la profession</option>
                {professionOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-gray-700 mb-1">🗣️ Langue préférée</label>
              <select
                value={langue}
                onChange={(e) => setLangue(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#115CF6]"
              >
                <option value="">Sélectionner la langue</option>
                <option value="fr">🇫🇷 Français</option>
                <option value="en">🇬🇧 Anglais</option>
              </select>
            </div>

            {/* Interests */}
            <div>
              <label className="block text-gray-700 mb-1">❤️ Centres d'intérêt</label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                {predefinedInterestOptions.map((displayInterest) => {
                  const baseInterest = getInterestBaseValue(displayInterest);
                  const isSelected = interests.includes(baseInterest);
                  return (
                    <button
                      key={displayInterest}
                      type="button"
                      className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-green-700 text-white border-green-700'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => handleInterestClick(displayInterest)}
                    >
                      {displayInterest}
                    </button>
                  );
                })}
              </div>
              {interests.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  {interests.length} centre{interests.length > 1 ? 's' : ''} d'intérêt sélectionné{interests.length > 1 ? 's' : ''}
                </div>
              )}
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSkip}
                className="flex-1 bg-gray-200 text-gray-700 font-bold rounded-xl py-3 hover:bg-gray-300 transition-colors"
              >
                Passer
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#115CF6] hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sauvegarde...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}

export default CompleteProfile;
