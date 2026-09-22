import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Catch-all for URLs no route matches.
 *
 * Without it, React Router renders nothing and the user sits on a blank white
 * screen with no way back — `/modifier-profil` (a typo for `/modifier-le-profil`)
 * stranded a lot of diffuseurs that way on 2026-09-22. A wrong link is a bug to
 * fix, but it should never trap anyone.
 */
function NotFound() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Page introuvable</h1>
      <p className="text-sm text-gray-600 mb-1">
        Cette page n'existe pas ou a été déplacée.
      </p>
      <p className="text-xs text-gray-400 mb-6 break-all">{pathname}</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => navigate('/')}
          className="w-full bg-primary text-white rounded-xl py-3 font-medium"
        >
          Retour à l'accueil
        </button>
        <button
          onClick={() => navigate(-1)}
          className="w-full border border-border rounded-xl py-3 font-medium text-gray-700"
        >
          Page précédente
        </button>
      </div>
    </div>
  );
}

export default NotFound;
