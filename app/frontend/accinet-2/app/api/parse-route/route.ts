import { NextResponse } from 'next/server';
import { parseRouteQuery, enhanceLocationName } from '@/app/lib/gemini';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, userContext } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      );
    }

    console.log('[API /parse-route] Parsing natural language query:', query);

    // Step 1: Parse the query to extract origin and destination
    const parsedRoute = await parseRouteQuery(query);

    console.log('[API /parse-route] Parsed route:', parsedRoute);

    // Step 2: Enhance location names with context
    let enhancedOrigin = parsedRoute.origin;
    let enhancedDestination = parsedRoute.destination;

    if (enhancedDestination) {
      enhancedDestination = await enhanceLocationName(
        enhancedDestination,
        userContext
      );
      console.log('[API /parse-route] Enhanced destination:', enhancedDestination);
    }

    if (enhancedOrigin) {
      enhancedOrigin = await enhanceLocationName(enhancedOrigin, userContext);
      console.log('[API /parse-route] Enhanced origin:', enhancedOrigin);
    }

    // Step 3: Return the parsed and enhanced route data
    const result = {
      origin: enhancedOrigin,
      destination: enhancedDestination,
      confidence: parsedRoute.confidence,
      raw_query: query,
      success: true,
    };

    console.log('[API /parse-route] Returning result:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /parse-route] Error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to parse route query';

    return NextResponse.json(
      {
        error: errorMessage,
        success: false,
      },
      { status: 500 }
    );
  }
}

// Also support GET for simple queries
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      );
    }

    console.log('[API /parse-route] GET - Parsing query:', query);

    const parsedRoute = await parseRouteQuery(query);

    let enhancedOrigin = parsedRoute.origin;
    let enhancedDestination = parsedRoute.destination;

    if (enhancedDestination) {
      enhancedDestination = await enhanceLocationName(enhancedDestination);
    }

    if (enhancedOrigin) {
      enhancedOrigin = await enhanceLocationName(enhancedOrigin);
    }

    const result = {
      origin: enhancedOrigin,
      destination: enhancedDestination,
      confidence: parsedRoute.confidence,
      raw_query: query,
      success: true,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /parse-route] GET Error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to parse route query';

    return NextResponse.json(
      {
        error: errorMessage,
        success: false,
      },
      { status: 500 }
    );
  }
}

