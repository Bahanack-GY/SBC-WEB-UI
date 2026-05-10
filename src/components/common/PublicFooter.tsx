import { Link } from 'react-router-dom';

export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-200/70 mt-8 pt-6 pb-8 text-sm text-gray-600">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link to="/a-propos" className="hover:text-[#115CF6] hover:underline">À propos</Link>
          <span className="text-gray-300">·</span>
          <Link to="/conditions" className="hover:text-[#115CF6] hover:underline">CGU</Link>
          <span className="text-gray-300">·</span>
          <Link to="/confidentialite" className="hover:text-[#115CF6] hover:underline">Confidentialité</Link>
          <span className="text-gray-300">·</span>
          <a href="mailto:reseautage.sbc@gmail.com" className="hover:text-[#115CF6] hover:underline">Contact</a>
        </div>
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} Sniper Business Center · Yaoundé / Douala, Cameroun
        </p>
      </div>
    </footer>
  );
}
