'use client';

import React from 'react';

export default function ConfigBox({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const [hover, setHover] = React.useState(false);
  const [hasNewSettings] = React.useState(false);

  return (
    <div className="fixed right-4 bottom-4 z-[2147483647]">
      <style>{`
        @keyframes pulse {
          0%,100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @media (max-width: 700px) {
          .cfg-text { display: none; }
        }
      `}</style>

      <button
        type="button"
        onClick={onOpenSidebar}
        className={`relative glass-button flex items-center gap-2 px-4 py-2.5 font-medium text-[13px] cursor-pointer ${
          hover ? '-translate-y-[1px]' : 'translate-y-0'
        }`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <svg
          viewBox="0 0 24 24"
          className={`w-4 h-4 block transition-transform duration-[400ms] ${hover ? 'rotate-[28deg]' : 'rotate-0'}`}
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Zm9.2 3.2c0-.5-.04-.97-.12-1.44l2.1-1.63-2-3.46-2.56.67a7.9 7.9 0 0 0-2.5-1.45L15.7 1h-3.4l-.42 2.51c-.87.25-1.71.64-2.5 1.15l-2.3-.9-2 3.46 1.94 1.6c-.1.48-.15.98-.15 1.5 0 .5.05 1 .15 1.48l-1.94 1.6 2 3.46 2.3-.9c.8.5 1.63.9 2.5 1.14l.42 2.52h3.4l.42-2.52c.87-.24 1.71-.63 2.5-1.14l2.56.67 2-3.46-2.1-1.63c.08-.47.12-.95.12-1.44Z"
          />
        </svg>
        <span className="cfg-text">Configure</span>

        {hasNewSettings && (
          <span
            className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa] animate-[pulse_1.5s_infinite]"
          />
        )}
      </button>
    </div>
  );
}
