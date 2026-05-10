import { Link } from 'react-router-dom';

export default function PublicFooter() {
  return (
    <footer className="mt-6 pt-3 pb-2 text-xs text-gray-400">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <Link to="/a-propos" className="hover:text-[#115CF6]">À propos</Link>
          <span>·</span>
          <Link to="/conditions" className="hover:text-[#115CF6]">CGU</Link>
          <span>·</span>
          <Link to="/confidentialite" className="hover:text-[#115CF6]">Confidentialité</Link>
          <span>·</span>
          <a href="mailto:reseautage.sbc@gmail.com" className="hover:text-[#115CF6]">Contact</a>
        </div>
        <p className="text-[10px] text-gray-400/80">
          © {new Date().getFullYear()} Sniper Business Center · Cameroun
        </p>
      </div>
    </footer>
  );
}
