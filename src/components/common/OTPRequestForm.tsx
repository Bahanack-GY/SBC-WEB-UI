import { useState } from 'react';
import { FiLoader } from 'react-icons/fi';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';

interface OTPRequestFormProps {
  purpose: string;
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
  buttonText?: string;
  showChannelOverride?: boolean;
  defaultIdentifier?: string;
}

function OTPRequestForm({ 
  purpose, 
  onSuccess, 
  onError, 
  buttonText = 'Envoyer le code',
  showChannelOverride = true,
  defaultIdentifier = ''
}: OTPRequestFormProps) {
  const [identifier, setIdentifier] = useState(defaultIdentifier);
  const [channelOverride, setChannelOverride] = useState('');
  const [showChannelOptions, setShowChannelOptions] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identifier.trim()) {
      onError('Veuillez entrer votre email ou numéro de téléphone.');
      return;
    }

    setLoading(true);

    try {
      const options: any = {
        identifier,
        purpose
      };

      if (channelOverride) {
        options.channel = channelOverride;
      }

      const response = await sbcApiService.resendOtpEnhanced(options);
      handleApiResponse(response);
      
      const channelText = channelOverride || 'votre méthode préférée';
      onSuccess(`Code OTP envoyé via ${channelText}!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'envoi du code OTP';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-gray-700 text-sm mb-1 font-medium">
          Email ou numéro de téléphone
        </label>
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Ex: jeanpierre@gmail.com ou +237675090755"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 placeholder-gray-400"
          required
        />
      </div>

      {/* Optional: Channel override */}
      {showChannelOverride && (
        <div className="channel-options">
          <button 
            type="button"
            onClick={() => setShowChannelOptions(!showChannelOptions)}
            className="text-blue-500 text-sm font-medium hover:underline bg-transparent"
          >
            ⚙️ Options avancées
          </button>
          
          {showChannelOptions && (
            <div className="mt-2 p-3 bg-gray-50 rounded-xl">
              <label className="block text-gray-700 text-sm mb-1 font-medium">
                Forcer la méthode de livraison pour cette demande:
              </label>
              <select 
                value={channelOverride} 
                onChange={(e) => setChannelOverride(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-sm"
              >
                <option value="">Utiliser ma préférence</option>
                <option value="email">📧 Email</option>
                <option value="whatsapp">📱 WhatsApp</option>
              </select>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 rounded-xl text-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        disabled={loading}
      >
        {loading ? <FiLoader className="animate-spin" /> : null}
        {loading ? 'Envoi en cours...' : buttonText}
      </button>
    </form>
  );
}

export default OTPRequestForm;