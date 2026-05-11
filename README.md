# ChartMind Studio

차트마인드 스튜디오는 개인용 AI 보조 트레이딩 차트 분석 워크스페이스입니다. 현재 단계에서는 Next.js + TypeScript 기반 앱 구조, TradingView Charting Library 연결 지점, 거래소 비종속 market data 추상화, 연결 설정 패널, 기본 AI 패널 자리 표시 영역을 준비했습니다.

## 현재 구조

- `src/app`: App Router 기반 화면 진입점
- `src/components/ChartWorkspace.tsx`: 왼쪽 차트 워크스페이스 영역
- `src/components/TradingViewChart.tsx`: TradingView widget 초기화와 라이브러리 누락 안내
- `src/components/AiChatPanel.tsx`: 오른쪽 AI 채팅 패널 영역
- `src/components/ConnectionSettingsPanel.tsx`: AI 연결과 거래소 시세 연결 상태 표시 영역
- `src/components/PreferencesPanel.tsx`: API 키, 클라우드 AI, 로컬 AI, TradingView 라이브러리 안내를 모아두는 설정 패널
- `src/components/ScenarioPanel.tsx`: 이후 롱, 숏, 관망 시나리오를 표시할 영역
- `src/lib/config/appBrand.ts`: 제품명과 한국어 설명 문구
- `src/lib/security/accessPolicy.ts`: 로컬, 사설망, 공개 주소 접근 범위 판정
- `src/lib/connections`: AI/API 연결 상태 타입
- `src/lib/types`: 시장, 도형, AI 관련 TypeScript 타입
- `src/lib/market`: 거래소 provider를 라우팅하는 market data 추상화
- `src/lib/market/providerRegistry.ts`: 구현된 거래소 provider 등록소
- `src/lib/market/exchangeRegistry.ts`: 지원 거래소와 시장 유형 설정
- `src/lib/tradingview`: TradingView datafeed, 타입, 심볼 매핑 유틸
- `src/store/chartStore.ts`: 선택된 거래소, 시장 유형, 상품, 인터벌, 현재 가격, 선택된 도형 ID 상태 관리

## 현재 화면

화면은 좌우 2단 구조입니다.

- 왼쪽: TradingView 차트 워크스페이스 영역
- 오른쪽: AI 채팅 자리 표시 영역과 시나리오 자리 표시 영역

차트 워크스페이스는 `1분할`, `2분할`, `4분할` 멀티 차트를 지원합니다. 같은 instrument를 여러 차트에 열어두면 인터벌, 선택 도형, 지표 상태를 함께 맞추고, 서로 다른 instrument를 보고 있으면 독립적으로 동작합니다. AI 채팅은 현재 선택된 활성 차트 기준으로만 분석합니다.

`public/charting_library` 경로에 TradingView Charting Library 파일이 없으면 화면에 한국어 안내 문구를 표시합니다. 라이브러리 원본 파일은 저장소에 포함하지 않습니다.

거래소 목록은 registry 설정에서 가져오며, 아직 실제 시세 연결이 구현되지 않은 거래소는 준비 중 상태로 표시합니다.

MarketSelector는 현재 선택한 instrument의 데이터 제공 범위도 함께 보여줍니다. 사용자는 과거 캔들, 빠른 실시간 갱신 또는 주기적 갱신, 호가창, 체결, 펀딩비, 미결제약정 지원 여부를 차트 전환 전에 확인할 수 있습니다.

상단 헤더에는 `ChartMind Studio · 차트마인드 스튜디오` 제품명이 표시됩니다. API 키와 AI 연결 설정은 첫 화면이 아니라 오른쪽 위 `설정` 버튼 안에 모았습니다. 설정 패널에서 OpenAI, Gemini, Ollama, OpenAI 호환 로컬 AI 연결 상태와 거래소 시세 연결 상태를 확인할 수 있습니다.

## 로컬 주소와 보안

`http://localhost:3000`은 기본적으로 내 컴퓨터 안에서 접근하는 개발 주소입니다. 포트포워딩, 터널링, 공개 배포를 하지 않았다면 일반 인터넷 사용자에게 공개되지 않습니다.

다만 AI API 키, 거래소 API 키, 외부 데이터 연결 키를 사용할 때는 다음 원칙을 지킵니다.

- API 키를 브라우저 localStorage에 저장하지 않습니다.
- 기본 연결 방식은 서버 환경 변수입니다.
- 로컬 전용 임시 입력 기능을 추가하더라도 프로세스 메모리 안에서만 유지하고 새로고침 또는 재시작 후 사라지게 합니다.
- 공개 배포 전에는 인증, rate limit, CORS, CSRF, 로그 마스킹을 별도 마일스톤으로 추가합니다.

현재 `/api/system/status`는 요청 host를 기준으로 `local`, `lan`, `public`, `unknown` 접근 범위를 반환합니다. `localhost`, `127.0.0.1`, `::1`은 `local`이며, `10.x`, `172.16-31.x`, `192.168.x`는 같은 네트워크에서 접근될 수 있는 `lan`으로 봅니다.

## 첫 MVP 데모 플로우

1. 앱을 엽니다.
2. 거래소에서 Binance를 선택합니다.
3. 시장 유형에서 현물을 선택합니다.
4. BTC/USDT 차트를 엽니다.
5. 사용자가 추세선을 그립니다.
6. 앱이 drawing을 `instrumentId` 기준으로 저장합니다.
7. AI에게 “이 선 기준으로 롱/숏 시나리오 짜줘”라고 묻습니다.
8. AI가 Binance 현물 BTC/USDT 기준으로 답합니다.
9. 사용자가 Bybit 선물 BTC/USDT로 전환합니다.
10. Binance 현물에서 그린 선이 Bybit 선물에 나타나지 않는지 확인합니다.
11. Bybit 선물 차트에 새 추세선을 그립니다.
12. AI에게 다시 묻습니다.
13. AI가 Bybit 선물 BTC/USDT 기준으로 답합니다.
14. AI가 만든 진입/손절/익절 라인이 Bybit 선물 `instrumentId` 기준으로 저장됩니다.

완료 기준은 현물/선물 드로잉 분리, 거래소별 드로잉 분리, 같은 instrument 멀티 차트의 인터벌/지표/작도 동기화, 다른 instrument 차트의 독립 동작, 현재 instrument 기준 AI 응답, 현재 instrument 차트에만 적용되는 chartActions입니다.

## 심볼 규칙

- 내부 instrument id: `exchange:marketType:BASE/QUOTE[:SETTLE]`
- TradingView ticker: `EXCHANGE:MARKET_TYPE:BASEQUOTE`
- 예: `binance:spot:BTC/USDT` ↔ `BINANCE:SPOT:BTCUSDT`
- 예: `binance:linear_perp:BTC/USDT:USDT` ↔ `BINANCE:PERP:BTCUSDT`

## REST 캔들 데이터 provider 구조

시장 데이터는 `MarketDataProvider` 인터페이스로 통일합니다. `MarketDataRouter`는 선택된 instrument의 `exchange`를 기준으로 provider를 고르고, provider 내부 오류는 한국어 공통 오류로 감싸서 호출부에 전달합니다.

- `providerRegistry.ts`: 구현된 provider를 등록하고 `MarketDataRouter`를 생성합니다.
- `providers/binanceRestProvider.ts`: Binance 현물과 USDT 무기한 선물의 과거 OHLCV를 실제 Binance 공개 REST API에서 가져옵니다. 현물은 `/api/v3/klines`, USDT 무기한 선물은 `/fapi/v1/klines`를 사용합니다.
- `providers/ccxtRestProvider.ts`: CCXT 형식의 REST provider입니다. 현재 레포에는 `ccxt` 패키지가 설치되어 있지 않으므로 직접 의존성으로 묶지 않고, 서버 런타임에서만 동적 import하도록 두었습니다. 테스트에서는 fake client를 주입합니다.
- `providers/nativeProvider.ts`: 거래소별 native REST adapter를 `MarketDataProvider`로 감싸는 구조입니다.
- `timeframeMapper.ts`: 앱 interval과 TradingView resolution을 CCXT timeframe 및 timestamp로 변환합니다.

CCXT provider는 `market.spot`, `market.swap`, `market.future`, `market.linear`, `market.inverse` 정보를 사용해 `spot`, `linear_perp`, `inverse_perp`, `dated_future`로 정규화합니다. 거래소별 특이사항은 provider 또는 adapter 내부에서 처리합니다.

현재 실제 과거 캔들 연결 구현 범위는 Binance `spot`, Binance `linear_perp`입니다. Bybit, OKX, Upbit은 registry 구조와 instrument 선택 흐름은 준비되어 있지만, 과거 캔들 수집은 이후 adapter에서 확장합니다.

## 공통 시장 데이터 API

거래소별 이름이 들어간 API 경로는 만들지 않습니다. 모든 시장 데이터 요청은 공통 경로를 사용합니다.

- `GET /api/markets/exchanges`: 거래소 id, 이름, 지원 시장 유형, provider 활성화 여부를 반환합니다.
- `GET /api/markets/instruments?exchange=binance&marketType=spot&query=BTC`: 선택한 거래소와 시장 유형의 instrument 목록을 반환합니다.
- `GET /api/markets/ohlcv?instrumentId=binance:spot:BTC/USDT&interval=60&from=...&to=...&limit=...`: 특정 instrument의 과거 캔들을 반환합니다.
- `GET /api/markets/derivatives?instrumentId=bybit:linear_perp:BTC/USDT:USDT`: 선물 상품의 파생상품 context 지원 상태와 사용 가능한 필드만 반환합니다.
- `POST /api/analyze`: `instrumentId`, `interval`, `lookback`을 받아 해당 instrument의 캔들 요약, pivot, 지지/저항, 추세선 후보를 반환합니다.
- `POST /api/chat`: `userMessage`, `instrumentId`, `exchange`, `marketType`, `displaySymbol`, `interval`, `currentPrice`, `selectedDrawingId`, `drawings`, `candleSummary`, `capabilities`, `analysisResult`, `derivativesContext`를 받아 현재 차트 기준 응답을 반환합니다.
- `GET /api/system/status`: 로컬/사설망/공개 접근 범위와 API 키 보관 정책을 반환합니다.
- `GET /api/connections/ai/status`: 현재 선택된 AI 연결 상태를 반환합니다.
- `GET /api/connections/llm/status`: OpenAI, Gemini, Ollama, OpenAI 호환 로컬 AI 연결 가능 상태를 반환합니다.
- `POST /api/connections/llm/test`: 사용자가 입력한 연결 정보로 AI 연결 테스트를 수행합니다. 입력한 API 키는 응답에 포함하지 않습니다.
- `GET /api/connections/market/status`: 거래소별 시세 연결 상태를 반환합니다.

API 오류 메시지는 한국어로 반환합니다. `ohlcv` 요청은 `from`, `to`가 없어도 기본값을 사용하며, `limit`은 기본값과 최대값을 둡니다. 같은 OHLCV 요청은 `MarketDataRouter`의 간단한 메모리 캐시를 재사용합니다.

## 파생상품 데이터 확장 포인트

선물 차트에서 나중에 펀딩비, 다음 펀딩 시각, 미결제약정, 24시간 미결제약정 변화, 롱숏비, 청산 레벨을 붙일 수 있도록 `DerivativesDataProvider` 인터페이스를 분리했습니다. 현재 실제 거래소별 파생상품 데이터 수집은 구현하지 않았으며, provider가 없는 경우 `status: "unavailable"`과 한국어 사유를 반환합니다.

AI chartContext에는 `derivativesContext`가 포함됩니다. 이 값은 `availableFields`와 `unavailableFields`를 함께 전달하므로, AI는 제공되지 않은 파생상품 데이터를 추측하지 않고 “없음” 또는 “미제공”으로 설명해야 합니다.

AI chartContext에는 `capabilities`도 포함됩니다. `historicalOHLCV`, `realtimeOHLCV`, `fundingRate`, `openInterest` 같은 지원 여부를 AI에 전달해, 현재 거래소와 시장 유형에서 실제 제공되지 않는 데이터를 지어내지 않도록 합니다.

## 기술적 분석 API

기술적 분석은 `symbol` 문자열이 아니라 `instrumentId`를 기준으로 실행합니다. 따라서 같은 `BTCUSDT`라도 `binance:spot:BTC/USDT`와 `bybit:linear_perp:BTC/USDT:USDT`는 서로 다른 차트로 분석됩니다.

현재 `/api/analyze`는 `MarketDataRouter`를 통해 캔들을 가져온 뒤 `candleSummary`, `pivots`, `levels`, `trendlines`를 결정론적으로 계산합니다. 패턴 후보와 시나리오 생성은 이후 단계에서 같은 `AnalysisResult` 흐름 위에 추가합니다.

`src/lib/analysis` 아래의 분석 함수는 거래소 API, `instrumentId`, `Instrument` metadata를 알지 못합니다. 분석 함수는 정규화된 `Candle[]`만 입력으로 받고, 거래소별 차이와 상품 식별자 처리는 `MarketDataRouter`와 `/api/analyze` caller가 담당합니다.

분석 결과에서 생성되는 자동 지지/저항/추세선 도형은 `instrumentId + interval` 기준으로 저장합니다. 재분석 시 같은 스코프의 순수 `engine` 도형만 교체하고, 사용자가 수정한 자동 도형은 `engine_modified_by_user`로 보존합니다. 따라서 Binance 현물의 자동 도형이 Bybit 선물 차트에 섞이지 않습니다.

TradingView에서 감지한 도형은 `drawingBridge`를 통해 현재 `Instrument` 기준으로 정규화합니다. AI가 반환한 chart action도 `instrumentId + interval`이 현재 차트와 일치할 때만 도형으로 변환되므로, 같은 `BTCUSDT`라도 현물/선물 또는 거래소가 다르면 적용되지 않습니다.

## AI 채팅 API

AI 채팅 요청은 `symbol` 문자열이 아니라 `instrumentId`, `exchange`, `marketType`을 중심으로 구성합니다. `selectedDrawingId`는 같은 `instrumentId + interval`에 속한 도형에만 연결하며, 다른 거래소나 시장 유형의 도형은 현재 차트의 선택 도형으로 쓰지 않습니다.

현재 `/api/chat`은 AI 연결 인터페이스를 거쳐 실제 모델 호출 전 단계의 deterministic 응답을 반환합니다. 응답은 현재 거래소와 시장 유형을 명확히 포함하고, 선물 차트에서는 레버리지와 청산 리스크를 일반적인 주의사항으로만 언급하며 제공되지 않은 파생상품 수치를 추측하지 않습니다.

## AI/API 연결

AI 연결 설정은 화면 첫 영역에 노출하지 않고 오른쪽 위 `설정` 패널에서 관리합니다. 아직 실제 모델 호출이 켜지지 않은 상태에서는 샘플 응답을 사용하고, 실제 연결이 활성화되면 같은 `/api/chat` 경로에서 구조화된 응답을 반환합니다.

거래소 시세 API는 기존처럼 공통 `/api/markets/*` 경로를 사용합니다. 특정 거래소 이름이 API route에 들어가지 않으며, 실제 연결 구현 여부는 설정 패널과 데이터 제공 범위 표시에서 확인할 수 있습니다.

현재 연결 상태 API는 다음 기준을 사용합니다.

- 기본값은 샘플 응답입니다.
- OpenAI를 사용하려면 서버 환경 변수 `OPENAI_API_KEY`가 필요합니다.
- Gemini를 사용하려면 서버 환경 변수 `GEMINI_API_KEY`가 필요합니다.
- Ollama 또는 OpenAI 호환 로컬 AI는 `LOCAL_LLM_BASE_URL`과 `LOCAL_LLM_MODEL`을 기준으로 테스트합니다.
- API 키 값은 API 응답이나 브라우저 상태에 포함하지 않습니다.
- Binance는 실제 historical OHLCV 시세 연결이 준비되어 있습니다.
- Bybit, OKX, Upbit은 instrument 검색 구조는 있으나 실제 historical OHLCV 연결은 준비 중으로 표시합니다.
- Coinbase, Bitget은 아직 실제 시세 연결이 준비되지 않은 상태로 표시합니다.

## 실시간 polling fallback

WebSocket provider가 없는 거래소 또는 시장 유형도 차트가 멈춰 보이지 않도록 `StreamingRouter`가 polling fallback을 사용합니다. fallback은 `fetchOHLCV` 형태의 data source를 통해 최신 candle 1개만 가져오며, 기본 브라우저 경로에서는 공통 `/api/markets/ohlcv` API를 감싼 adapter를 사용합니다.

polling 간격은 캔들 interval에 따라 다르게 적용합니다.

- `1`: 5초
- `5` 이상 intraday interval: 10초
- `1D`, `1W`: 60초

같은 `instrumentId + interval`에 여러 구독자가 붙으면 하나의 polling loop를 공유합니다. rate limit 오류가 발생하면 polling 간격을 최대 60초까지 늘리고, 오류를 UI 전체로 전파하지 않습니다.

## 아직 연결하지 않은 것

- Binance 외 실제 거래소 historical OHLCV provider 구현
- 실제 파생상품 데이터 연결 구현
- 실제 AI 모델 호출
- 실제 도형 감지와 저장
- 고급 패턴 후보와 결정론적 시나리오 생성

## 실행 명령

```bash
npm run dev
```

## 검증 명령

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## 거래소/시장 선택 흐름 테스트 방법

거래소, 시장 유형, 심볼 선택 흐름은 `src/lib/market/selectionFlow.test.ts`에서 샘플 시세 연결 기준으로 검증합니다. 이 테스트는 다음 시나리오를 통과해야 합니다.

- Binance 현물 BTC/USDT
- Binance USDT 무기한 선물 BTC/USDT
- Bybit 현물 BTC/USDT
- Bybit USDT 무기한 선물 BTC/USDT
- Upbit 현물 BTC/KRW
- OKX USDT 무기한 선물 ETH/USDT

확인 항목은 차트 ticker 분리, `instrumentId + interval` 기준 drawing 분리, AI context 분리, `/api/analyze` 결과의 instrument별 분리, 지원하지 않는 조합의 한국어 오류 안내입니다.

선택 흐름만 빠르게 확인하려면 다음 명령을 실행합니다.

```bash
node --test src/lib/market/selectionFlow.test.ts
```
