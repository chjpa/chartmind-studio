import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ChartMind Studio Integration Overview",
  description: "Public integration overview for ChartMind Studio and TradingView Advanced Charts access review."
};

export default function IntegrationOverviewPage() {
  return (
    <main className="integration-page">
      <section className="integration-hero">
        <p className="eyebrow">Public Integration Overview</p>
        <h1>ChartMind Studio</h1>
        <p>
          ChartMind Studio is a public crypto chart analysis workspace being built with a custom market datafeed,
          multi-exchange OHLCV data, user drawings, deterministic technical analysis, and AI-assisted chart review.
        </p>
      </section>

      <section className="integration-section">
        <h2>TradingView Advanced Charts use case</h2>
        <p>
          The application will integrate TradingView Advanced Charts as the charting interface. Market data will be
          provided by our own datafeed API, not by TradingView market data.
        </p>
        <ul>
          <li>Custom Datafeed API for historical and real-time OHLCV candles.</li>
          <li>Initial crypto markets include spot and perpetual futures instruments.</li>
          <li>Supported exchanges are planned through a provider registry, including Binance, Bybit, OKX, Coinbase, and Upbit.</li>
          <li>User drawings are stored per instrument and interval so different exchanges and market types do not mix.</li>
          <li>AI analysis uses structured OHLCV, drawing, and deterministic analysis data. It does not analyze chart screenshots.</li>
        </ul>
      </section>

      <section className="integration-section">
        <h2>Availability</h2>
        <p>
          This is an early public demo URL for review. The production integration will be publicly available and will
          not include real order execution, broker account connection, or automated trading in the MVP.
        </p>
      </section>
    </main>
  );
}
