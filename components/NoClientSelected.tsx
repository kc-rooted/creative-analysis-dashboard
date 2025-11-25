'use client';

import { useRouter } from 'next/navigation';

export function NoClientSelected() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 opacity-50">
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
        <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          No Client Selected
        </h2>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          Please select a client from the admin panel to view data.
        </p>
        <button
          onClick={() => router.push('/admin')}
          className="btn-primary px-6 py-2 rounded-lg font-medium"
        >
          Go to Admin Panel
        </button>
      </div>
    </div>
  );
}
