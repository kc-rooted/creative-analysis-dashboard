'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from './Navigation';

export function ConditionalNavigation() {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');
  
  if (isAuthPage) {
    return null;
  }
  
  return <Navigation />;
}