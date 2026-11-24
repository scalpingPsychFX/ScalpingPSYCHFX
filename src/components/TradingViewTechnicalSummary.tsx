import React, { useEffect, useRef } from 'react';

export const TradingViewTechnicalSummary: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const widgetHost = document.createElement('div');
    widgetHost.className = 'tradingview-widget-container__widget';
    widgetHost.style.width = '100%';
    widgetHost.style.height = '100%';
    container.appendChild(widgetHost);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.async = true;
    script.textContent = JSON.stringify({
      interval: '15m',
      width: '100%',
      isTransparent: false,
      height: 450,
      symbol: 'OANDA:XAUUSD',
      showIntervalTabs: true,
      displayMode: 'single',
      locale: 'en',
      colorTheme: 'dark',
    });

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <section className="w-full rounded-xl overflow-hidden border border-slate-800 bg-[#131722]">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 bg-[#0F172A]">
        <h2 className="text-sm font-semibold text-white">
          Market Technical Summary
        </h2>
        <span className="text-xs font-mono text-amber-400">
          OANDA:XAUUSD · Sell / Neutral / Buy
        </span>
      </div>
      <div className="w-full h-[450px]">
        <div
          ref={containerRef}
          className="tradingview-widget-container w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </section>
  );
};
