import { NextResponse } from 'next/server';
import { clearClientCache } from '@/lib/client-config';

export async function POST() {
  try {
    clearClientCache();
    return NextResponse.json({ success: true, message: 'Cache cleared' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
