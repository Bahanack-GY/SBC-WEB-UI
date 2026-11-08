import { useEffect, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import logo from '../../assets/img/logo-sbc.png';
import PublicFooter from './PublicFooter';
import { useAuth } from '../../contexts/AuthContext';
import { pageFade, headerDrop, sectionRise } from '../../utils/motion';

/**
 * Frame shared by the public legal texts (privacy policy, legal notice): the
 * same look as the terms page, plus what a member arriving from the app needs:
 * the back arrow returns where they came from, and a link to a section
 * (#cookies) scrolls to it.
 */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const cameFromApp = location.key !== 'default';

  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  const back = 'h-9 w-9 flex items-center justify-center rounded-full bg-white/80 text-gray-700 hover:bg-white border border-border';

  return (
    <motion.div variants={pageFade} initial="hidden" animate="show" className="bg-bg min-h-screen w-full">
      <div className="max-w-3xl mx-auto px-5 py-6">
        <motion.header variants={headerDrop} className="flex items-center justify-between mb-6">
          {cameFromApp ? (
            <button type="button" onClick={() => navigate(-1)} aria-label="Retour" className={back}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
            </button>
          ) : (
            <Link to="/a-propos" aria-label="Retour" className={back}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
            </Link>
          )}
          <img src={logo} alt="SBC" className="h-9 w-9 object-contain" />
          {isAuthenticated ? (
            <Link to="/mes-donnees" className="text-sm font-semibold text-primary hover:underline">Mes données</Link>
          ) : (
            <Link to="/connexion" className="text-sm font-semibold text-primary hover:underline">Se connecter</Link>
          )}
        </motion.header>

        <motion.article
          variants={sectionRise}
          className="bg-white/80 backdrop-blur rounded-2xl p-6 md:p-8 max-w-none border border-border text-[15px] leading-relaxed text-gray-700 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_h2]:scroll-mt-6 [&_a]:text-primary [&_a:hover]:underline [&_strong]:text-gray-900"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-sm text-gray-500 mb-6">Sniper Business Center — {updated}</p>
          {children}
        </motion.article>

        <PublicFooter />
      </div>
    </motion.div>
  );
}

/** A numbered section title, with an anchor id when other pages link to it. */
export function LegalHeading({ id, children }: { id?: string; children: ReactNode }) {
  return <h2 id={id} className="text-xl font-bold text-gray-900 mt-6 mb-2">{children}</h2>;
}
