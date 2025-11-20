# Natural Language Route Search with Gemini AI

## Overview

This feature enables users to search for routes using natural language queries powered by Google's Gemini AI. Users can simply type phrases like "I want to go to Junbi" or "Take me to UTD from DFW Airport" and the system will parse the query, extract origin and destination, and automatically route them to the map with the search executed.

## Features

- **Natural Language Understanding**: Parse informal route requests using Gemini AI
- **Location Enhancement**: Automatically enhance location names with context (e.g., "junbi" → "Junbi, Richardson, TX")
- **Smart Origin Detection**: Supports both explicit origins and fallback to user's current location
- **Seamless Integration**: Automatically redirects to map with pre-filled route search
- **User-Friendly UI**: Beautiful, modern interface with example queries and real-time feedback

## Architecture

### Components

#### 1. **Gemini API Client** (`app/lib/gemini.ts`)
- `parseRouteQuery(query: string)`: Parses natural language into structured route data
- `enhanceLocationName(locationName: string, userContext?)`: Enhances location names with geographical context

#### 2. **MCP Server API** (`app/api/parse-route/route.ts`)
- **POST /api/parse-route**: Main endpoint for parsing natural language queries
- **GET /api/parse-route**: Alternative endpoint supporting query parameters
- Handles both origin and destination extraction
- Returns structured response with confidence scores

#### 3. **Natural Language Search Component** (`app/components/NaturalLanguageSearch.tsx`)
- Search interface displayed on landing page for logged-in users
- Real-time query parsing with loading states
- Success feedback showing parsed origin/destination
- Example queries for user guidance
- Automatic redirection to map with pre-filled search

#### 4. **Map Integration**
- **Map Page** (`app/map/page.tsx`): Accepts URL parameters for initial origin/destination
- **AcciNetMap Component**: Passes initial values to RouteBox
- **RouteBox Component**: Auto-executes search when initialized with parameters

## Setup

### 1. Environment Variables

Add the following to your `.env.local` file:

```bash
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Install Dependencies

The required dependency is already included in `package.json`:

```bash
npm install
```

### 3. Obtain Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key and add it to your `.env.local` file

## Usage

### For End Users

1. **Log in to AcciNet** - The natural language search is only available to authenticated users
2. **Navigate to the landing page** - You'll see the Natural Language Route Search section
3. **Enter your query** - Type a natural language request like:
   - "I want to go to Junbi"
   - "Take me to UTD from DFW Airport"
   - "How do I get to the mall?"
4. **Click "Find Route"** - The system will parse your query and redirect to the map
5. **View your route** - The map will automatically load with your parsed origin and destination

### For Developers

#### Using the Parse Route API

**POST Request:**

```typescript
const response = await fetch('/api/parse-route', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'I want to go to Junbi from UTD',
    userContext: {
      city: 'Dallas',
      state: 'Texas',
    },
  }),
});

const data = await response.json();
console.log(data);
// {
//   origin: "University of Texas at Dallas, Richardson, TX",
//   destination: "Junbi, Richardson, TX",
//   confidence: 0.95,
//   raw_query: "I want to go to Junbi from UTD",
//   success: true
// }
```

**GET Request:**

```typescript
const response = await fetch('/api/parse-route?query=I want to go to Junbi');
const data = await response.json();
```

#### Using the Gemini Client Directly

```typescript
import { parseRouteQuery, enhanceLocationName } from '@/app/lib/gemini';

// Parse a natural language query
const parsed = await parseRouteQuery('Take me to Junbi from UTD');
console.log(parsed);
// {
//   origin: "UTD",
//   destination: "Junbi",
//   confidence: 0.95,
//   raw_query: "Take me to Junbi from UTD"
// }

// Enhance a location name with context
const enhanced = await enhanceLocationName('junbi', {
  city: 'Dallas',
  state: 'Texas'
});
console.log(enhanced); // "Junbi, Richardson, TX"
```

## API Reference

### POST /api/parse-route

Parses a natural language route query and returns structured route data.

**Request Body:**
```typescript
{
  query: string;              // Natural language route query
  userContext?: {            // Optional context for location enhancement
    currentLocation?: string;
    city?: string;
    state?: string;
  };
}
```

**Response:**
```typescript
{
  origin?: string;           // Parsed and enhanced origin location
  destination?: string;      // Parsed and enhanced destination location
  confidence: number;        // Confidence score (0-1)
  raw_query: string;        // Original query
  success: boolean;         // Whether parsing succeeded
  error?: string;           // Error message if failed
}
```

**Example Queries:**

| Query | Parsed Origin | Parsed Destination |
|-------|---------------|-------------------|
| "I want to go to Junbi" | undefined (uses current location) | "Junbi, Richardson, TX" |
| "Take me to UTD from DFW Airport" | "Dallas/Fort Worth International Airport, TX" | "University of Texas at Dallas, Richardson, TX" |
| "How do I get to the mall?" | undefined | "The Mall, Dallas, TX" |
| "Navigate to Starbucks on Main Street" | undefined | "Starbucks, Main Street, Dallas, TX" |

## Technical Details

### Gemini Prompt Engineering

The system uses carefully crafted prompts to ensure consistent and accurate parsing:

1. **Route Parsing Prompt**: Extracts origin and destination with confidence scores
2. **Location Enhancement Prompt**: Adds geographical context to informal location names
3. **JSON Response Format**: Ensures structured, parseable responses

### Error Handling

- API key validation
- Query format validation
- Geocoding error handling
- Network error handling
- User-friendly error messages

### Performance Considerations

- Async/await for non-blocking API calls
- Loading states for better UX
- Automatic retry on transient errors
- Efficient prompt design to minimize tokens

## Examples

### Example 1: Simple Destination Query

**User Input:** "I want to go to Junbi"

**Gemini Response:**
```json
{
  "destination": "Junbi",
  "confidence": 0.9
}
```

**Enhanced Location:** "Junbi, Richardson, TX"

**Result:** User is redirected to map with destination pre-filled, origin uses current location

### Example 2: Origin and Destination Query

**User Input:** "Take me to UTD from DFW Airport"

**Gemini Response:**
```json
{
  "origin": "DFW Airport",
  "destination": "UTD",
  "confidence": 0.95
}
```

**Enhanced Locations:**
- Origin: "Dallas/Fort Worth International Airport, TX"
- Destination: "University of Texas at Dallas, Richardson, TX"

**Result:** User is redirected to map with both origin and destination pre-filled, search auto-executes

### Example 3: Informal Location Names

**User Input:** "How do I get to the mall?"

**Gemini Response:**
```json
{
  "destination": "mall",
  "confidence": 0.85
}
```

**Enhanced Location:** "The Mall, Dallas, TX"

**Result:** User is redirected to map with enhanced destination

## Troubleshooting

### "Gemini API key is not configured"
- Ensure `NEXT_PUBLIC_GEMINI_API_KEY` is set in `.env.local`
- Restart the development server after adding the key

### "Could not extract destination from query"
- Try rephrasing your query to be more explicit
- Ensure you mention a specific location or landmark
- Examples that work well:
  - "I want to go to [place]"
  - "Take me to [destination]"
  - "Navigate to [location]"

### "Failed to parse route query"
- Check your internet connection
- Verify the Gemini API key is valid
- Check the browser console for detailed error messages

### Location Not Found
- The system uses Google Places API for geocoding
- Ensure location names are recognizable (e.g., "UTD" instead of "ut dallas")
- Add more context to ambiguous names (e.g., "Junbi Richardson" instead of just "junbi")

## Future Enhancements

- [ ] Multi-stop route planning
- [ ] Voice input support
- [ ] Recent search history
- [ ] Location suggestions based on user preferences
- [ ] Integration with user's saved places
- [ ] Support for more complex queries (e.g., "fastest route", "scenic route")
- [ ] Multi-language support
- [ ] Contextual awareness (time of day, traffic conditions)

## Security Considerations

- API key is stored as environment variable
- Server-side API calls prevent key exposure
- Input validation and sanitization
- Rate limiting on API endpoints (recommended for production)

## Contributing

To contribute to this feature:

1. Ensure all new code follows the existing patterns
2. Add tests for new functionality
3. Update this documentation with any changes
4. Test with various natural language queries

## License

This feature is part of the AcciNet project and follows the same license.

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the browser console for error messages
- Contact the AcciNet development team

---

**Built with ❤️ using Google Gemini AI**

