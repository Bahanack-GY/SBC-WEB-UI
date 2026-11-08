import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TERMS_PAGE, useTermsUrl } from '../../hooks/useTermsUrl';

/**
 * A link to the CGU: the official PDF when one is uploaded (always in a new
 * tab), otherwise the /conditions page — in a new tab too when `newTab`, so a
 * sign-up in progress stays where it is.
 */
export default function TermsLink({ children, className, newTab }: { children: ReactNode; className?: string; newTab?: boolean }) {
    const url = useTermsUrl();
    if (url === TERMS_PAGE && !newTab) return <Link to={TERMS_PAGE} className={className}>{children}</Link>;
    return <a href={url} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
}
