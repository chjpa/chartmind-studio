# 개인용 AI 보조 트레이딩 차트 분석 워크스페이스 구현 계획

> **작업자 필수 지침:** 이 파일의 `공통 작업 지시문`을 모든 작업 시작 전에 가장 먼저 읽는다. 구현 단계에서는 `superpowers:subagent-driven-development` 또는 `superpowers:executing-plans`를 사용해 마일스톤 단위로 진행한다. 구현은 한 번에 크게 진행하지 않고, 각 마일스톤마다 테스트와 리뷰를 거친다.

**목표:** Next.js + TypeScript 기반으로 TradingView Advanced Charts를 표시하고, 여러 거래소의 공개 market data provider를 선택적으로 연결해 현물과 선물/무기한 선물 암호화폐 실시간 차트, 사용자 드로잉 인식과 저장, 결정론적 기술 분석, AI 채팅 분석, AI 제안 차트 액션 표시를 제공하는 MVP를 만든다.

**아키텍처:** Next.js App Router가 UI, 서버 API 라우트, TradingView 커스텀 Datafeed, AI 분석 API를 담당한다. 시장 데이터는 `exchange`, `marketType`, `instrumentId`를 공통 모델로 정규화하고, 거래소별 provider가 REST/WebSocket API 차이를 흡수한다. OHLCV/실시간 가격/드로잉 객체/분석 엔진 결과를 구조화 데이터로 합쳐 AI에 전달하며, AI는 숫자를 임의 생성하지 않고 기술적 분석 엔진과 시나리오 엔진이 계산한 진입가, 손절가, 익절가 후보를 설명하고 선택 가능한 차트 액션으로 반환한다.

**기술 스택:** Next.js, React, TypeScript, TradingView Advanced Charts / Charting Library, 거래소별 public market data API provider, Zod, Vitest, React Testing Library, Playwright, localStorage.

---

## 공통 작업 지시문

- 모든 설명 문서, `README.md`, `PLANS.md`, 코드 주석, UI 문구, 작업 요약, 리뷰 코멘트는 한국어로 작성한다.
- 코드의 파일명, 폴더명, 함수명, 변수명, 타입명, API 필드명은 개발 관례에 맞게 영어로 유지한다.
- 예: 설명 문서는 한국어로 작성하고, 함수명은 `fetchKlines`, 타입명은 `ChartDrawing`처럼 영어로 작성한다.
- 코드 주석은 꼭 필요한 경우에만 작성하고, 작성할 때는 한국어로 쓴다.
- 작업 전에는 현재 레포 구조를 확인하고, 작은 마일스톤 단위로 계획 또는 구현을 진행한다.
- Superpowers Skills를 사용할 수 있으면 사용 가능한 스킬을 먼저 확인하고, 계획, 구현, 테스트, 코드 리뷰에 적절히 활용한다.
- 큰 기능을 한 번에 구현하지 않는다. 작고 검토 가능한 단위로 진행한다.
- TradingView 라이브러리 파일은 공개 저장소에 올리지 않는다.
- TradingView Charting Library는 TradingView.com의 market data를 자동으로 제공하지 않는다. TradingView에서 보는 거래소/심볼처럼 선택 UX를 만들되, 실제 데이터는 우리가 구현한 거래소별 public API provider 또는 합법적으로 연결한 data vendor에서 가져온다.
- TradingView가 표시하는 거래소 코드와 유사한 ticker 형식을 사용한다. 예: `BINANCE:SPOT:BTCUSDT`, `OKX:PERP:BTCUSDT`, `COINBASE:SPOT:BTCUSD`.
- ticker나 거래소 원본 `symbol`만으로 차트를 식별하지 않는다. 앱 내부의 고유 기준은 항상 `instrumentId`다.
- MVP는 여러 거래소를 선택할 수 있는 구조를 먼저 만들고, 실제 provider는 `ProviderRegistry`에 순차적으로 추가한다.
- 현물과 선물/무기한 선물은 `marketType`으로 구분한다. 예: `spot`, `linear_perp`, `inverse_perp`, `dated_future`, `index`, `mark`.
- 차트 이미지를 캡처해서 분석하지 않는다.
- 분석은 OHLCV 데이터, 실시간 가격 데이터, 드로잉 객체 데이터, 분석 엔진 결과를 기반으로 한다.
- 사용자가 직접 그린 도형을 가장 우선한다.
- 사용자가 수정한 자동 도형은 원래 자동 도형보다 우선한다.
- AI 응답은 구조화된 JSON으로 받아 Zod 스키마 검증을 통과한 경우에만 사용한다.

## 현재 레포 구조

- 경로: `/Users/chjmd/Documents/New project`
- 현재 상태: Next.js App Router + TypeScript 기본 앱, TradingView datafeed 골격, market data router, provider registry, drawing 저장소, AI chartContext, chartActions, 단위 테스트가 준비되어 있다.
- 주요 경로:
  - `src/app`: App Router 화면과 API routes
  - `src/components`: 차트 워크스페이스, TradingView wrapper, MarketSelector, AI 패널
  - `src/lib/types`: `Instrument`, `Candle`, `ChartDrawing`, `AnalysisResult`, AI payload 타입
  - `src/lib/market`: `MarketDataProvider`, `MarketDataRouter`, `ExchangeRegistry`, `ProviderRegistry`, capability, timeframe, streaming 구조
  - `src/lib/tradingview`: TradingView datafeed와 ticker/instrument 매핑
  - `src/lib/drawings`: drawing bridge, repository, engine drawing 변환
  - `src/lib/ai`: chartContext와 AI 시스템 프롬프트
  - `src/lib/chartActions`: AI chart action 적용 스코프와 drawing 변환
  - `src/lib/demo`: 첫 MVP 데모 플로우와 통합 테스트
- 다음 세션의 우선 작업은 마일스톤 3의 나머지 provider 확장이다.

## 공식 문서 기준

- 확인일: 2026-05-11
- TradingView Datafeed API: https://www.tradingview.com/charting-library-docs/latest/connecting_data/Datafeed-API/
- TradingView 저장 및 불러오기: https://www.tradingview.com/charting-library-docs/latest/saving_loading/
- Binance Spot kline REST provider 참고 문서: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints
- Binance Spot kline WebSocket provider 참고 문서: https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams
- Binance USDⓈ-M Futures kline REST provider 참고 문서: https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Kline-Candlestick-Data
- Binance USDⓈ-M Futures kline WebSocket provider 참고 문서: https://developers.binance.com/docs/derivatives/usds-margined-futures/websocket-market-streams/Kline-Candlestick-Streams
- OKX API 문서: https://www.okx.com/docs-v5/en/
- Coinbase Advanced Trade public candles 문서: https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rest-api
- Coinbase Advanced Trade WebSocket 문서: https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/websocket/websocket-channels
- OpenAI Responses API 문서: https://platform.openai.com/docs/api-reference/responses
- Gemini API 문서: https://ai.google.dev/api
- Ollama API 문서: https://docs.ollama.com/api

## 현재 구현 상태 메모

- 첫 실제 과거 캔들 adapter로 Binance REST provider를 구현했다.
- 지원 범위는 Binance 현물 `spot`과 Binance USDT 무기한 선물 `linear_perp`의 historical OHLCV다.
- Binance provider 내부에서 현물 endpoint와 선물 endpoint를 분기하며, `MarketDataRouter`와 TradingView datafeed는 여전히 공통 `MarketDataProvider` interface만 호출한다.
- Bybit, OKX, Upbit은 instrument 선택과 registry 구조는 유지하되, 실제 historical OHLCV adapter는 이후 마일스톤에서 추가한다.

## 다음 보강 마일스톤: 보안, 브랜딩, AI/API 연결

- `localhost` 실행 상태와 공개 노출 상태를 구분해 UI와 `/api/system/status`에서 한국어로 안내한다.
- 제품명은 `ChartMind Studio · 차트마인드 스튜디오`를 기본 후보로 사용한다.
- API 키는 브라우저에 저장하지 않고 서버 환경 변수 또는 로컬 전용 임시 메모리 설정만 사용한다.
- AI 연결 registry를 추가해 샘플 응답, OpenAI, Gemini, 로컬 AI를 같은 interface로 교체 가능하게 만든다.
- 거래소 시세 연결 상태를 설정 패널에서 확인할 수 있게 한다.
- Binance는 실제 historical OHLCV provider 연결 상태로 표시하고, static provider 또는 미구현 provider는 준비 중 상태를 명확히 구분한다.
- API/AI 연결 설정은 첫 화면에 두지 않고 `설정` 패널에서 관리한다.
- TradingView Charting Library 원본은 라이선스가 필요한 파일이므로 프로젝트에서 다운로드하거나 커밋하지 않고, 승인받은 파일을 `public/charting_library`에 배치하도록 안내한다.

## 제품 목표

- Binance, Bybit, OKX, Upbit, Coinbase 등 주요 거래소를 선택할 수 있는 개인용 차트 분석 워크스페이스를 만든다.
- 거래소별 현물과 선물/무기한 선물 상품을 선택할 수 있게 한다.
- MVP 데모는 Binance 현물 BTC/USDT에서 시작해 Bybit 선물 BTC/USDT로 전환하는 흐름을 사용한다. 이 데모는 특정 거래소 전용 구조가 아니라 `ExchangeRegistry`와 `ProviderRegistry`가 여러 거래소/시장 유형을 분리하는지 검증하기 위한 대표 시나리오다.
- TradingView Advanced Charts / Charting Library 위에 거래소별 public API 기반 실시간 캔들 차트를 표시한다.
- 사용자가 차트에 그린 추세선과 주요 도형을 구조화 데이터로 인식한다.
- 사용자는 1분할, 2분할, 4분할 멀티 차트를 사용할 수 있다.
- 같은 `instrumentId`를 보는 차트끼리는 인터벌, 지표, 작도 상태를 동기화하고, 서로 다른 `instrumentId`를 보는 차트는 독립적으로 동작한다.
- 사용자가 그린 도형과 AI가 그린 도형을 저장한다.
- 자동 지지/저항, 추세선, 진입가, 손절가, 익절가 후보는 결정론적 엔진이 계산한다.
- AI 채팅은 현재 차트 상태와 선택된 도형을 읽고 롱, 숏, 관망 시나리오를 한국어로 설명한다.
- AI가 제안한 차트 액션은 검토 후 차트 위에 라인으로 표시한다.
- 사용자가 AI 라인을 수정하면 수정된 정보가 저장되고, 이후 AI 분석은 수정된 도형을 기준으로 진행한다.

## 첫 MVP 데모 플로우

1. 앱을 연다.
2. 거래소에서 Binance를 선택한다.
3. 시장 유형에서 현물을 선택한다.
4. BTC/USDT 차트를 연다.
5. 사용자가 추세선을 그린다.
6. 앱이 drawing을 `instrumentId` 기준으로 저장한다.
7. AI에게 “이 선 기준으로 롱/숏 시나리오 짜줘”라고 묻는다.
8. AI가 Binance 현물 BTC/USDT 기준으로 답한다.
9. 사용자가 Bybit 선물 BTC/USDT로 전환한다.
10. Binance 현물에서 그린 선이 Bybit 선물에 나타나지 않는지 확인한다.
11. Bybit 선물 차트에 새 추세선을 그린다.
12. AI에게 다시 묻는다.
13. AI가 Bybit 선물 BTC/USDT 기준으로 답한다.
14. AI가 만든 진입/손절/익절 라인이 Bybit 선물 `instrumentId` 기준으로 저장된다.

### 첫 MVP 데모 완료 기준

- 현물/선물 드로잉이 섞이지 않는다.
- 거래소별 드로잉이 섞이지 않는다.
- 같은 종목을 여러 차트에 열면 인터벌, 지표, 작도 상태가 동기화된다.
- 다른 종목을 열면 각 차트의 인터벌, 지표, 작도 상태가 독립적으로 유지된다.
- AI가 현재 `instrumentId`, `exchange`, `marketType`, `displaySymbol`, `interval` 기준으로만 답한다.
- `chartActions`가 현재 instrument 차트에만 적용된다.

## MVP 제외 범위

- 실제 주문 실행
- 거래소 계정 연결
- 자동매매
- 결제
- 회원가입
- 복잡한 백테스트
- 엘리어트파동
- 하모닉패턴
- 헤드앤숄더 완전 자동 탐지
- 모든 TradingView 지원 거래소를 한 번에 전부 구현
- 거래소 계정이 필요한 비공개 상품 데이터

## 전체 아키텍처

### 핵심 도메인 구조

- `Instrument`가 차트의 기본 식별 단위다.
  - `id`: `{exchange}:{marketType}:{base}/{quote}:{settle?}` 형식의 내부 고유 ID
  - `exchange`: 거래소 ID. 예: `binance`, `bybit`, `okx`, `upbit`, `coinbase`
  - `marketType`: `spot`, `linear_perp`, `inverse_perp`, `dated_future`, `index`, `mark`
  - `symbol`: 거래소 provider 내부에서 쓰는 원본 심볼
  - `displaySymbol`: UI 표시용 심볼
  - `tradingViewTicker`: TradingView datafeed용 ticker
- `ExchangeRegistry`는 거래소 목록, 표시 이름, 지원 시장 유형, instrument catalog를 관리한다.
- `ProviderRegistry`는 구현된 market data provider만 등록한다. 구현되지 않은 거래소는 UI에서 disabled 또는 준비 중 상태로 표시한다.
- `MarketDataProvider` interface는 모든 거래소 adapter가 따라야 하는 공통 계약이다.
  - `loadInstruments(marketType?)`
  - `searchInstruments(query, options?)`
  - `fetchOHLCV(params)`
  - `subscribeOHLCV(params, callback)` 선택 구현
  - `unsubscribeOHLCV(subscriptionId)` 선택 구현
- `MarketDataRouter`는 `instrument.exchange`와 `marketType`을 기준으로 적절한 provider를 선택한다. TradingView datafeed, 분석 API, streaming fallback은 특정 거래소 endpoint를 직접 알지 않는다.
- provider capability는 현재 instrument에서 실제 제공되는 데이터를 UI와 AI context에 전달한다.
  - `historicalOHLCV`
  - `realtimeOHLCV`: `websocket`, `polling`, `unsupported`
  - `orderbook`
  - `trades`
  - `fundingRate`
  - `openInterest`
  - `spot`, `linearPerp`, `inversePerp`
- 실시간 구조는 native WebSocket provider를 우선 사용하고, 없으면 `MarketDataRouter.fetchOHLCV` 기반 polling fallback을 사용한다.
- 드로잉, 기술 분석, AI context, chartActions는 모두 `instrumentId + interval` 기준으로 저장하고 적용한다.

### 클라이언트 영역

- `WorkspaceShell`은 차트, 툴바, 드로잉 목록, AI 채팅 패널을 배치한다.
- `TradingViewChart`는 TradingView 위젯을 마운트하고 커스텀 Datafeed를 연결한다.
- `DrawingPanel`은 사용자가 그린 도형과 AI/엔진 도형 목록을 보여준다.
- `ChatPanel`은 현재 차트 상태와 선택된 도형을 AI 분석 API로 보낸다.
- `ChartActionReview`는 AI가 제안한 차트 액션을 사용자가 검토하고 적용하도록 한다.

### 서버 API 영역

- `/api/markets/exchanges`는 지원 거래소, 시장 유형, provider 활성화 여부를 반환한다.
- `/api/markets/instruments`는 `exchange`, `marketType`, `query`를 기준으로 상품 카탈로그를 반환한다.
- `/api/markets/ohlcv`는 `instrumentId`, `interval`, `from`, `to`, `limit`을 받아 공통 OHLCV bar로 정규화한다.
- `/api/drawings`는 `instrumentId + interval` 기준으로 사용자/엔진/AI 도형을 저장하고 조회한다.
- `/api/analyze`는 `instrumentId`와 `interval`을 받아 결정론적 기술 분석 결과를 반환한다.
- `/api/chat`은 `instrumentId`, `exchange`, `marketType`, `displaySymbol`, `capabilities`, 드로잉, 분석 결과를 받아 현재 차트 기준 응답을 반환한다.

### 도메인 영역

- `market-data`는 거래소 provider registry, 상품 카탈로그, TradingView Datafeed, WebSocket 실시간 구독을 담당한다.
- `drawings`는 TradingView 도형 snapshot, 선택 상태, 소유권, 저장을 담당한다.
- `analysis`는 지표, 지지/저항, 추세선, 리스크 레벨을 계산한다.
- `scenario`는 롱, 숏, 관망 시나리오 후보와 진입가, 손절가, 익절가 후보를 계산한다.
- `chart-actions`는 구조화된 차트 액션을 TradingView 도형으로 변환해 실행한다.

## 데이터 흐름

1. 사용자가 거래소, 마켓 타입, 상품, 인터벌을 선택한다.
2. TradingView Datafeed의 `getBars`가 `/api/markets/ohlcv`를 호출한다.
3. API route는 `MarketDataRouter`를 통해 선택된 instrument의 provider를 호출하고 OHLCV bar로 정규화한다.
4. TradingView Datafeed의 `subscribeBars`는 `streamingRouter`를 호출한다.
5. `streamingRouter`는 native WebSocket provider가 있으면 사용하고, 없으면 polling fallback으로 최신 candle만 갱신한다.
6. 최근 OHLCV 데이터는 `analysisEngine`과 `scenarioEngine`의 입력으로 저장된다.
7. 드로잉 데이터, 분석 결과, 시나리오 후보가 `chartStateSnapshot`으로 합쳐진다.
8. AI 채팅은 snapshot을 받아 시나리오 설명과 차트 액션 후보를 반환한다.

## 차트 흐름

1. 앱은 `defaultInstrument`를 기준으로 첫 차트를 연다. 현재 기본 instrument는 Binance 현물 BTC/USDT 1시간봉이지만, 내부 상태는 `instrumentId`, `exchange`, `marketType`, `tradingViewTicker`, `interval`을 함께 가진다.
2. TradingView 라이선스 번들이 없으면 한국어 안내 상태를 표시한다.
3. 라이선스 번들이 있으면 `TradingView.widget`을 생성한다.
4. 커스텀 Datafeed가 거래소 provider의 OHLCV 데이터를 TradingView bar 형태로 공급한다.
5. 사용자가 거래소, 마켓 타입, 상품 또는 인터벌을 바꾸면 TradingView 심볼과 Datafeed 구독을 함께 갱신한다.
6. 구독 해제와 신규 구독을 명확히 분리해 TradingView time violation을 방지한다.

## 드로잉 흐름

1. 사용자가 TradingView 차트 위에 추세선 또는 도형을 그린다.
2. 앱은 TradingView 저장/불러오기 API, drawing event, autosave snapshot 중 가능한 방식을 사용해 도형 변화를 감지한다.
3. 도형은 `ChartDrawing` 구조로 정규화한다.
4. MVP에서 우선 인식할 도형은 추세선이다.
5. 각 도형은 `source`를 가진다.
   - `user`: 사용자가 직접 만든 도형
   - `engine`: 기술적 분석 엔진이 만든 도형
   - `engine_modified_by_user`: 사용자가 수정한 엔진 도형
   - `ai`: AI 제안 액션으로 만든 도형
6. 사용자가 `engine` 도형을 수정하면 `source`를 `engine_modified_by_user`로 바꾸고 같은 `instrumentId + interval` 안에서 보존한다.
7. 저장 키는 `exchange`, `marketType`, `instrumentId`, `interval`을 포함해 다른 차트와 섞이지 않게 한다.

## AI 분석 흐름

1. 사용자가 AI 채팅에 질문을 입력한다.
2. 앱은 현재 `instrumentId`, 거래소, 마켓 타입, 상품, 인터벌, provider capability, 최신 OHLCV, 실시간 가격, 선택된 도형, 전체 드로잉 요약, 분석 엔진 결과, 시나리오 후보를 snapshot으로 만든다.
3. snapshot은 Zod 스키마 검증을 통과해야 한다.
4. `scenarioEngine`은 롱, 숏, 관망 후보를 먼저 계산한다.
5. 진입가, 손절가, 익절가 숫자는 AI가 임의로 만들지 않는다.
6. AI는 계산된 후보를 설명하고 비교하며, 적용 가능한 chart action을 구조화 JSON으로 반환한다.
7. 앱은 AI 응답을 다시 Zod로 검증한다.
8. 사용자는 제안된 액션을 검토한 뒤 적용하거나 삭제한다.
9. 적용된 라인은 TradingView 도형으로 표시되고 저장된다.

## 구조화 데이터 모델 초안

### ChartDrawing

```ts
type ChartDrawing = {
  id: string;
  instrumentId: string;
  exchange: ExchangeId;
  marketType: MarketType;
  symbol: string;
  interval: ChartInterval | string;
  source: "user" | "engine" | "engine_modified_by_user" | "ai";
  type: "trendline" | "horizontalLine" | "priceZone" | "text";
  points: Array<{ time: number; price: number }>;
  properties: Record<string, string | number | boolean | null>;
  role: "analysis" | "entry" | "stopLoss" | "takeProfit" | "scenario" | "note";
  label?: string;
  userModified: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### ScenarioCandidate

```ts
type ScenarioCandidate = {
  id: string;
  side: "long" | "short" | "wait";
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  confidence: "low" | "medium" | "high";
  invalidationReason: string;
  sourceLevelIds: string[];
  sourceDrawingIds: string[];
};
```

### AiChartAnalysisResponse

```ts
type AiChartAnalysisResponse = {
  summary: string;
  scenarios: Array<{
    scenarioId: string;
    side: "long" | "short" | "wait";
    explanation: string;
    risks: string[];
  }>;
  chartActions: Array<{
    id: string;
    type: "drawEntryLine" | "drawStopLossLine" | "drawTakeProfitLine" | "drawScenarioLabel";
    scenarioId: string;
    price?: number;
    text?: string;
    reason: string;
  }>;
  disclaimer: string;
};
```

## 마일스톤 목록

1. 프로젝트 스캐폴드와 품질 기준
2. TradingView 라이브러리 로더와 기본 차트 화면
3. 다중 거래소 Datafeed와 실시간 캔들
4. 워크스페이스 UI와 거래소/마켓/상품/인터벌 상태
5. 사용자 드로잉 인식과 선택
6. 드로잉 저장과 소유권 우선순위
7. 기술적 분석 엔진
8. 시나리오 엔진과 리스크 레벨 계산
9. 차트 상태 스냅샷
10. AI 채팅 API와 구조화 JSON
11. AI chart action 검토와 차트 라인 표시
12. 통합 데모, 문서화, 최종 QA

## 마일스톤 1: 프로젝트 스캐폴드와 품질 기준

### 1. 목표

빈 저장소에 Next.js + TypeScript 앱을 만들고, 타입 검사, 린트, 단위 테스트, E2E 테스트, 빌드 명령을 준비한다.

### 2. 생성 또는 수정할 파일

- 생성: `/Users/chjmd/Documents/New project/package.json`
- 생성: `/Users/chjmd/Documents/New project/package-lock.json`
- 생성: `/Users/chjmd/Documents/New project/next.config.mjs`
- 생성: `/Users/chjmd/Documents/New project/tsconfig.json`
- 생성: `/Users/chjmd/Documents/New project/eslint.config.mjs`
- 생성: `/Users/chjmd/Documents/New project/vitest.config.ts`
- 생성: `/Users/chjmd/Documents/New project/playwright.config.ts`
- 생성: `/Users/chjmd/Documents/New project/src/app/layout.tsx`
- 생성: `/Users/chjmd/Documents/New project/src/app/page.tsx`
- 생성: `/Users/chjmd/Documents/New project/src/app/globals.css`
- 생성: `/Users/chjmd/Documents/New project/src/test/setup.ts`
- 생성: `/Users/chjmd/Documents/New project/src/test/smoke.test.tsx`
- 생성: `/Users/chjmd/Documents/New project/e2e/home.spec.ts`

### 3. 구현 내용

- Next.js App Router와 strict TypeScript를 설정한다.
- `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e` 스크립트를 추가한다.
- 첫 화면은 `차트 영역`, `AI 분석 패널`, `연결 대기 중` 문구가 보이는 워크스페이스 형태로 만든다.
- 모든 UI 문구는 한국어로 작성한다.
- 스모크 테스트는 홈 화면의 한국어 제목과 기본 영역을 검증한다.

### 4. 완료 기준

- `npm run typecheck`가 통과한다.
- `npm run lint`가 통과한다.
- `npm run test`가 통과한다.
- `npm run build`가 통과한다.
- `npm run test:e2e`가 통과한다.

### 5. 테스트 방법

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

### 6. 위험 요소 또는 가정

- 패키지 설치에는 네트워크 접근이 필요하다.
- Next.js와 React 버전은 구현 시점의 안정 조합을 사용한다.

## 마일스톤 2: TradingView 라이브러리 로더와 기본 차트 화면

### 1. 목표

TradingView Advanced Charts 라이선스 번들을 안전하게 로드하고, 번들이 없을 때도 앱이 깨지지 않도록 안내 화면을 제공한다.

### 2. 생성 또는 수정할 파일

- 생성: `/Users/chjmd/Documents/New project/public/charting_library/.gitkeep`
- 생성: `/Users/chjmd/Documents/New project/src/features/tradingview/charting-library.d.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/tradingview/tradingViewLoader.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/tradingview/TradingViewChart.tsx`
- 생성: `/Users/chjmd/Documents/New project/src/features/tradingview/TradingViewUnavailable.tsx`
- 수정: `/Users/chjmd/Documents/New project/src/app/page.tsx`
- 테스트: `/Users/chjmd/Documents/New project/src/features/tradingview/tradingViewLoader.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/e2e/tradingview-missing-library.spec.ts`

### 3. 구현 내용

- TradingView 접근은 클라이언트 컴포넌트에서만 수행한다.
- `/charting_library/charting_library.standalone.js`를 우선 로드하고, 없으면 `/charting_library/charting_library.js`를 확인한다.
- 기본 차트 설정은 `defaultInstrument.tradingViewTicker`와 `selectedInterval: "60"`으로 시작한다.
- `library_path`는 `/charting_library/`로 설정한다.
- 실제 주문, 브로커 연결, 계좌 관련 기능은 비활성화한다.
- 라이브러리가 없으면 `TradingView 라이브러리 파일을 찾을 수 없습니다` 안내를 표시한다.

### 4. 완료 기준

- 라이브러리 파일이 없어도 앱이 런타임 오류 없이 동작한다.
- 라이선스 번들을 넣으면 `defaultInstrument` 기준 1시간봉 차트 컨테이너가 마운트된다.
- 서버 렌더링 단계에서 `window`를 참조하지 않는다.

### 5. 테스트 방법

```bash
npm run test -- tradingViewLoader
npm run test:e2e -- tradingview-missing-library
npm run build
```

### 6. 위험 요소 또는 가정

- TradingView 배포본 파일명은 라이선스 번들에 따라 다를 수 있다.
- TradingView 라이브러리 파일은 공개 저장소에 커밋하지 않는다.

## 마일스톤 3: 다중 거래소 Datafeed와 실시간 캔들

### 1. 목표

TradingView Datafeed API를 구현하고, 거래소별 public market data provider를 `MarketDataProvider` interface 뒤에 숨겨 현물과 선물/무기한 선물 상품의 과거 캔들과 실시간 캔들을 제공한다.

### 2. 생성 또는 수정할 파일

- 수정: `/Users/chjmd/Documents/New project/src/lib/market/marketDataProvider.ts`
- 수정: `/Users/chjmd/Documents/New project/src/lib/market/marketDataRouter.ts`
- 수정: `/Users/chjmd/Documents/New project/src/lib/market/exchangeRegistry.ts`
- 수정: `/Users/chjmd/Documents/New project/src/lib/market/providerRegistry.ts`
- 수정: `/Users/chjmd/Documents/New project/src/lib/market/exchangeCapabilities.ts`
- 수정: `/Users/chjmd/Documents/New project/src/lib/market/timeframeMapper.ts`
- 수정: `/Users/chjmd/Documents/New project/src/lib/market/streamingRouter.ts`
- 수정: `/Users/chjmd/Documents/New project/src/lib/market/providers/binanceRestProvider.ts`
- 생성 예정: `/Users/chjmd/Documents/New project/src/lib/market/providers/bybitRestProvider.ts`
- 생성 예정: `/Users/chjmd/Documents/New project/src/lib/market/providers/okxRestProvider.ts`
- 생성 예정: `/Users/chjmd/Documents/New project/src/lib/market/providers/upbitRestProvider.ts`
- 수정: `/Users/chjmd/Documents/New project/src/lib/tradingview/datafeed.ts`
- 수정: `/Users/chjmd/Documents/New project/src/lib/tradingview/symbolMapper.ts`
- 수정: `/Users/chjmd/Documents/New project/src/app/api/markets/ohlcv/route.ts`
- 수정: `/Users/chjmd/Documents/New project/src/app/api/markets/instruments/route.ts`
- 수정: `/Users/chjmd/Documents/New project/src/app/api/markets/exchanges/route.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/lib/market/marketDataRouter.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/lib/market/providerRegistry.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/lib/market/exchangeRegistry.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/lib/market/exchangeCapabilities.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/lib/market/providers/binanceRestProvider.test.ts`
- 테스트 예정: `/Users/chjmd/Documents/New project/src/lib/market/providers/bybitRestProvider.test.ts`
- 테스트 예정: `/Users/chjmd/Documents/New project/src/lib/market/providers/okxRestProvider.test.ts`
- 테스트 예정: `/Users/chjmd/Documents/New project/src/lib/market/providers/upbitRestProvider.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/lib/tradingview/datafeed.test.ts`

### 3. 구현 내용

- 공통 시장 모델을 정의한다.
  - `exchange`: `ExchangeId` 문자열. 예: `binance`, `okx`, `coinbase`
  - `marketType`: `spot`, `linear_perp`, `inverse_perp`, `dated_future`, `index`, `mark`
  - `instrumentId`: `{exchange}:{marketType}:{base}/{quote}:{settle?}` 형식의 내부 고유 상품 ID
  - `displaySymbol`: UI 표시용 심볼
  - `tradingViewTicker`: TradingView Datafeed용 ticker
- 상품 카탈로그는 `Instrument[]`로 관리한다. BTC/USDT, ETH/USDT, BTC/KRW 같은 상품은 초기 검증용 instrument일 뿐이며, 지원 범위는 provider capability와 registry 설정으로 확장한다.
- 같은 표시 심볼이라도 거래소와 시장 유형이 다르면 별도 instrument다.
- `tradingViewTicker`는 거래소와 마켓 타입을 구분할 수 있게 만든다.
  - `BINANCE:SPOT:BTCUSDT`
  - `BINANCE:PERP:BTCUSDT`
  - `OKX:SPOT:BTCUSDT`
  - `OKX:PERP:BTCUSDT`
  - `COINBASE:SPOT:BTCUSD`
- 지원 인터벌은 provider capability로 관리한다. 현재 내부 interval은 `1`, `3`, `5`, `15`, `30`, `60`, `240`, `1D`, `1W`다.
- TradingView resolution과 거래소별 interval은 provider 또는 timeframe mapper 내부에서 매핑한다.
  - `1` -> `1m`
  - `5` -> `5m`
  - `15` -> `15m`
  - `60` -> `1h`
  - `240` -> `4h`
  - `1D` -> `1d`
- Datafeed 메서드 `onReady`, `searchSymbols`, `resolveSymbol`, `getBars`, `subscribeBars`, `unsubscribeBars`를 구현한다.
- `searchSymbols`는 거래소, 마켓 타입, 상품명으로 검색한다.
- `resolveSymbol`은 TradingView ticker를 내부 `instrumentId`로 복원하고, `Instrument` metadata로 `LibrarySymbolInfo`를 구성한다.
- `getBars`는 `/api/markets/ohlcv`를 통해 provider registry에서 선택된 거래소의 REST kline API를 호출한다.
- `subscribeBars`는 `streamingRouter`를 호출한다. native WebSocket provider가 없으면 polling fallback을 사용한다.
- 오래된 구독이 새 차트에 bar를 보내지 않도록 subscriber UID별로 구독을 관리한다.
- UI와 AI context에는 provider capability를 표시한다.

### 4. 완료 기준

- `Instrument` catalog에 있는 여러 거래소/시장 유형 상품이 검색된다.
- Binance 현물과 Binance USDT 무기한 선물은 실제 historical OHLCV를 로드한다.
- 아직 REST provider가 없는 instrument는 한국어 안내 또는 capability 미지원 상태로 표시된다.
- 실시간 provider가 있는 instrument는 WebSocket으로 현재 bar를 갱신하고, 없는 instrument는 polling fallback으로 최신 bar를 갱신한다.
- 거래소, 마켓 타입, 상품 또는 인터벌 전환 시 time violation 오류가 발생하지 않는다.

### 5. 테스트 방법

```bash
npm run test -- timeframeMapper providerRegistry exchangeRegistry exchangeCapabilities marketDataRouter datafeed binanceRestProvider
npm run typecheck
```

수동 확인:

```bash
npm run dev
```

브라우저에서 Binance 현물 BTC/USDT, Binance USDT 무기한 선물 BTC/USDT, Bybit 선물 BTC/USDT, OKX 현물 ETH/USDT, Upbit 현물 BTC/KRW를 전환한다. 각 instrument의 capability, 과거 캔들 지원 여부, 실시간 방식 표시가 맞는지 확인한다.

### 6. 위험 요소 또는 가정

- 거래소별 REST/WebSocket 형식, 심볼 표기, 마켓 타입 명칭, 요청 제한이 서로 다르다.
- TradingView Charting Library는 market data를 제공하지 않으므로 우리가 구현한 provider 범위 밖의 거래소는 표시할 수 없다.
- 각 거래소 public API 요청 제한을 고려해야 한다.
- WebSocket 연결이 끊길 수 있으므로 재연결 상태를 UI에 표시해야 한다.
- 계정 연결이 필요한 비공개 선물 데이터는 MVP에서 제외한다.

## 마일스톤 4: 워크스페이스 UI와 거래소/마켓/상품/인터벌 상태

### 1. 목표

차트, 거래소 선택, 마켓 타입 선택, 상품 선택, 인터벌 선택, 연결 상태, 드로잉 목록, AI 채팅 패널을 갖춘 워크스페이스 UI를 만든다.

### 2. 생성 또는 수정할 파일

- 생성: `/Users/chjmd/Documents/New project/src/features/workspace/WorkspaceShell.tsx`
- 생성: `/Users/chjmd/Documents/New project/src/features/workspace/WorkspaceToolbar.tsx`
- 생성: `/Users/chjmd/Documents/New project/src/features/workspace/workspaceStore.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/workspace/workspaceTypes.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/chat/ChatPanel.tsx`
- 생성: `/Users/chjmd/Documents/New project/src/features/drawings/DrawingPanel.tsx`
- 수정: `/Users/chjmd/Documents/New project/src/app/page.tsx`
- 수정: `/Users/chjmd/Documents/New project/src/app/globals.css`
- 테스트: `/Users/chjmd/Documents/New project/src/features/workspace/workspaceStore.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/e2e/workspace-shell.spec.ts`

### 3. 구현 내용

- 툴바에는 `거래소`, `마켓`, `상품`, `인터벌`, `연결 상태`, `분석 새로고침`을 표시한다.
- 거래소 선택지는 `ExchangeRegistry`에서 가져온다. 현재 예시는 Binance, Bybit, OKX, Upbit, Coinbase, Bitget이다.
- 마켓 타입 선택지는 `현물`, `USDT/USDC 무기한 선물`, `코인 무기한 선물`, `만기 선물`을 제공하되, 거래소 provider가 지원하지 않는 조합은 비활성화한다.
- 상품 선택지는 선택된 거래소와 마켓 타입의 카탈로그에서 가져온다.
- 인터벌 선택지는 provider capability에 따라 활성/비활성 처리한다.
- 현재 선택한 instrument의 provider capability를 표시한다. 예: 과거 캔들, 실시간 WebSocket/Polling/미지원, 펀딩비 지원 예정, 미결제약정 미지원.
- AI 패널은 접기와 펼치기를 지원한다.
- 드로잉 패널은 아직 실제 도형이 없을 때 `감지된 도형이 없습니다`를 표시한다.

### 4. 완료 기준

- 기본 화면에 `defaultInstrument` 기준 거래소, 시장 유형, 상품, 인터벌 상태가 표시된다.
- 거래소, 마켓 타입, 상품, 인터벌 선택이 workspace state를 변경한다.
- 차트 컴포넌트가 선택된 `Instrument`와 인터벌을 전달받는다.
- AI 패널과 드로잉 패널이 한국어 문구로 표시된다.

### 5. 테스트 방법

```bash
npm run test -- workspaceStore
npm run test:e2e -- workspace-shell
npm run build
```

### 6. 위험 요소 또는 가정

- TradingView 자체 Symbol Search와 앱 MarketSelector 상태가 충돌하지 않도록 `tradingViewTicker`를 `Instrument`로 복원해 동기화한다.
- 거래소별 지원 마켓 타입과 상품 수가 다르므로 빈 상태와 비활성 상태 문구를 한국어로 명확히 표시한다.

## 마일스톤 5: 사용자 드로잉 인식과 선택

### 1. 목표

사용자가 차트에 그린 추세선을 구조화 데이터로 인식하고, 드로잉 패널에서 선택할 수 있게 한다.

### 2. 생성 또는 수정할 파일

- 생성: `/Users/chjmd/Documents/New project/src/features/drawings/drawingTypes.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/drawings/drawingSnapshot.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/drawings/drawingSelection.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/drawings/useDrawingDetection.ts`
- 수정: `/Users/chjmd/Documents/New project/src/features/drawings/DrawingPanel.tsx`
- 수정: `/Users/chjmd/Documents/New project/src/features/tradingview/TradingViewChart.tsx`
- 테스트: `/Users/chjmd/Documents/New project/src/features/drawings/drawingSnapshot.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/features/drawings/drawingSelection.test.ts`

### 3. 구현 내용

- MVP에서 우선 인식할 도형은 추세선이다.
- 감지한 추세선은 `drawingBridge`를 통해 현재 `instrumentId`, `exchange`, `marketType`, `symbol`, `interval`, `source`, `points`를 가진 `ChartDrawing`으로 정규화한다.
- TradingView drawing event를 사용할 수 있으면 우선 사용한다.
- drawing event가 부족하면 autosave snapshot 비교를 fallback으로 사용한다.
- 사용자가 드로잉 패널에서 도형을 선택하면 `selected: true`로 표시한다.
- 선택된 도형은 AI snapshot에 포함한다.

### 4. 완료 기준

- 사용자가 현재 선택된 instrument 차트에 추세선을 그릴 수 있다.
- 앱이 추세선을 구조화 데이터로 인식한다.
- 드로잉 패널에서 도형을 선택할 수 있다.
- 선택된 도형 ID가 workspace state에 저장된다.

### 5. 테스트 방법

```bash
npm run test -- drawingSnapshot drawingSelection
npm run typecheck
```

수동 확인:

```bash
npm run dev
```

서로 다른 거래소/시장 유형의 BTC/USDT 차트에서 추세선을 그리고, 각 드로잉이 해당 `instrumentId + interval`에만 표시되는지 확인한다.

### 6. 위험 요소 또는 가정

- TradingView 도형 이벤트 API는 라이선스 빌드와 기능 세트에 따라 다를 수 있다.
- 도형 좌표 추출이 제한되면 저장 snapshot에서 추세선 payload를 정규화해야 한다.

## 마일스톤 6: 드로잉 저장과 소유권 우선순위

### 1. 목표

사용자 도형과 AI/엔진 도형을 저장하고, 사용자 수정 도형이 항상 자동 도형보다 우선하도록 만든다.

### 2. 생성 또는 수정할 파일

- 생성: `/Users/chjmd/Documents/New project/src/features/drawings/drawingRepository.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/drawings/drawingOwnership.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/drawings/useDrawingPersistence.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/persistence/localStorageRepository.ts`
- 수정: `/Users/chjmd/Documents/New project/src/features/drawings/drawingTypes.ts`
- 수정: `/Users/chjmd/Documents/New project/src/features/tradingview/TradingViewChart.tsx`
- 테스트: `/Users/chjmd/Documents/New project/src/features/drawings/drawingRepository.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/features/drawings/drawingOwnership.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/features/persistence/localStorageRepository.test.ts`

### 3. 구현 내용

- localStorage 키는 `trading-workspace:drawings:v1:{exchange}:{marketType}:{instrumentId}:{interval}` 형식으로 사용한다.
- 도형 `source`는 `user`, `engine`, `engine_modified_by_user`, `ai` 중 하나다.
- 사용자가 `engine` 도형을 수정하면 `source`를 `engine_modified_by_user`로 바꾸고, 이후 재분석에서도 같은 `instrumentId + interval` 안에서 보존한다.
- 엔진과 AI는 사용자가 만든 도형과 사용자가 수정한 자동 도형을 덮어쓸 수 없다.
- 손상된 localStorage 데이터는 앱을 크래시시키지 않고 한국어 오류 상태로 처리한다.

### 4. 완료 기준

- 사용자가 그린 추세선이 새로고침 후에도 복원된다.
- AI가 만든 라인을 사용자가 수정하면 사용자 소유로 바뀐다.
- 이후 AI 분석은 수정된 도형을 기준으로 진행한다.
- 같은 BTC/USDT라도 거래소와 시장 유형이 다르면 저장 도형이 섞이지 않는다.

### 5. 테스트 방법

```bash
npm run test -- drawingRepository drawingOwnership localStorageRepository
npm run typecheck
```

수동 확인:

```bash
npm run dev
```

AI 라인 또는 테스트용 자동 라인을 수정한 뒤 새로고침해 수정 상태가 저장되는지 확인한다.

### 6. 위험 요소 또는 가정

- localStorage는 MVP용 저장소이며, 장기적으로 서버 저장소가 필요할 수 있다.
- TradingView 내부 도형 ID가 매번 달라질 수 있으므로 별도 stable ID 매핑이 필요하다.

## 마일스톤 7: 기술적 분석 엔진

### 1. 목표

OHLCV와 사용자 드로잉을 기반으로 자동 지지/저항과 추세선을 계산하는 결정론적 분석 엔진을 만든다.

### 2. 생성 또는 수정할 파일

- 생성: `/Users/chjmd/Documents/New project/src/features/analysis/analysisTypes.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/analysis/indicatorMath.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/analysis/pivots.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/analysis/supportResistance.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/analysis/trendlines.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/analysis/analysisEngine.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/analysis/fixtures/binance-spot-btcusdt-1h.sample.json`
- 테스트: `/Users/chjmd/Documents/New project/src/features/analysis/indicatorMath.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/features/analysis/pivots.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/features/analysis/supportResistance.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/features/analysis/trendlines.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/features/analysis/analysisEngine.test.ts`

### 3. 구현 내용

- SMA 20, EMA 20, RSI 14, ATR 14를 구현한다.
- pivot high와 pivot low를 감지한다.
- pivot clustering으로 지지/저항 가격대를 계산한다.
- pivot low는 상승 추세선 후보, pivot high는 하락 추세선 후보에 사용한다.
- 사용자 추세선이 있으면 자동 추세선보다 높은 우선순위로 분석 결과에 포함한다.
- 모든 결과는 같은 입력에 대해 같은 결과를 반환해야 한다.

### 4. 완료 기준

- 분석 엔진은 네트워크와 TradingView에 의존하지 않는다.
- 같은 OHLCV 입력은 같은 분석 결과를 반환한다.
- 자동 지지/저항에는 가격, 강도, 접촉 횟수가 포함된다.
- 자동 추세선에는 시작점, 끝점, 기울기, 강도가 포함된다.

### 5. 테스트 방법

```bash
npm run test -- indicatorMath pivots supportResistance trendlines analysisEngine
npm run typecheck
```

### 6. 위험 요소 또는 가정

- 기술적 분석 결과는 투자 조언이 아니다.
- 헤드앤숄더 완전 자동 탐지, 엘리어트파동, 하모닉패턴은 제외한다.

## 마일스톤 8: 시나리오 엔진과 리스크 레벨 계산

### 1. 목표

롱, 숏, 관망 시나리오 후보와 진입가, 손절가, 익절가 후보를 AI가 아닌 결정론적 엔진에서 계산한다.

### 2. 생성 또는 수정할 파일

- 생성: `/Users/chjmd/Documents/New project/src/features/scenario/scenarioTypes.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/scenario/riskReward.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/scenario/scenarioEngine.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/scenario/scenarioSchema.ts`
- 수정: `/Users/chjmd/Documents/New project/src/features/analysis/analysisTypes.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/features/scenario/riskReward.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/features/scenario/scenarioEngine.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/features/scenario/scenarioSchema.test.ts`

### 3. 구현 내용

- `ScenarioCandidate` 타입을 정의한다.
- 롱 시나리오는 가까운 지지선, 상승 추세선, 현재가, ATR을 사용해 후보를 계산한다.
- 숏 시나리오는 가까운 저항선, 하락 추세선, 현재가, ATR을 사용해 후보를 계산한다.
- 관망 시나리오는 현재가가 주요 레벨 사이에 있거나 리스크 보상이 낮을 때 생성한다.
- 손절가는 invalidation level 기준으로 계산한다.
- 익절가는 다음 주요 지지/저항 또는 최소 risk/reward 기준으로 계산한다.
- AI는 이 숫자를 변경할 수 없고, scenario ID를 참조만 한다.

### 4. 완료 기준

- 롱, 숏, 관망 시나리오가 구조화 데이터로 생성된다.
- 진입가, 손절가, 익절가 후보가 숫자로 포함된다.
- 각 숫자에는 근거가 되는 분석 레벨 또는 사용자 도형 ID가 연결된다.
- AI가 임의 숫자를 만들 수 없도록 스키마와 검증 규칙이 정의된다.

### 5. 테스트 방법

```bash
npm run test -- riskReward scenarioEngine scenarioSchema
npm run typecheck
```

### 6. 위험 요소 또는 가정

- 시나리오 엔진은 매매 추천 엔진이 아니라 차트 분석 보조 도구다.
- 리스크 보상 규칙은 MVP용 단순 규칙이며 추후 조정될 수 있다.

## 마일스톤 9: 차트 상태 스냅샷

### 1. 목표

AI가 이미지 대신 구조화 데이터를 읽도록 현재 차트 상태 스냅샷을 만든다.

### 2. 생성 또는 수정할 파일

- 생성: `/Users/chjmd/Documents/New project/src/features/chart-state/chartStateTypes.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/chart-state/chartStateSnapshot.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/chart-state/chartStateSchema.ts`
- 수정: `/Users/chjmd/Documents/New project/src/features/workspace/workspaceStore.ts`
- 수정: `/Users/chjmd/Documents/New project/src/features/chat/ChatPanel.tsx`
- 테스트: `/Users/chjmd/Documents/New project/src/features/chart-state/chartStateSnapshot.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/features/chart-state/chartStateSchema.test.ts`

### 3. 구현 내용

- snapshot에는 `instrumentId`, 거래소, 마켓 타입, 상품, 인터벌, provider capability, 최신 가격, 최근 OHLCV, 선택된 도형, 전체 도형 요약, 분석 결과, 시나리오 후보를 포함한다.
- OHLCV는 최대 500개로 제한한다.
- TradingView 전체 layout payload는 AI에 보내지 않는다.
- snapshot은 Zod로 검증한다.
- 선택된 도형이 있으면 AI 요청에서 강조한다.

### 4. 완료 기준

- snapshot은 차트 이미지를 포함하지 않는다.
- 선택된 추세선과 현재 instrument 상태가 함께 AI 요청에 포함된다.
- 잘못된 snapshot은 AI API 호출 전에 거절된다.

### 5. 테스트 방법

```bash
npm run test -- chartStateSnapshot chartStateSchema
npm run typecheck
```

### 6. 위험 요소 또는 가정

- TradingView 위젯 준비 전에는 visible range가 없을 수 있으므로 null을 허용한다.

## 마일스톤 10: AI 채팅 API와 구조화 JSON

### 1. 목표

차트 상태 snapshot을 받아 롱, 숏, 관망 시나리오 설명과 차트 액션 후보를 구조화 JSON으로 반환하는 AI API를 만든다.

### 2. 생성 또는 수정할 파일

- 생성 또는 수정: `/Users/chjmd/Documents/New project/src/lib/types/ai.ts`
- 생성 또는 수정: `/Users/chjmd/Documents/New project/src/lib/ai/systemPrompt.ts`
- 생성 또는 수정: `/Users/chjmd/Documents/New project/src/lib/ai/chartContext.ts`
- 생성 예정: `/Users/chjmd/Documents/New project/src/lib/ai/aiSchemas.ts`
- 생성 예정: `/Users/chjmd/Documents/New project/src/lib/ai/aiProvider.ts`
- 생성 또는 수정: `/Users/chjmd/Documents/New project/src/app/api/chat/route.ts`
- 수정: `/Users/chjmd/Documents/New project/src/components/AiChatPanel.tsx`
- 테스트: `/Users/chjmd/Documents/New project/src/lib/ai/chartContext.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/lib/ai/systemPrompt.test.ts`
- 테스트 예정: `/Users/chjmd/Documents/New project/src/lib/ai/aiSchemas.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/app/api/chat/route.test.ts`

### 3. 구현 내용

- AI 응답은 `summary`, `scenarios`, `chartActions`, `disclaimer`를 포함한다.
- `chartActions`는 `scenarioId`를 참조해야 한다.
- `drawEntryLine`, `drawStopLossLine`, `drawTakeProfitLine`, `drawScenarioLabel` 액션만 허용한다.
- AI 응답의 가격이 scenario engine의 가격과 다르면 응답을 거절한다.
- 샘플 응답 연결은 테스트용 고정 JSON을 반환한다.
- OpenAI 연결은 `OPENAI_API_KEY`가 있을 때만 사용한다.
- Gemini 연결은 `GEMINI_API_KEY`가 있을 때만 사용한다.
- 로컬 AI 연결은 `LOCAL_LLM_BASE_URL`과 `LOCAL_LLM_MODEL`을 기준으로 테스트할 수 있게 한다.
- 시스템 프롬프트는 한국어 응답, 이미지 분석 금지, 임의 숫자 생성 금지, 실제 주문 지시 금지를 명시한다.
- 시스템 프롬프트는 같은 표시 심볼이라도 거래소와 시장 유형이 다르면 다른 차트로 취급하도록 명시한다.
- provider capability가 없거나 unavailable인 데이터는 추측하지 않는다.

### 4. 완료 기준

- AI API는 구조화 JSON만 반환한다.
- 샘플 응답 연결로 롱, 숏, 관망 응답을 받을 수 있다.
- 잘못된 JSON 또는 임의 가격 응답은 거절된다.
- UI에는 한국어 분석 결과가 표시된다.

### 5. 테스트 방법

```bash
npm run test -- aiSchemas chart-analysis
npm run typecheck
```

수동 확인:

```bash
npm run dev
```

AI 패널에서 `선택한 추세선을 기준으로 시나리오를 분석해줘`라고 입력한다.

### 6. 위험 요소 또는 가정

- OpenAI structured output 사용법은 구현 시점에 공식 문서로 다시 확인한다.
- AI 응답은 투자 조언이 아니라 차트 분석 보조 설명이다.

## 마일스톤 11: AI chart action 검토와 차트 라인 표시

### 1. 목표

AI가 제안한 진입가, 손절가, 익절가 액션을 사용자가 검토한 뒤 TradingView 차트 위에 라인으로 표시한다.

### 2. 생성 또는 수정할 파일

- 생성: `/Users/chjmd/Documents/New project/src/features/chart-actions/chartActionTypes.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/chart-actions/chartActionExecutor.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/chart-actions/useChartActions.ts`
- 생성: `/Users/chjmd/Documents/New project/src/features/chat/ChartActionReview.tsx`
- 수정: `/Users/chjmd/Documents/New project/src/features/chat/ChatPanel.tsx`
- 수정: `/Users/chjmd/Documents/New project/src/features/drawings/drawingOwnership.ts`
- 수정: `/Users/chjmd/Documents/New project/src/features/tradingview/TradingViewChart.tsx`
- 테스트: `/Users/chjmd/Documents/New project/src/features/chart-actions/chartActionExecutor.test.ts`
- 테스트: `/Users/chjmd/Documents/New project/src/features/chat/ChartActionReview.test.tsx`
- 테스트: `/Users/chjmd/Documents/New project/e2e/ai-action-review.spec.ts`

### 3. 구현 내용

- AI action은 자동 적용하지 않고 검토 목록에 표시한다.
- 버튼 문구는 `적용`, `삭제`로 작성한다.
- 적용 시 진입가는 파란색, 손절가는 빨간색, 익절가는 초록색 라인으로 표시한다.
- 생성된 라인은 현재 `instrumentId + interval`의 `source: ai` 도형으로 저장한다.
- 사용자가 자동 라인을 수정하면 사용자 수정본으로 보존하고, 이후 재분석이나 재제안이 같은 `instrumentId + interval` 밖의 도형을 건드리지 않게 한다.
- 이후 AI 분석은 수정된 라인을 snapshot에 포함한다.

### 4. 완료 기준

- AI가 제안한 진입가, 손절가, 익절가 라인을 차트에 표시할 수 있다.
- 삭제한 action은 차트를 변경하지 않는다.
- 사용자가 AI 라인을 수정하면 수정된 값이 저장된다.
- AI action은 사용자 소유 도형을 덮어쓸 수 없다.
- AI action은 action의 `instrumentId`, `exchange`, `marketType`, `interval`이 현재 차트와 일치할 때만 적용된다.

### 5. 테스트 방법

```bash
npm run test -- chartActionExecutor ChartActionReview drawingOwnership
npm run test:e2e -- ai-action-review
npm run typecheck
```

### 6. 위험 요소 또는 가정

- TradingView line tool 생성 API는 라이선스 빌드에서 실제 동작을 확인해야 한다.
- 시각적 검증은 TradingView 라이선스 번들이 있는 환경에서 수행한다.

## 마일스톤 12: 통합 데모, 문서화, 최종 QA

### 1. 목표

MVP 데모 흐름을 끝까지 검증하고, 한국어 README와 테스트 문서를 작성한다.

### 2. 생성 또는 수정할 파일

- 생성: `/Users/chjmd/Documents/New project/README.md`
- 생성: `/Users/chjmd/Documents/New project/.env.example`
- 생성: `/Users/chjmd/Documents/New project/docs/architecture.md`
- 생성: `/Users/chjmd/Documents/New project/docs/tradingview-library-setup.md`
- 생성: `/Users/chjmd/Documents/New project/docs/mvp-demo-test-plan.md`
- 수정: `/Users/chjmd/Documents/New project/PLANS.md`
- 테스트: `/Users/chjmd/Documents/New project/e2e/full-mvp-demo.spec.ts`

### 3. 구현 내용

- README는 설치, 실행, 테스트, TradingView 라이브러리 배치, 거래소별 public market data provider 범위, 샘플 응답/OpenAI/Gemini/로컬 AI 연결 모드, MVP 제외 범위를 한국어로 설명한다.
- `docs/architecture.md`는 데이터 흐름, 차트 흐름, 드로잉 흐름, AI 분석 흐름을 설명한다.
- `docs/mvp-demo-test-plan.md`는 10개 MVP 데모 목표를 수동 검증 체크리스트로 작성한다.
- 전체 E2E는 샘플 AI 응답을 사용한다.
- 최종 QA에서 모든 UI 문구와 문서가 한국어인지 확인한다.

### 4. 완료 기준

- `defaultInstrument` 1시간봉 차트가 표시된다.
- 사용자가 거래소, 마켓 타입, 상품, 인터벌을 선택할 수 있다.
- 사용자가 추세선을 그리고 선택할 수 있다.
- AI가 선택된 도형과 현재 instrument 상태를 받아 롱, 숏, 관망 시나리오를 반환한다.
- AI가 제안한 진입가, 손절가, 익절가 라인을 차트에 표시할 수 있다.
- 사용자가 수정한 AI 라인이 저장되고 다음 AI 분석에 반영된다.
- 전체 테스트와 빌드가 통과한다.

### 5. 테스트 방법

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

### 6. 위험 요소 또는 가정

- TradingView 실제 렌더링과 도형 조작은 라이선스 번들이 있어야 완전 검증할 수 있다.
- 거래소별 실시간 WebSocket 검증은 네트워크 상태와 각 거래소 API 상태에 영향을 받는다.
- AI OpenAI 모드는 API 키와 현재 공식 API 사용법 확인이 필요하다.

## 현재 가장 먼저 해야 할 작업

다음 Codex 세션은 마일스톤 3의 provider 확장을 이어간다.

1. `src/lib/market/providers/bybitRestProvider.ts`와 테스트를 추가한다.
2. Bybit `spot`, `linear_perp` historical OHLCV를 `MarketDataProvider` interface로 정규화한다.
3. `ProviderRegistry`에 Bybit REST provider를 등록하되, TradingView datafeed와 `/api/markets/ohlcv`는 계속 `MarketDataRouter`만 호출하게 유지한다.
4. provider capability에서 Bybit historical OHLCV 지원 상태를 실제 구현 범위에 맞게 갱신한다.
5. Binance 현물, Binance 선물, Bybit 현물, Bybit 선물 간 차트 전환 시 드로잉, AI context, chartActions가 `instrumentId + interval` 기준으로 분리되는지 테스트한다.

## 요구사항 반영 확인

- Next.js + TypeScript 사용: 마일스톤 1
- TradingView Advanced Charts / Charting Library 사용: 마일스톤 2
- 다중 거래소 public market data provider 구조: 핵심 도메인 구조, 마일스톤 3
- `MarketDataProvider` interface: 핵심 도메인 구조, 마일스톤 3
- `MarketDataRouter`: 핵심 도메인 구조, 데이터 흐름, 마일스톤 3
- `ExchangeRegistry`: 핵심 도메인 구조, 마일스톤 3, 4
- `ProviderRegistry`: 핵심 도메인 구조, 마일스톤 3
- `Instrument` 중심 구조: 핵심 도메인 구조, 구조화 데이터 모델, 마일스톤 3, 4
- 현물과 선물/무기한 선물 선택 구조: 마일스톤 3, 4
- 거래소별 상품 catalog와 instrument 검색: 마일스톤 3, 4
- 지원 interval `1m`, `5m`, `15m`, `1h`, `4h`, `1D`: 마일스톤 3, 4
- 실시간 provider와 polling fallback: 핵심 도메인 구조, 데이터 흐름, 마일스톤 3
- provider capability 표시: 핵심 도메인 구조, 마일스톤 3, 4, 9, 10
- 사용자가 차트에 그린 도형 인식: 마일스톤 5
- `instrumentId + interval` 기준 도형 저장: 드로잉 흐름, 마일스톤 6
- 기술적 분석 엔진 구현: 마일스톤 7
- 자동 지지/저항, 추세선 탐지: 마일스톤 7
- AI 채팅 패널 구현: 마일스톤 4, 10
- `instrumentId` 기준 AI context: AI 분석 흐름, 마일스톤 9, 10
- AI가 현재 차트 상태와 도형을 읽고 시나리오 생성: 마일스톤 9, 10
- AI가 진입가, 손절가, 익절가 차트 액션을 생성하고 표시: 마일스톤 8, 10, 11
- 차트 이미지 캡처 분석 금지: 데이터 흐름, AI 분석 흐름, 마일스톤 9
- AI 임의 숫자 생성 금지: 마일스톤 8, 10
- 사용자 도형 우선: 마일스톤 6, 11
- 구조화 JSON 응답: 마일스톤 10
- TradingView 라이브러리 파일 공개 저장소 제외: 공통 작업 지시문, 마일스톤 2, 12
