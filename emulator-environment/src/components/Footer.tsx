// ai-plays-n64/emulator-environment/src/components/Footer.tsx
// This component renders the footer section of the application.

import React from 'react';

const Footer: React.FC = () => {
  return (
    <div className="z-0 text-sm text-gray-400 absolute bottom-4 right-4 flex flex-col items-end justify-end gap-2">
      <div className="flex items-end justify-end gap-4">
        <p>
          AI Orchestrator from{' '}
          <a
            className="text-white hover:text-apple-blue"
            href="https://vitrus.ai" // Corrected link as per common practice for company names
            target="_blank"
            rel="noopener noreferrer"
          >
            Vitrus
          </a>
        </p>
        <p>
          Built on top of{' '}
          <a
            className="text-white hover:text-apple-blue"
            href="https://emulatorjs.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            EmulatorJS
          </a>
        </p>
        <p>
          N64 model from{' '}
          <a
            className="text-white hover:text-apple-blue"
            href="https://sketchfab.com/3d-models/nintendo-64-816d53eca00e4f3192a8d23f62388472"
            target="_blank"
            rel="noopener noreferrer"
          >
            @ethanboor
          </a>
        </p>
      </div>
      <p className="text-xs text-gray-500 mt-1 text-right">
        This app is meant to be a research benchmark environment to test artificial intelligence agents that play games in 3D environments to further test and develop perception models.
      </p>
    </div>
  );
};

export default Footer;
