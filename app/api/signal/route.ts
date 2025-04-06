import { NextRequest, NextResponse } from 'next/server';

// Enable debugging
const DEBUG = true;

// In-memory store for signaling messages
// In a production app, use Redis or another shared storage
const MESSAGE_STORE: { [key: string]: any[] } = {};

// Cleanup old messages periodically
const MESSAGE_TTL = 10 * 60 * 1000; // 10 minutes (extended from 5)
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  Object.keys(MESSAGE_STORE).forEach(key => {
    const oldCount = MESSAGE_STORE[key].length;
    
    // Filter out messages older than TTL
    MESSAGE_STORE[key] = MESSAGE_STORE[key].filter(
      msg => now - msg.timestamp < MESSAGE_TTL
    );
    
    const newCount = MESSAGE_STORE[key].length;
    if (oldCount !== newCount && DEBUG) {
      console.log(`Cleaned up ${oldCount - newCount} old messages for ${key}`);
    }
    
    // Remove empty channels
    if (MESSAGE_STORE[key].length === 0) {
      if (DEBUG) console.log(`Removing empty channel: ${key}`);
      delete MESSAGE_STORE[key];
    }
  });
}, 60 * 1000); // Run cleanup every minute

// Generate a channel key from shortCode
function getChannelKey(shortCode: string): string {
  return `signal:${shortCode.toUpperCase()}`;
}

// Handle POST requests (sending signals)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.shortCode || !body.sessionId || !body.type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const { shortCode, sessionId, type, data, timestamp } = body;
    const channelKey = getChannelKey(shortCode);
    
    // Initialize channel if it doesn't exist
    if (!MESSAGE_STORE[channelKey]) {
      MESSAGE_STORE[channelKey] = [];
    }
    
    // Add message to store
    const message = {
      type,
      sessionId,
      data,
      timestamp: timestamp || Date.now()
    };
    
    MESSAGE_STORE[channelKey].push(message);
    
    if (DEBUG) {
      console.log(`Signal stored: ${type} for ${shortCode} from ${sessionId}`);
      console.log(`Channel ${channelKey} now has ${MESSAGE_STORE[channelKey].length} messages`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in signal API POST:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Handle GET requests (receiving signals)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shortCode = searchParams.get('shortCode');
    const sessionId = searchParams.get('sessionId');
    const since = parseInt(searchParams.get('since') || '0');
    
    if (!shortCode || !sessionId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    const channelKey = getChannelKey(shortCode);
    
    // Return empty array if channel doesn't exist
    if (!MESSAGE_STORE[channelKey]) {
      if (DEBUG) console.log(`No channel exists for ${shortCode}`);
      return NextResponse.json([]);
    }
    
    // Get messages for this session, newer than since timestamp
    const messages = MESSAGE_STORE[channelKey].filter(msg => 
      msg.sessionId !== sessionId && // Don't return own messages
      msg.timestamp > since
    );
    
    if (DEBUG && messages.length > 0) {
      console.log(`Returning ${messages.length} messages for ${shortCode} to ${sessionId}`);
    }
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error in signal API GET:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 