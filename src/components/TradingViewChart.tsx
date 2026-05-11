"use client";

import { useEffect, useRef, useState } from "react";
import { datafeed } from "@/lib/tradingview/datafeed";
import { resolveInstrumentFromTicker, shouldSetChartSymbol } from "@/lib/tradingview/chartSync";
import { defaultInstrument, type Instrument } from "@/lib/types/market";
import type { TradingViewResolutionString, TradingViewSymbolInfo, TradingViewWidget } from "@/lib/tradingview/types";

type TradingViewChartProps = {
  instrument?: Instrument;
  interval?: TradingViewResolutionString;
  onInstrumentChange?: (instrument: Instrument) => void;
};

const libraryPath = "/charting_library/";
const scriptCandidates = [
  `${libraryPath}charting_library.standalone.js`,
  `${libraryPath}charting_library.js`
];

const loadScript = (scriptUrl: string) =>
  new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);

    if (window.TradingView?.widget) {
      resolve();
      return;
    }

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("스크립트 로드 실패")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("스크립트 로드 실패"));
    document.body.appendChild(script);
  });

const loadTradingViewLibrary = async () => {
  if (window.TradingView?.widget) {
    return;
  }

  for (const scriptUrl of scriptCandidates) {
    try {
      await loadScript(scriptUrl);

      if (window.TradingView?.widget) {
        return;
      }
    } catch {
      continue;
    }
  }

  throw new Error("TradingView Charting Library는 공식 접근 승인이 필요한 파일입니다. 승인받은 파일을 public/charting_library 경로에 넣어주세요.");
};

export function TradingViewChart({
  instrument = defaultInstrument,
  interval = "60",
  onInstrumentChange
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<TradingViewWidget | null>(null);
  const currentSymbolRef = useRef<string | null>(null);
  const chartTicker = instrument.tradingViewTicker;
  const latestPropsRef = useRef({ chartTicker, interval, onInstrumentChange });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    latestPropsRef.current = { chartTicker, interval, onInstrumentChange };
  }, [chartTicker, interval, onInstrumentChange]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribeSymbolChanged: (() => void) | null = null;

    const handleSymbolChanged = async (symbolInfo: TradingViewSymbolInfo) => {
      const ticker = symbolInfo.ticker || symbolInfo.name;

      currentSymbolRef.current = ticker;

      try {
        const instrument = await resolveInstrumentFromTicker(ticker);

        if (!cancelled && instrument) {
          latestPropsRef.current.onInstrumentChange?.(instrument);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("TradingView 심볼 변경을 앱 상태와 동기화하지 못했습니다.");
        }
      }
    };

    const initializeWidget = async () => {
      if (!containerRef.current) {
        return;
      }

      setErrorMessage(null);

      try {
        await loadTradingViewLibrary();

        if (cancelled || !containerRef.current || !window.TradingView?.widget) {
          return;
        }

        widgetRef.current?.remove();
        const initialSymbol = latestPropsRef.current.chartTicker;
        const initialInterval = latestPropsRef.current.interval;

        currentSymbolRef.current = initialSymbol;
        widgetRef.current = new window.TradingView.widget({
          symbol: initialSymbol,
          interval: initialInterval,
          container: containerRef.current,
          datafeed,
          library_path: libraryPath,
          locale: "ko",
          autosize: true,
          theme: "dark",
          timezone: "Etc/UTC",
          disabled_features: ["use_localstorage_for_settings"]
        });

        widgetRef.current.onChartReady(() => {
          if (!widgetRef.current || cancelled) {
            return;
          }

          const symbolChangedSubscription = widgetRef.current.activeChart().onSymbolChanged();
          symbolChangedSubscription.subscribe(null, handleSymbolChanged);
          unsubscribeSymbolChanged = () => symbolChangedSubscription.unsubscribe(null, handleSymbolChanged);
        });
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "TradingView 차트를 초기화하지 못했습니다.");
        }
      }
    };

    initializeWidget();

    return () => {
      cancelled = true;
      unsubscribeSymbolChanged?.();
      widgetRef.current?.remove();
      widgetRef.current = null;
    };
  }, []);

  useEffect(() => {
    const widget = widgetRef.current;

    if (!widget || !shouldSetChartSymbol(currentSymbolRef.current, chartTicker)) {
      return;
    }

    currentSymbolRef.current = chartTicker;
    widget.setSymbol(chartTicker, interval);
  }, [chartTicker, interval]);

  if (errorMessage) {
    return (
      <div className="chart-placeholder" role="alert">
        <div>
          <p>TradingView 라이브러리 파일이 필요합니다.</p>
          <span>{errorMessage}</span>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="tradingview-chart" aria-label="TradingView 차트" />;
}
