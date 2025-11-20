# Gemini Natural Language Search Setup Guide

## Quick Start

### 1. Get a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Configure Environment Variable

Create or update your `.env.local` file in the project root:

```bash
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Install Dependencies (if needed)

```bash
npm install
```

The `@google/generative-ai` package is already included in `package.json`.

### 4. Start the Development Server

```bash
npm run dev
```

### 5. Test the Feature

1. Open http://localhost:3000 in your browser
2. Log in to your account (required for natural language search)
3. You should see the "Natural Language Route Search" section on the landing page
4. Try entering queries like:
   - "I want to go to Junbi"
   - "Take me to UTD from DFW Airport"
   - "How do I get to the mall?"

## Verification

To verify everything is working:

1. **Check the natural language search appears**: Log in and look for the search box on the landing page
2. **Test a simple query**: Enter "I want to go to Junbi" and click "Find Route"
3. **Verify parsing**: You should see a success message showing the parsed destination
4. **Check redirection**: You should be automatically redirected to the map with the route search initiated

## API Endpoints

The following API endpoints are now available:

- **POST /api/parse-route** - Parse natural language queries (recommended)
- **GET /api/parse-route?query=...** - Simple GET-based parsing

## Environment Variables Required

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_GEMINI_API_KEY` | Gemini AI for NL parsing | ✅ Yes (for NL search) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps & geocoding | ✅ Yes (already required) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Authentication | ✅ Yes (already required) |

## Troubleshooting

### Search component not appearing
- Make sure you're logged in
- Check that the NaturalLanguageSearch component is imported correctly in `app/page.tsx`

### "Gemini API key is not configured" error
- Verify `.env.local` exists in the project root
- Ensure `NEXT_PUBLIC_GEMINI_API_KEY` is set correctly
- Restart the dev server (`npm run dev`)

### Parsing errors
- Verify your API key is valid
- Check the browser console for detailed error messages
- Try rephrasing your query to be more explicit

### Geocoding errors
- Ensure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set and has Places API enabled
- Check that the Google Maps JavaScript API is loaded

## Next Steps

- Read the full documentation in `NATURAL_LANGUAGE_SEARCH.md`
- Explore the example queries
- Customize the user context for better location enhancement
- Consider adding rate limiting for production

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all environment variables are set
3. Ensure you're logged in when testing
4. Review the detailed documentation in `NATURAL_LANGUAGE_SEARCH.md`

