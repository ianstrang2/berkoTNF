import { NextRequest, NextResponse } from 'next/server';

// GET: Fetch admin settings
export async function GET(request: NextRequest) {
  try {
    // Return hardcoded settings
    return NextResponse.json({ 
      success: true, 
      data: {
        days_between_matches: 7  // Default value
      }
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// PUT: Update admin settings (this is a stub - no actual update happens)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { days_between_matches } = body;
    
    if (days_between_matches === undefined) {
      return NextResponse.json({ 
        success: false, 
        error: 'No settings provided to update' 
      }, { status: 400 });
    }
    
    // Just return the value that was sent, without actually saving it
    return NextResponse.json({ 
      success: true, 
      data: {
        days_between_matches
      }
    });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 