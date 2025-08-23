'use client';

import { usePathname, useRouter } from 'next/navigation';
import { MessageSquare, LayoutGrid, Settings } from 'lucide-react';

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  
  const isCreative = pathname === '/' || pathname.startsWith('/creative');
  const isConversation = pathname.startsWith('/conversation');
  const isAdmin = pathname.startsWith('/admin');

  return (
    <header className="w-full border-b" style={{background: 'var(--bg-card)', borderColor: 'var(--border-muted)'}}>
      <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="w-20 h-20 flex-shrink-0 cursor-pointer" onClick={() => router.push('/')}>
            <svg viewBox="0 0 1000 1000" className="w-full h-full">
              <defs>
                <style>
                  {`.logo-bg { fill: transparent; } .logo-text { fill: var(--text-primary); } .logo-accent { fill: var(--accent-primary); }`}
                </style>
              </defs>
              <rect className="logo-bg" width="1000" height="1000"></rect>
              <g>
                <g>
                  <path className="logo-text" d="M744.02,725.16h-77.12l-42.19-97.08-94.02-220.6-65.13,150.13-72.31,167.55h-75.99l194.08-449.7h39.22l193.47,449.7Z"></path>
                  <path className="logo-text" d="M864.04,725.16h-70.56v-450.31h70.56v450.31Z"></path>
                </g>
                <path className="logo-accent" d="M252.65,316.43l-23.46-41.49c-62.15,107.41-93.23,177.62-93.23,210.45v26c0,32.92,31.78,103.82,95.07,212.81,61.28-107.41,92.01-177.18,91.92-209.22v-29.85c0-14.71-7.88-39.57-23.46-74.67-15.58-35.02-31.25-66.36-46.83-94.02h0ZM267.19,535.8c-10.33,10.42-22.94,15.58-37.64,15.67-14.71,0-27.31-5.16-37.64-15.49-10.42-10.33-15.58-22.94-15.67-37.64,0-14.71,5.16-27.31,15.49-37.64,10.33-10.42,22.94-15.58,37.64-15.67,14.71,0,27.31,5.16,37.64,15.49,10.42,10.33,15.58,22.94,15.67,37.64.09,14.71-5.08,27.31-15.49,37.64h0Z"></path>
              </g>
            </svg>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/conversation')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                isConversation ? 'btn-primary' : ''
              }`}
              style={!isConversation ? {
                background: 'var(--bg-elevated)', 
                border: '1px solid var(--border-muted)', 
                color: 'var(--text-secondary)'
              } : {}}
              onMouseEnter={(e) => !isConversation && (e.currentTarget.style.background = 'var(--bg-card)')}
              onMouseLeave={(e) => !isConversation && (e.currentTarget.style.background = 'var(--bg-elevated)')}
            >
              <MessageSquare className="w-4 h-4" />
              CONVERSATION
            </button>
            
            <button
              onClick={() => router.push('/')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                isCreative ? 'btn-primary' : ''
              }`}
              style={!isCreative ? {
                background: 'var(--bg-elevated)', 
                border: '1px solid var(--border-muted)', 
                color: 'var(--text-secondary)'
              } : {}}
              onMouseEnter={(e) => !isCreative && (e.currentTarget.style.background = 'var(--bg-card)')}
              onMouseLeave={(e) => !isCreative && (e.currentTarget.style.background = 'var(--bg-elevated)')}
            >
              <LayoutGrid className="w-4 h-4" />
              CREATIVE
            </button>

            <div className="w-px h-8 mx-2" style={{background: 'var(--border-muted)'}}></div>
            
            <button
              onClick={() => router.push('/admin')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isAdmin ? 'btn-primary' : ''
              }`}
              style={!isAdmin ? {
                background: 'var(--bg-elevated)', 
                border: '1px solid var(--border-muted)', 
                color: 'var(--text-secondary)'
              } : {}}
              onMouseEnter={(e) => !isAdmin && (e.currentTarget.style.background = 'var(--bg-card)')}
              onMouseLeave={(e) => !isAdmin && (e.currentTarget.style.background = 'var(--bg-elevated)')}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}