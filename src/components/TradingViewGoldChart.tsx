import React, { useEffect, useRef, useState } from 'react';

export interface TimeframeOption {
  label: string;
  interval: string;
}

const TIMEFRAMES: TimeframeOption[] = [
  { label: '1m', interval: '1' },
  { label: '5m', interval: '5' },
  { label: '15m', interval: '15' },
  { label: '1H', interval: '60' },
  { label: '4H', interval: '240' },
  { label: '1D', interval: 'D' },
  { label: '1W', interval: 'W' },
];

interface TradingViewGoldChartProps {
  heightClass?: string;
}

export const TradingViewGoldChart: React.FC<TradingViewGoldChartProps> = ({
  heightClass = 'h-[420px] sm:h-[480px] lg:h-[540px]',
}) => {
  const [interval, setInterval] = useState<string>('15');
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
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true,
      symbol: 'OANDA:XAUUSD',
      interval,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      withdateranges: true,
      save_image: false,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    });

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [interval]);

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-800 bg-[#0F172A]">
      <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#0F172A]">
        <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
          <span className="font-semibold text-amber-400">XAUUSD</span>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <span className="text-slate-300">Live Spot Gold Chart</span>
        </div>

        <div
          role="group"
          aria-label="Chart timeframe"
          className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto"
        >
          {TIMEFRAMES.map((tf) => {
            const active = interval === tf.interval;
            return (
              <button
                key={tf.interval}
                type="button"
                onClick={() => setInterval(tf.interval)}
                aria-pressed={active}
                className={`px-2.5 py-1 text-xs font-mono tabular-nums font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`w-full ${heightClass}`}>
        <div
          ref={containerRef}
          className="tradingview-widget-container w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};
