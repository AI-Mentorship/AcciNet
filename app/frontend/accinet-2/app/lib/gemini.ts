import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export interface ParsedRoute {
  origin?: string;
  destination?: string;
  confidence: number;
  raw_query: string;
}

/**
 * Parse natural language route queries using Gemini
 * Examples:
 * - "I want to go to junbi" -> { destination: "junbi" }
 * - "I want to go to junbi from UTD" -> { origin: "UTD", destination: "junbi" }
 * - "Take me to Dallas from Houston" -> { origin: "Houston", destination: "Dallas" }
 */
export async function parseRouteQuery(query: string): Promise<ParsedRoute> {
  try {
    console.log('[Gemini] Starting route query parsing for:', query);
    
    // Check if API key is available
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not set in environment variables');
    }
    console.log('[Gemini] API key found (length:', apiKey.length, ')');
    
    // Use the most cost-efficient model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    console.log('[Gemini] Model initialized (using gemini-2.5-flash-lite)');

    const prompt = `You are a route parsing assistant. Extract origin and destination locations from natural language queries.

Instructions:
1. Extract the destination (where the user wants to go)
2. Extract the origin (where the user is starting from) if mentioned
3. If origin is not mentioned, leave it undefined
4. Return ONLY a valid JSON object with this exact structure:
{
  "origin": "location name or undefined",
  "destination": "location name",
  "confidence": 0.0-1.0
}

Examples:
Query: "I want to go to junbi"
Response: {"destination": "junbi", "confidence": 0.9}

Query: "I want to go to junbi from UTD"
Response: {"origin": "UTD", "destination": "junbi", "confidence": 0.95}

Query: "Take me to Starbucks on Main Street from the airport"
Response: {"origin": "airport", "destination": "Starbucks on Main Street", "confidence": 0.9}

Query: "How do I get to the mall?"
Response: {"destination": "mall", "confidence": 0.85}

Now parse this query:
Query: "${query}"
Response:`;

    console.log('[Gemini] Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    console.log('[Gemini] Received response from Gemini API');
    const response = await result.response;
    const text = response.text().trim();
    console.log('[Gemini] Response text:', text);

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonText = text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    // Validate and normalize the response
    const routeData: ParsedRoute = {
      raw_query: query,
      destination: parsed.destination,
      origin: parsed.origin === 'undefined' || !parsed.origin ? undefined : parsed.origin,
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
    };

    // Ensure we at least have a destination
    if (!routeData.destination) {
      throw new Error('Could not extract destination from query');
    }

    return routeData;
  } catch (error) {
    console.error('Error parsing route query with Gemini:', error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Check if it's an API key issue
    if (error instanceof Error && error.message.includes('API_KEY')) {
      throw new Error('Gemini API key is invalid or not set correctly.');
    }
    
    throw new Error(`Failed to parse route query: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Enhance a location name with context using Gemini
 * For example, "junbi" might become "Junbi Restaurant, Richardson, TX"
 */
export async function enhanceLocationName(
  locationName: string,
  userContext?: { currentLocation?: string; city?: string; state?: string }
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const contextStr = userContext
      ? `User context: ${userContext.city || ''} ${userContext.state || 'Texas'}`
      : 'Default context: Texas, USA';

    const prompt = `You are a location resolver. Given a location name that might be informal or incomplete, provide the most likely full location identifier suitable for Google Maps.

${contextStr}

Rules:
1. If it's a business name, include the type (e.g., "Restaurant", "Coffee Shop")
2. Add city/state if missing and can be inferred from context
3. If it's clearly a landmark or institution, use the full name
4. Keep it concise but specific enough for Google Maps
5. Return ONLY the enhanced location string, no explanations

Examples:
Input: "junbi"
Output: Junbi, Richardson, TX

Input: "UTD"
Output: University of Texas at Dallas, Richardson, TX

Input: "DFW"
Output: Dallas/Fort Worth International Airport, TX

Input: "the mall"
Output: The Mall, ${userContext?.city || 'Dallas'}, TX

Input: "Starbucks on Main"
Output: Starbucks, Main Street, ${userContext?.city || 'Dallas'}, TX

Now enhance this location:
Input: "${locationName}"
Output:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const enhanced = response.text().trim();

    return enhanced || locationName;
  } catch (error) {
    console.error('Error enhancing location name:', error);
    // Fallback: return original name
    return locationName;
  }
}

