import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Influencer } from '@/app/influencer/page';

// Simple file-based storage for now
const DATA_FILE = path.join(process.cwd(), 'data', 'influencers.json');

// Ensure data directory exists
const ensureDataDir = () => {
  const dataDir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Read influencers from file
const readInfluencers = (): Influencer[] => {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

// Write influencers to file
const writeInfluencers = (influencers: Influencer[]) => {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(influencers, null, 2));
};

// GET all influencers
export async function GET() {
  try {
    const influencers = readInfluencers();
    return NextResponse.json(influencers);
  } catch (error) {
    console.error('Error fetching influencers:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST new influencer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const influencers = readInfluencers();
    
    const newInfluencer: Influencer = {
      ...body,
      id: `inf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      total_campaigns: body.total_campaigns || 0,
      average_performance: body.average_performance || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    influencers.push(newInfluencer);
    writeInfluencers(influencers);
    
    return NextResponse.json(newInfluencer);
  } catch (error) {
    console.error('Error creating influencer:', error);
    return NextResponse.json({ error: 'Failed to create influencer' }, { status: 500 });
  }
}

// PUT update influencer
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const influencers = readInfluencers();
    
    const index = influencers.findIndex(i => i.id === body.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }
    
    influencers[index] = {
      ...influencers[index],
      ...body,
      updated_at: new Date().toISOString()
    };
    
    writeInfluencers(influencers);
    
    return NextResponse.json(influencers[index]);
  } catch (error) {
    console.error('Error updating influencer:', error);
    return NextResponse.json({ error: 'Failed to update influencer' }, { status: 500 });
  }
}

// DELETE influencer
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }
    
    const influencers = readInfluencers();
    const filtered = influencers.filter(i => i.id !== id);
    
    if (filtered.length === influencers.length) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }
    
    writeInfluencers(filtered);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting influencer:', error);
    return NextResponse.json({ error: 'Failed to delete influencer' }, { status: 500 });
  }
}