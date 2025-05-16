import { useState, useEffect } from 'react';
import BackButton from '../components/common/BackButton';
import { FaWhatsapp, FaFilter } from 'react-icons/fa';
import Skeleton from '../components/common/Skeleton';

const filleulsData = [
  // Direct
  {
    id: 1,
    name: 'Nicholas Gordon',
    phone: '+22990001111',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    abonne: true,
    type: 'direct',
  },
  {
    id: 2,
    name: 'Bradley Malone',
    phone: '+22990002222',
    avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    abonne: true,
    type: 'direct',
  },
  {
    id: 3,
    name: 'Janie Todd',
    phone: '+22990003333',
    avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
    abonne: false,
    type: 'direct',
  },
  // Indirect
  {
    id: 4,
    name: 'Marvin Lambert',
    phone: '+22990004444',
    avatar: 'https://randomuser.me/api/portraits/men/4.jpg',
    abonne: false,
    type: 'indirect',
  },
  {
    id: 5,
    name: 'Teresa Lloyd',
    phone: '+22990005555',
    avatar: 'https://randomuser.me/api/portraits/women/5.jpg',
    abonne: true,
    type: 'indirect',
  },
  {
    id: 6,
    name: 'Fred Haynes',
    phone: '+22990006666',
    avatar: 'https://randomuser.me/api/portraits/men/6.jpg',
    abonne: false,
    type: 'indirect',
  },
  {
    id: 7,
    name: 'Rose Peters',
    phone: '+22990007777',
    avatar: 'https://randomuser.me/api/portraits/women/7.jpg',
    abonne: true,
    type: 'indirect',
  },
  {
    id: 8,
    name: 'Jose Stone',
    phone: '+22990008888',
    avatar: 'https://randomuser.me/api/portraits/men/8.jpg',
    abonne: false,
    type: 'indirect',
  },
];

function MesFilleuls() {
  const [selectedTab, setSelectedTab] = useState<'direct' | 'indirect'>('direct');
  const [filter, setFilter] = useState<'all' | 'abonne' | 'nonabonne'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  let filtered = filleulsData.filter(f => f.type === selectedTab);
  if (filter === 'abonne') filtered = filtered.filter(f => f.abonne);
  if (filter === 'nonabonne') filtered = filtered.filter(f => !f.abonne);

  const directCount = filleulsData.filter(f => f.type === 'direct').length;
  const indirectCount = filleulsData.filter(f => f.type === 'indirect').length;

  return (
    <div className="p-3 min-h-screen bg-white">
         <div className="flex items-center mb-3">
        <BackButton />
        <h3 className="text-xl font-medium text-center w-full">Mes filleuls</h3>
      </div>
      {/* Card for nombre de filleuls */}
      <div className="bg-white rounded-2xl shadow flex flex-col md:flex-row items-center justify-between px-6 py-4 mb-4 border border-gray-100">
        <div className="font-semibold text-gray-700 text-base mb-2 md:mb-0">Nombre de filleuls</div>
        <div className="flex gap-4 text-sm font-bold">
          <span className="text-green-700">Direct: <span className="text-gray-900">{directCount}</span></span>
          <span className="text-green-700">Indirect: <span className="text-gray-900">{indirectCount}</span></span>
        </div>
      </div>
     
      <div className="flex items-center gap-2 mb-4">
        <button
          className={`px-5 py-1 rounded-full border text-sm font-semibold transition-colors duration-150 ${selectedTab === 'direct' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
          onClick={() => setSelectedTab('direct')}
        >
          Direct
        </button>
        <button
          className={`px-5 py-1 rounded-full border text-sm font-semibold transition-colors duration-150 ${selectedTab === 'indirect' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
          onClick={() => setSelectedTab('indirect')}
        >
          Indirect
        </button>
        <div className="flex-1" />
        <button
          className="flex items-center gap-2 border border-gray-300 rounded-full px-3 py-1 text-gray-700 hover:bg-gray-100 transition ml-auto"
          onClick={() => setModalOpen(true)}
        >
          <FaFilter className="text-green-700" />
          <span className="text-sm font-medium">Filtrer</span>
        </button>
      </div>
      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-80 flex flex-col gap-4">
            <div className="font-bold text-lg mb-2 text-center">Filtrer les filleuls</div>
            <button
              className={`w-full py-2 rounded-xl font-medium border ${filter === 'abonne' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
              onClick={() => { setFilter('abonne'); setModalOpen(false); }}
            >
              Abonnés
            </button>
            <button
              className={`w-full py-2 rounded-xl font-medium border ${filter === 'nonabonne' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
              onClick={() => { setFilter('nonabonne'); setModalOpen(false); }}
            >
              Non abonnés
            </button>
            <button
              className={`w-full py-2 rounded-xl font-medium border ${filter === 'all' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
              onClick={() => { setFilter('all'); setModalOpen(false); }}
            >
              Tous
            </button>
            <button
              className="w-full py-2 rounded-xl font-medium border border-gray-300 text-gray-500 mt-2 hover:bg-gray-100"
              onClick={() => setModalOpen(false)}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton width="w-10" height="h-10" rounded="rounded-full" />
              <div className="flex-1">
                <Skeleton width="w-32" height="h-4" rounded="rounded" />
                <Skeleton width="w-24" height="h-3" rounded="rounded" />
              </div>
              <Skeleton width="w-8" height="h-8" rounded="rounded-full" />
            </div>
          ))}
        </div>
      ) : (
      <div className="bg-white rounded-xl shadow p-2 divide-y">
        {filtered.map(user => (
          <div key={user.id} className="flex items-center py-2 gap-3">
            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1">
              <div className="font-medium text-gray-900 text-sm">{user.name}</div>
              <div className="text-xs text-gray-500">{user.phone}</div>
            </div>
            <a
              href={`https://wa.me/${user.phone.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-500 hover:text-green-600"
              title="Contacter sur WhatsApp"
            >
              <FaWhatsapp size={22} />
            </a>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-8">Aucun filleul dans cette catégorie.</div>
        )}
      </div>
      )}
    </div>
  );
}

export default MesFilleuls; 