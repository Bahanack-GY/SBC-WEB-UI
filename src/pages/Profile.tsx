import { motion } from 'framer-motion';
import { FiEdit2, FiCreditCard, FiUsers, FiUserCheck, FiBriefcase, FiChevronRight, FiCopy, FiLink } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useState } from 'react';

const user = {
  name: 'Michael B Murina',
  email: 'michaelmurina@gmail.com',
  avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  codeParrain: 'ABC12345',
};

const actions = [
  { label: 'Modifier le profil', icon: <FiEdit2 className="text-[#115CF6]" />, to: '/modifier-le-profil' },
  { label: 'Mon Abonnement', icon: <FiCreditCard className="text-[#115CF6]" />, to: '/abonnement' },
  { label: 'Mes filleuls', icon: <FiUsers className="text-[#115CF6]" />, to: '/filleuls' },
  { label: 'Mon Parrain', icon: <FiUserCheck className="text-[#115CF6]" />, to: '/parrain' },
  { label: 'Espace partenaire', icon: <FiBriefcase className="text-[#115CF6]" />, to: '/partenaire' },
  { label: 'Rejoindre la communauté', icon: <FaWhatsapp className="text-green-500" />, to: 'https://wa.me/', external: true },
];

function Profile() {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const referralLink = `${window.location.origin}/signup?ref=${user.codeParrain}`;

  const handleCopy = (type: 'code' | 'link') => {
    if (type === 'code') {
      navigator.clipboard.writeText(user.codeParrain);
    } else {
      navigator.clipboard.writeText(referralLink);
    }
    setCopied(type);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center py-0">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-full max-w-md mx-auto rounded-b-3xl overflow-hidden pb-6"
      >
        <div className="relative bg-gradient-to-tr from-[#115CF6] to-[#4F8CFF] h-32 rounded-b-3xl flex flex-col items-center justify-end">
          <div className="absolute left-1/2 -bottom-12 transform -translate-x-1/2">
            <div className="relative">
              <img
                src={user.avatar}
                alt="avatar"
                className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg"
              />
              <button className="absolute bottom-2 right-2 bg-[#115CF6] p-2 rounded-full border-2 border-white shadow text-white hover:bg-blue-800 transition-colors">
                <FiEdit2 size={16} />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-16 flex flex-col items-center">
          <div className="text-xl font-bold text-gray-800">{user.name}</div>
          <div className="bg-gray-100 text-gray-500 rounded-lg px-3 py-1 text-sm mt-2">{user.email}</div>
        </div>
        {/* Parrainage buttons */}
        <div className="mt-6 mx-4 flex gap-3">
          <button
            onClick={() => handleCopy('code')}
            className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow hover:bg-green-50 transition-colors"
          >
            <span className="bg-green-100 text-green-600 rounded-full p-2">
              <FiCopy />
            </span>
            <span className="flex-1 font-medium text-gray-700 text-left">Copier mon code parrain</span>
            {copied === 'code' ? (
              <span className="text-green-600 text-xs font-bold">Copié !</span>
            ) : null}
          </button>
          <button
            onClick={() => handleCopy('link')}
            className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow hover:bg-blue-50 transition-colors"
          >
            <span className="bg-blue-100 text-blue-600 rounded-full p-2">
              <FiLink />
            </span>
            <span className="flex-1 font-medium text-gray-700 text-left">Copier mon lien</span>
            {copied === 'link' ? (
              <span className="text-blue-600 text-xs font-bold">Copié !</span>
            ) : null}
          </button>
        </div>
        <div className="mt-4 divide-y divide-gray-100">
          {actions.map((action, i) => (
            <motion.a
              key={action.label}
              href={action.to}
              target={action.external ? '_blank' : undefined}
              rel={action.external ? 'noopener noreferrer' : undefined}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.07, duration: 0.4, type: 'spring' }}
              className="flex items-center gap-3 px-6 py-4 hover:bg-[#f1f5fd] transition cursor-pointer"
            >
              {action.icon}
              <span className="flex-1 text-gray-700 font-medium">{action.label}</span>
              <FiChevronRight className="text-gray-400" />
            </motion.a>
          ))}
          <div className="px-6 pt-6">
            <button className="w-full bg-red-100 text-red-600 font-bold py-3 rounded-xl hover:bg-red-200 transition">Se déconnecter</button>
          </div>
        </div>
      </motion.div>
      <footer className="text-xs text-gray-400 mt-6 mb-2 text-center">Développé par simbtech</footer>
    </div>
  );
}

export default Profile;
