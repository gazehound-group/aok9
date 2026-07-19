// Grading Guide data context: bundled snapshot + runtime xlsx import.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import bundled from './data/grading-guide.json';
import { parseGradingGuide } from './io/gradingGuideImport';
import type { GuideDog } from './domain/types';

const GUIDE_KEY = 'aok9-guide-v1';

interface GuideData {
  source: string;
  dogs: GuideDog[];
}

interface GuideCtx {
  guide: GuideData;
  importFile: (file: File) => Promise<void>;
  resetToBundled: () => void;
}

const bundledData: GuideData = {
  source: (bundled as { source?: string }).source ?? 'bundled',
  dogs: (bundled as { dogs: GuideDog[] }).dogs,
};

const Ctx = createContext<GuideCtx | null>(null);

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [guide, setGuide] = useState<GuideData>(() => {
    try {
      const raw = localStorage.getItem(GUIDE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GuideData;
        if (parsed?.dogs?.length) return parsed;
      }
    } catch {
      /* fall back to bundled */
    }
    return bundledData;
  });

  useEffect(() => {
    if (guide !== bundledData) {
      try {
        localStorage.setItem(GUIDE_KEY, JSON.stringify(guide));
      } catch {
        /* quota: uploaded guide won't survive reload, bundled remains */
      }
    }
  }, [guide]);

  const value = useMemo<GuideCtx>(
    () => ({
      guide,
      importFile: async (file: File) => {
        const buf = await file.arrayBuffer();
        const dogs = parseGradingGuide(buf);
        if (dogs.length === 0) throw new Error('No dogs found — is this a Grading Guide xlsx?');
        setGuide({ source: file.name, dogs });
      },
      resetToBundled: () => {
        localStorage.removeItem(GUIDE_KEY);
        setGuide(bundledData);
      },
    }),
    [guide]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGuide() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGuide outside provider');
  return ctx;
}
