'use client';

import React from 'react';
import { Listbox } from '@headlessui/react';
import { Calendar, ChevronLeft, ChevronRight, Layers, ChevronDown } from 'lucide-react';

type Props = {
  years: number[];
  range: { start: number; end: number };
  onRangeChange: (start: number, end: number) => void;
  className?: string;
};

export default function TimeSeriesSelector({ years, range, onRangeChange, className = '' }: Props) {
  const startIndex = years.indexOf(range.start);
  const endIndex = years.indexOf(range.end);
  const indicesValid = startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex;
  const windowSize = indicesValid ? endIndex - startIndex : 0;

  const canGoPrev = indicesValid && startIndex > 0;
  const canGoNext = indicesValid && endIndex < years.length - 1;

  if (years.length === 0) {
    return (
      <div className={`glass-panel glass-panel--strong rounded-2xl p-4 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Calendar size={16} />
          <span>No data available</span>
        </div>
      </div>
    );
  }

  const normalizedWindowSize = Math.max(0, windowSize);

  const handlePrev = () => {
    if (!indicesValid) return;
    if (!canGoPrev) return;
    const newStartIdx = Math.max(0, startIndex - 1);
    const span = normalizedWindowSize;
    const newEndIdx = Math.max(newStartIdx + span, newStartIdx);
    onRangeChange(years[newStartIdx], years[Math.min(newEndIdx, years.length - 1)]);
  };

  const handleNext = () => {
    if (!indicesValid) return;
    if (!canGoNext) return;
    const span = normalizedWindowSize;
    const newStartIdx = Math.min(startIndex + 1, Math.max(0, years.length - 1));
    const tentativeEndIdx = newStartIdx + span;
    if (tentativeEndIdx >= years.length) return;
    onRangeChange(years[newStartIdx], years[tentativeEndIdx]);
  };

  const handleStartSelect = (newStart: number) => {
    if (endIndex === -1 || years.indexOf(newStart) === -1) return;
    const startIdx = years.indexOf(newStart);
    if (startIdx > endIndex) {
      onRangeChange(newStart, newStart);
    } else {
      onRangeChange(newStart, range.end);
    }
  };

  const handleEndSelect = (newEnd: number) => {
    if (startIndex === -1 || years.indexOf(newEnd) === -1) return;
    const endIdx = years.indexOf(newEnd);
    if (endIdx < startIndex) {
      onRangeChange(newEnd, newEnd);
    } else {
      onRangeChange(range.start, newEnd);
    }
  };

  const spanYears = Math.abs(range.end - range.start) + 1;
  const spanBuckets = indicesValid ? endIndex - startIndex + 1 : 1;
  const safeStartIdx = indicesValid ? startIndex : 0;
  const safeEndIdx = indicesValid ? endIndex : safeStartIdx;
  const startPercent = (safeStartIdx / years.length) * 100;
  const endPercent = ((safeEndIdx + 1) / years.length) * 100;
  const widthPercent = Math.max(endPercent - startPercent, 0);

  return (
    <div className={`glass-panel glass-panel--strong rounded-2xl p-4 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Calendar size={16} className="text-indigo-400" />
          <span className="font-medium">Years</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canGoPrev}
            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
              canGoPrev
                ? 'border-white/20 bg-white/6 text-gray-200 cursor-pointer hover:bg-white/12 hover:border-white/30 active:translate-y-[1px]'
                : 'border-white/8 bg-white/3 text-gray-500 cursor-not-allowed opacity-50'
            }`}
            aria-label="Previous year"
          >
            <ChevronLeft size={16} />
          </button>

          <Listbox value={range.start} onChange={handleStartSelect}>
            {({ open }) => (
              <div className="relative">
                <Listbox.Button className="px-3 py-1.5 rounded-xl border border-white/20 bg-white/8 text-white text-sm font-medium cursor-pointer focus:outline-none focus:border-indigo-500/60 focus:bg-white/12 transition-colors min-w-[90px] text-center flex items-center justify-center gap-1.5">
                  <span>{range.start}</span>
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </Listbox.Button>
                <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/12 bg-[rgba(12,16,28,0.98)] backdrop-blur-xl shadow-lg focus:outline-none no-scrollbar">
                  {years.map((year) => (
                    <Listbox.Option
                      key={year}
                      value={year}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 px-3 text-center text-sm text-white ${
                          active ? 'bg-indigo-500/20 text-indigo-200' : ''
                        } ${year === range.start ? 'bg-indigo-500/30 text-indigo-100' : ''}`
                      }
                    >
                      {year}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            )}
          </Listbox>

          <span className="text-xs text-gray-400">to</span>

          <Listbox value={range.end} onChange={handleEndSelect}>
            {({ open }) => (
              <div className="relative">
                <Listbox.Button className="px-3 py-1.5 rounded-xl border border-white/20 bg-white/8 text-white text-sm font-medium cursor-pointer focus:outline-none focus:border-indigo-500/60 focus:bg-white/12 transition-colors min-w-[90px] text-center flex items-center justify-center gap-1.5">
                  <span>{range.end}</span>
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </Listbox.Button>
                <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/12 bg-[rgba(12,16,28,0.98)] backdrop-blur-xl shadow-lg focus:outline-none no-scrollbar">
                  {years.map((year) => (
                    <Listbox.Option
                      key={year}
                      value={year}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 px-3 text-center text-sm text-white ${
                          active ? 'bg-indigo-500/20 text-indigo-200' : ''
                        } ${year === range.end ? 'bg-indigo-500/30 text-indigo-100' : ''}`
                      }
                    >
                      {year}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            )}
          </Listbox>

          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
              canGoNext
                ? 'border-white/20 bg-white/6 text-white cursor-pointer hover:bg-white/12 hover:border-white/30 active:translate-y-[1px]'
                : 'border-white/8 bg-white/3 text-gray-500 cursor-not-allowed opacity-50'
            }`}
            aria-label="Next year"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/8 space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Selected range</span>
          <span className="text-gray-300">
            {range.start} – {range.end}{' '}
            <span className="text-[11px] text-gray-500">
              ({spanYears} {spanYears === 1 ? 'year' : 'years'})
            </span>
          </span>
        </div>
        <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500/60 via-cyan-400/60 to-emerald-400/60 transition-all duration-300"
            style={{
              left: `${startPercent}%`,
              width: `${widthPercent}%`,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <Layers size={12} /> Available {years[0]} – {years[years.length - 1]}
          </span>
        </div>
      </div>
    </div>
  );
}

