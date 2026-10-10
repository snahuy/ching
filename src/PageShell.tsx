import type { ReactNode } from 'react';
/** Shared, in-flow krama borders: scrolling content can never cover a strip. */
export function PageShell({children,className=''}:{children:ReactNode;className?:string}){
 return <div className={`page-shell ${className}`}><div className="page-krama" aria-hidden="true"/><div className="page-shell-content">{children}</div><div className="page-krama" aria-hidden="true"/></div>;
}
