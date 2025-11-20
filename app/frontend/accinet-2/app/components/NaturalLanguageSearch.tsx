'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, MapPin, Navigation, Sparkles } from 'lucide-react';

interface ParsedRouteResponse {
  origin?: string;
  destination?: string;
  confidence: number;
  raw_query: string;
  success: boolean;
  error?: string;
}

export default function NaturalLanguageSearch() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedRouteResponse | null>(null);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError('Please enter a destination or route');
      return;
    }

    setIsLoading(true);
    setError(null);
    setParsedResult(null);

    try {
      console.log('Sending query to parse-route API:', query);

      const response = await fetch('/api/parse-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          userContext: {
            city: 'Dallas',
            state: 'Texas',
          },
        }),
      });

      const data: ParsedRouteResponse = await response.json();

      console.log('Received response from parse-route API:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to parse your request');
      }

      // Show parsed result briefly before navigating
      setParsedResult(data);

      // Wait a moment to show the parsed result
      setTimeout(() => {
        // Navigate to map with route parameters
        const params = new URLSearchParams();
        if (data.destination) {
          params.set('destination', data.destination);
        }
        if (data.origin) {
          params.set('origin', data.origin);
        }
        params.set('autoSearch', 'true');

        router.push(`/map?${params.toString()}`);
      }, 1500);
    } catch (err) {
      console.error('Error parsing route:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse your request. Please try again.');
      setParsedResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const examples = [
    'I want to go to Junbi',
    'Take me to UTD from DFW Airport',
    'How do I get to the mall?',
  ];

  const handleExampleClick = (example: string) => {
    setQuery(example);
    setError(null);
    setParsedResult(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="glass-panel glass-panel--strong rounded-3xl p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-purple-500/20 grid place-items-center">
            <Sparkles className="text-cyan-300" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold m-0">Natural Language Route Search</h3>
            <p className="text-sm text-[rgba(240,243,255,0.65)] m-0">
              Tell us where you want to go in plain English
            </p>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(240,243,255,0.5)]"
              size={20}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., I want to go to Junbi from UTD"
              disabled={isLoading}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[rgba(12,18,32,0.6)] border border-cyan-400/30 text-[#f0f3ff] placeholder-[rgba(240,243,255,0.4)] focus:outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition-all disabled:opacity-50"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-400/30 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Parsed Result */}
          {parsedResult && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-400/30 text-green-200 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MapPin size={16} />
                <span>Route Parsed Successfully!</span>
              </div>
              <div className="grid gap-2 text-sm">
                {parsedResult.origin && (
                  <div className="flex items-start gap-2">
                    <Navigation size={14} className="mt-0.5 text-green-300" />
                    <div>
                      <span className="text-[rgba(240,243,255,0.6)]">From:</span>{' '}
                      <span className="text-white">{parsedResult.origin}</span>
                    </div>
                  </div>
                )}
                {parsedResult.destination && (
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="mt-0.5 text-green-300" />
                    <div>
                      <span className="text-[rgba(240,243,255,0.6)]">To:</span>{' '}
                      <span className="text-white">{parsedResult.destination}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-xs text-[rgba(240,243,255,0.5)]">
                Confidence: {Math.round(parsedResult.confidence * 100)}% • Redirecting to map...
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="w-full py-4 rounded-2xl font-semibold text-sm border border-transparent transition-all bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-[0_15px_40px_rgba(17,25,40,0.35)] hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(6,182,212,0.45)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Parsing your request...</span>
              </>
            ) : (
              <>
                <Search size={18} />
                <span>Find Route</span>
              </>
            )}
          </button>
        </form>

        {/* Examples */}
        <div className="mt-6 pt-6 border-t border-white/5">
          <p className="text-xs text-[rgba(240,243,255,0.5)] uppercase tracking-wider mb-3">
            Try these examples:
          </p>
          <div className="flex flex-wrap gap-2">
            {examples.map((example, idx) => (
              <button
                key={idx}
                onClick={() => handleExampleClick(example)}
                disabled={isLoading}
                className="text-xs px-3 py-2 rounded-lg bg-[rgba(56,189,248,0.1)] border border-cyan-400/20 text-cyan-200 hover:bg-[rgba(56,189,248,0.15)] hover:border-cyan-400/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 rounded-xl bg-[rgba(56,189,248,0.05)] border border-cyan-400/10">
          <p className="text-xs text-[rgba(240,243,255,0.6)] m-0 leading-relaxed">
            <strong className="text-cyan-300">Powered by Gemini AI:</strong> Our system understands
            natural language and can interpret informal place names, landmarks, and institutions in
            the Texas area.
          </p>
        </div>
      </div>
    </div>
  );
}

