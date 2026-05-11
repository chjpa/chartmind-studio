# 보안, 브랜딩, AI/API 연결 구현 계획

> **작업자 필수 하위 스킬:** 이 계획을 구현할 때는 `superpowers:subagent-driven-development` 또는 `superpowers:executing-plans`를 사용한다. 각 단계는 체크박스(`- [ ]`)로 추적한다.

**목표:** 개인용 AI 보조 트레이딩 차트 워크스페이스에 로컬/배포 보안 경계 안내, 제품명/브랜딩, AI provider 및 외부 API 연결 상태/테스트 기능을 작고 검토 가능한 단위로 추가한다.

**아키텍처:** 보안 판단과 연결 상태는 서버 API에서 계산하고, 클라이언트는 한국어 UI로 현재 실행 환경과 연결 가능 여부를 표시한다. AI 연결은 provider interface 뒤로 숨기고, API key는 기본적으로 서버 환경 변수 또는 로컬 전용 임시 메모리 설정으로만 다룬다. 기존 `instrumentId` 중심 차트/AI context 구조는 유지한다.

**기술 스택:** Next.js App Router, React, TypeScript, Node test runner, 환경 변수, 서버 전용 AI provider adapter, 한국어 UI.

---

## 현재 판단

- `http://localhost:3000`은 기본적으로 사용자 컴퓨터 안에서만 접근하는 개발 주소다. 라우터 포트포워딩, `0.0.0.0` 바인딩, ngrok 같은 터널링, 클라우드 배포를 하지 않았다면 인터넷 전체에 공개된 사이트가 아니다.
- 그래도 브라우저에서 열리는 앱이므로 API key 입력, 외부 거래소 API 호출, AI provider 연결 기능을 넣는 순간 보안 설계가 필요하다.
- 사이트 이름은 현재 `AI 트레이딩 차트 워크스페이스`로 기능 설명에 가깝다. 개인용 제품처럼 보이게 하려면 짧은 제품명과 설명 문구를 분리한다.
- AI 채팅 API는 현재 실제 모델 호출 전 단계의 deterministic 응답이다. 다음 단계에서는 실제 AI provider 연결 상태를 보여주고, 연결된 경우에만 모델 호출로 전환한다.

## 파일 구조

- 생성: `src/lib/config/appBrand.ts`
  - 제품명, 짧은 설명, 경고 문구, 로컬 실행 이름을 한곳에서 관리한다.
- 수정: `src/app/layout.tsx`
  - metadata title/description을 브랜드 설정에서 가져온다.
- 생성: `src/lib/security/accessPolicy.ts`
  - 현재 host와 환경 변수를 기준으로 `local`, `lan`, `public`, `unknown` 접근 범위를 판정한다.
- 생성: `src/app/api/system/status/route.ts`
  - 앱 실행 환경, 접근 범위, API key 저장 정책, 경고 메시지를 반환한다.
- 생성: `src/app/api/system/status/route.test.ts`
  - 접근 범위와 한국어 메시지를 검증한다.
- 생성: `src/components/AppHeader.tsx`
  - 제품명, 현재 실행 주소 보안 상태, 연결 설정 버튼을 표시한다.
- 수정: `src/app/page.tsx`
  - `AppHeader`를 화면 상단에 배치한다.
- 수정: `src/app/globals.css`
  - 브랜드 헤더와 연결 상태 badge 스타일을 추가한다.
- 생성: `src/lib/connections/connectionTypes.ts`
  - AI provider, market API provider, 연결 상태 타입을 정의한다.
- 생성: `src/lib/ai/providers/aiProvider.ts`
  - 실제 AI provider가 따라야 하는 interface를 정의한다.
- 생성: `src/lib/ai/providers/mockAiProvider.ts`
  - API key가 없을 때 사용하는 deterministic provider를 정의한다.
- 생성: `src/lib/ai/providers/openAiProvider.ts`
  - 서버 환경 변수 기반 AI provider adapter를 둔다. 실제 구현 시 공식 문서를 확인하고 최신 SDK 또는 REST 호출 방식을 선택한다.
- 생성: `src/lib/ai/providers/providerRegistry.ts`
  - 환경 변수와 설정을 기준으로 현재 AI provider를 선택한다.
- 생성: `src/app/api/connections/ai/status/route.ts`
  - AI provider 연결 가능 여부와 누락된 설정을 한국어로 반환한다.
- 생성: `src/app/api/connections/ai/test/route.ts`
  - 실제 trading 분석이 아닌 짧은 연결 테스트 요청만 수행한다.
- 생성: `src/app/api/connections/ai/status/route.test.ts`
  - API key가 없을 때와 mock provider 상태를 검증한다.
- 생성: `src/app/api/connections/market/status/route.ts`
  - `ExchangeRegistry`, `ProviderRegistry`, capability 정보를 모아 거래소 API 연결 가능 상태를 반환한다.
- 생성: `src/app/api/connections/market/status/route.test.ts`
  - Binance historical provider와 준비 중 provider 상태가 구분되는지 검증한다.
- 생성: `src/components/ConnectionSettingsPanel.tsx`
  - AI 연결 상태, market API provider 상태, 보안 경고를 표시한다.
- 생성: `src/components/ConnectionSettingsPanel.test.tsx`
  - 한국어 UI 문구와 상태 렌더링을 검증한다.
- 수정: `src/components/AiChatPanel.tsx`
  - 연결 상태가 없으면 mock/deterministic 응답 안내를 보여주고, 연결되면 실제 AI 분석 가능 상태를 표시한다.
- 수정: `src/app/api/chat/route.ts`
  - provider registry를 통해 AI provider를 호출하되, 설정이 없으면 기존 deterministic 응답을 유지한다.
- 수정: `README.md`
  - 로컬 주소 보안 설명, API key 정책, AI/API 연결 방법을 한국어로 추가한다.
- 수정: `PLANS.md`
  - 보안/브랜딩/AI 연결 마일스톤을 다음 작업으로 추가한다.

## Task 1: 로컬 주소 보안 상태 API

**파일:**
- 생성: `src/lib/security/accessPolicy.ts`
- 생성: `src/app/api/system/status/route.ts`
- 생성: `src/app/api/system/status/route.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { classifyAccessScope, createSystemStatus } from "@/lib/security/accessPolicy";

test("localhost 주소는 로컬 개발 범위로 분류한다", () => {
  assert.equal(classifyAccessScope("localhost:3000"), "local");
  assert.equal(classifyAccessScope("127.0.0.1:3000"), "local");
});

test("LAN 주소는 같은 네트워크 노출 가능 범위로 분류한다", () => {
  assert.equal(classifyAccessScope("192.168.0.12:3000"), "lan");
});

test("시스템 상태는 한국어 보안 안내를 포함한다", () => {
  const status = createSystemStatus({
    host: "localhost:3000",
    nodeEnv: "development",
    hasAiApiKey: false
  });

  assert.equal(status.accessScope, "local");
  assert.equal(status.isPubliclyExposed, false);
  assert.match(status.message, /현재 주소는 로컬 개발 주소입니다/);
  assert.match(status.secretPolicy, /API key는 브라우저에 저장하지 않습니다/);
});
```

- [ ] **Step 2: 테스트 실패 확인**

실행:

```bash
npm run test -- src/app/api/system/status/route.test.ts
```

예상: `src/lib/security/accessPolicy` 모듈을 찾을 수 없어 실패한다.

- [ ] **Step 3: 최소 구현 작성**

`src/lib/security/accessPolicy.ts`:

```ts
export type AccessScope = "local" | "lan" | "public" | "unknown";

export type SystemStatus = {
  accessScope: AccessScope;
  isPubliclyExposed: boolean;
  message: string;
  secretPolicy: string;
  nodeEnv: string;
  hasAiApiKey: boolean;
};

export const classifyAccessScope = (host: string | null): AccessScope => {
  if (!host) {
    return "unknown";
  }

  const hostname = host.split(":")[0]?.toLowerCase() ?? "";

  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return "local";
  }

  if (
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  ) {
    return "lan";
  }

  return "public";
};

export const createSystemStatus = ({
  host,
  nodeEnv,
  hasAiApiKey
}: {
  host: string | null;
  nodeEnv: string;
  hasAiApiKey: boolean;
}): SystemStatus => {
  const accessScope = classifyAccessScope(host);
  const isPubliclyExposed = accessScope === "public";
  const message =
    accessScope === "local"
      ? "현재 주소는 로컬 개발 주소입니다. 일반적으로 외부 인터넷에 공개되지 않습니다."
      : accessScope === "lan"
        ? "현재 주소는 같은 네트워크에서 접근될 수 있습니다. 공유 와이파이에서는 주의가 필요합니다."
        : accessScope === "public"
          ? "현재 주소는 공개 도메인일 수 있습니다. 인증과 비밀키 보호가 필요합니다."
          : "현재 접근 범위를 확인할 수 없습니다.";

  return {
    accessScope,
    isPubliclyExposed,
    message,
    secretPolicy: "API key는 브라우저에 저장하지 않습니다. 서버 환경 변수 또는 로컬 전용 임시 메모리 설정만 사용합니다.",
    nodeEnv,
    hasAiApiKey
  };
};
```

`src/app/api/system/status/route.ts`:

```ts
import { createSystemStatus } from "@/lib/security/accessPolicy";

export const GET = async (request: Request) => {
  const host = request.headers.get("host");
  const status = createSystemStatus({
    host,
    nodeEnv: process.env.NODE_ENV ?? "development",
    hasAiApiKey: Boolean(process.env.OPENAI_API_KEY)
  });

  return Response.json(status);
};
```

- [ ] **Step 4: 테스트 통과 확인**

실행:

```bash
npm run test -- src/app/api/system/status/route.test.ts
```

예상: `PASS`

- [ ] **Step 5: 커밋**

```bash
git add src/lib/security/accessPolicy.ts src/app/api/system/status/route.ts src/app/api/system/status/route.test.ts
git commit -m "feat: add system security status"
```

## Task 2: 제품명과 상단 브랜드 헤더

**파일:**
- 생성: `src/lib/config/appBrand.ts`
- 생성: `src/components/AppHeader.tsx`
- 수정: `src/app/layout.tsx`
- 수정: `src/app/page.tsx`
- 수정: `src/app/globals.css`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/config/appBrand.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { appBrand } from "./appBrand";

test("브랜드 이름과 설명은 한국어 제품 문구를 가진다", () => {
  assert.equal(appBrand.name, "ChartMind Studio");
  assert.match(appBrand.koreanName, /차트마인드/);
  assert.match(appBrand.description, /AI 보조 트레이딩 차트 분석/);
});
```

- [ ] **Step 2: 테스트 실패 확인**

실행:

```bash
node --test src/lib/config/appBrand.test.ts
```

예상: `appBrand` 모듈을 찾을 수 없어 실패한다.

- [ ] **Step 3: 브랜드 설정 구현**

`src/lib/config/appBrand.ts`:

```ts
export const appBrand = {
  name: "ChartMind Studio",
  koreanName: "차트마인드 스튜디오",
  description: "AI 보조 트레이딩 차트 분석을 위한 개인용 워크스페이스",
  tagline: "여러 거래소의 현물과 선물 차트를 한곳에서 분석합니다.",
  localSecurityLabel: "로컬 실행 중"
} as const;
```

`src/app/layout.tsx`:

```ts
import type { Metadata } from "next";
import { appBrand } from "@/lib/config/appBrand";
import "./globals.css";

export const metadata: Metadata = {
  title: `${appBrand.name} · ${appBrand.koreanName}`,
  description: appBrand.description
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

`src/components/AppHeader.tsx`:

```tsx
import { appBrand } from "@/lib/config/appBrand";

export function AppHeader() {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">{appBrand.koreanName}</p>
        <h1>{appBrand.name}</h1>
        <p>{appBrand.tagline}</p>
      </div>
      <div className="security-badge" aria-label="현재 실행 상태">
        {appBrand.localSecurityLabel}
      </div>
    </header>
  );
}
```

`src/app/page.tsx`에서 기존 최상단에 `AppHeader`를 배치한다.

```tsx
import { AppHeader } from "@/components/AppHeader";
import { AiChatPanel } from "@/components/AiChatPanel";
import { ChartWorkspace } from "@/components/ChartWorkspace";
import { createInitialChartState } from "@/store/chartStore";

export default function Home() {
  const chartState = createInitialChartState();

  return (
    <main className="app-shell">
      <AppHeader />
      <div className="workspace-grid">
        <ChartWorkspace
          chartState={chartState}
          onSelectInstrument={() => undefined}
          onUpdateChartState={() => undefined}
        />
        <AiChatPanel chartState={chartState} />
      </div>
    </main>
  );
}
```

`src/app/globals.css`에 추가한다.

```css
.app-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
}

.app-header h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.15;
}

.app-header p {
  margin: 6px 0 0;
  color: #94a3b8;
}

.security-badge {
  border: 1px solid rgba(34, 197, 94, 0.45);
  color: #bbf7d0;
  background: rgba(22, 101, 52, 0.18);
  border-radius: 999px;
  padding: 8px 12px;
  white-space: nowrap;
}
```

- [ ] **Step 4: 테스트와 타입 검사**

실행:

```bash
node --test src/lib/config/appBrand.test.ts
npm run typecheck
```

예상: 둘 다 통과한다.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/config/appBrand.ts src/lib/config/appBrand.test.ts src/components/AppHeader.tsx src/app/layout.tsx src/app/page.tsx src/app/globals.css
git commit -m "feat: add product branding"
```

## Task 3: AI provider 연결 상태 API

**파일:**
- 생성: `src/lib/connections/connectionTypes.ts`
- 생성: `src/lib/ai/providers/aiProvider.ts`
- 생성: `src/lib/ai/providers/mockAiProvider.ts`
- 생성: `src/lib/ai/providers/providerRegistry.ts`
- 생성: `src/app/api/connections/ai/status/route.ts`
- 생성: `src/app/api/connections/ai/status/route.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { createAiConnectionStatus } from "@/lib/ai/providers/providerRegistry";

test("AI API key가 없으면 mock provider 상태를 반환한다", () => {
  const status = createAiConnectionStatus({
    provider: "mock",
    hasApiKey: false
  });

  assert.equal(status.provider, "mock");
  assert.equal(status.status, "ready");
  assert.match(status.message, /실제 AI provider가 연결되지 않았습니다/);
});

test("OpenAI provider를 선택했지만 key가 없으면 설정 필요 상태를 반환한다", () => {
  const status = createAiConnectionStatus({
    provider: "openai",
    hasApiKey: false
  });

  assert.equal(status.provider, "openai");
  assert.equal(status.status, "needs_configuration");
  assert.match(status.message, /OPENAI_API_KEY가 필요합니다/);
});
```

- [ ] **Step 2: 테스트 실패 확인**

실행:

```bash
npm run test -- src/app/api/connections/ai/status/route.test.ts
```

예상: provider registry 모듈이 없어 실패한다.

- [ ] **Step 3: 타입과 registry 구현**

`src/lib/connections/connectionTypes.ts`:

```ts
export type ConnectionStatus = "ready" | "needs_configuration" | "unavailable" | "error";

export type AiProviderId = "mock" | "openai";

export type AiConnectionStatus = {
  provider: AiProviderId;
  status: ConnectionStatus;
  message: string;
  secretSource: "none" | "server_env" | "local_memory";
};
```

`src/lib/ai/providers/aiProvider.ts`:

```ts
import type { ChatRequestPayload, ChatResponsePayload } from "@/lib/types/ai";

export type AiProvider = {
  id: string;
  name: string;
  createChatResponse(payload: ChatRequestPayload): Promise<ChatResponsePayload>;
};
```

`src/lib/ai/providers/mockAiProvider.ts`:

```ts
import type { AiProvider } from "./aiProvider";
import type { ChatRequestPayload, ChatResponsePayload } from "@/lib/types/ai";

export const createMockAiProvider = (): AiProvider => ({
  id: "mock",
  name: "Mock AI",
  async createChatResponse(payload: ChatRequestPayload): Promise<ChatResponsePayload> {
    return {
      instrumentId: payload.instrumentId,
      exchange: payload.exchange,
      marketType: payload.marketType,
      displaySymbol: payload.displaySymbol,
      interval: payload.interval,
      selectedDrawingId: payload.selectedDrawingId,
      selectedDrawing: null,
      assistantMessage: "실제 AI provider가 연결되지 않았습니다. 현재는 구조화된 mock 응답입니다."
    };
  }
});
```

`src/lib/ai/providers/providerRegistry.ts`:

```ts
import type { AiConnectionStatus, AiProviderId } from "@/lib/connections/connectionTypes";
import { createMockAiProvider } from "./mockAiProvider";

export const createAiConnectionStatus = ({
  provider,
  hasApiKey
}: {
  provider: AiProviderId;
  hasApiKey: boolean;
}): AiConnectionStatus => {
  if (provider === "mock") {
    return {
      provider,
      status: "ready",
      message: "실제 AI provider가 연결되지 않았습니다. mock provider로 응답합니다.",
      secretSource: "none"
    };
  }

  if (!hasApiKey) {
    return {
      provider,
      status: "needs_configuration",
      message: "OpenAI provider를 사용하려면 서버 환경 변수 OPENAI_API_KEY가 필요합니다.",
      secretSource: "none"
    };
  }

  return {
    provider,
    status: "ready",
    message: "서버 환경 변수 기반 AI provider가 준비되었습니다.",
    secretSource: "server_env"
  };
};

export const getAiProvider = () => createMockAiProvider();
```

`src/app/api/connections/ai/status/route.ts`:

```ts
import type { AiProviderId } from "@/lib/connections/connectionTypes";
import { createAiConnectionStatus } from "@/lib/ai/providers/providerRegistry";

export const GET = async () => {
  const provider = (process.env.AI_PROVIDER ?? "mock") as AiProviderId;
  const status = createAiConnectionStatus({
    provider,
    hasApiKey: Boolean(process.env.OPENAI_API_KEY)
  });

  return Response.json(status);
};
```

- [ ] **Step 4: 테스트 통과 확인**

실행:

```bash
npm run test -- src/app/api/connections/ai/status/route.test.ts
```

예상: `PASS`

- [ ] **Step 5: 커밋**

```bash
git add src/lib/connections/connectionTypes.ts src/lib/ai/providers src/app/api/connections/ai/status
git commit -m "feat: add ai connection status"
```

## Task 4: Market API 연결 상태 API

**파일:**
- 생성: `src/app/api/connections/market/status/route.ts`
- 생성: `src/app/api/connections/market/status/route.test.ts`
- 수정: `src/lib/connections/connectionTypes.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "./route";

test("market 연결 상태는 구현된 provider와 준비 중 provider를 구분한다", async () => {
  const response = await GET();
  const body = await response.json();

  const binance = body.exchanges.find((exchange: { id: string }) => exchange.id === "binance");
  const coinbase = body.exchanges.find((exchange: { id: string }) => exchange.id === "coinbase");

  assert.equal(binance.enabled, true);
  assert.equal(binance.historicalOHLCV, true);
  assert.equal(coinbase.enabled, false);
  assert.match(coinbase.message, /provider가 아직 구현되지 않았습니다/);
});
```

- [ ] **Step 2: 테스트 실패 확인**

실행:

```bash
npm run test -- src/app/api/connections/market/status/route.test.ts
```

예상: route 파일이 없어 실패한다.

- [ ] **Step 3: market 연결 상태 구현**

`src/lib/connections/connectionTypes.ts`에 추가:

```ts
export type MarketConnectionStatusItem = {
  id: string;
  name: string;
  enabled: boolean;
  supportedMarketTypes: string[];
  historicalOHLCV: boolean;
  realtimeOHLCV: "websocket" | "polling" | "unsupported";
  message: string;
};
```

`src/app/api/connections/market/status/route.ts`:

```ts
import { getExchangeRegistry } from "@/lib/market/exchangeRegistry";
import { getProviderRegistry } from "@/lib/market/providerRegistry";
import type { MarketConnectionStatusItem } from "@/lib/connections/connectionTypes";

export const GET = async () => {
  const providerRegistry = getProviderRegistry();
  const exchanges = getExchangeRegistry().map((exchange): MarketConnectionStatusItem => {
    const hasProvider = providerRegistry.has(exchange.id);

    return {
      id: exchange.id,
      name: exchange.name,
      enabled: hasProvider,
      supportedMarketTypes: exchange.supportedMarketTypes,
      historicalOHLCV: hasProvider,
      realtimeOHLCV: hasProvider ? "polling" : "unsupported",
      message: hasProvider
        ? "market data provider가 연결되어 있습니다."
        : "데이터 provider가 아직 구현되지 않았습니다."
    };
  });

  return Response.json({ exchanges });
};
```

- [ ] **Step 4: 테스트 통과 확인**

실행:

```bash
npm run test -- src/app/api/connections/market/status/route.test.ts
```

예상: `PASS`

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/connections/market/status src/lib/connections/connectionTypes.ts
git commit -m "feat: add market connection status"
```

## Task 5: 연결 설정 패널 UI

**파일:**
- 생성: `src/components/ConnectionSettingsPanel.tsx`
- 생성: `src/components/ConnectionSettingsPanel.test.tsx`
- 수정: `src/components/AiChatPanel.tsx`
- 수정: `src/app/globals.css`

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ConnectionSettingsPanel } from "./ConnectionSettingsPanel";

test("연결 설정 패널은 AI와 market API 상태를 한국어로 표시한다", () => {
  const html = renderToStaticMarkup(
    <ConnectionSettingsPanel
      aiStatus={{
        provider: "mock",
        status: "ready",
        message: "실제 AI provider가 연결되지 않았습니다. mock provider로 응답합니다.",
        secretSource: "none"
      }}
      marketStatus={{
        exchanges: [
          {
            id: "binance",
            name: "Binance",
            enabled: true,
            supportedMarketTypes: ["spot", "linear_perp"],
            historicalOHLCV: true,
            realtimeOHLCV: "polling",
            message: "market data provider가 연결되어 있습니다."
          }
        ]
      }}
    />
  );

  assert.match(html, /연결 설정/);
  assert.match(html, /AI 연결/);
  assert.match(html, /거래소 API/);
  assert.match(html, /브라우저에 API key를 저장하지 않습니다/);
});
```

- [ ] **Step 2: 테스트 실패 확인**

실행:

```bash
node --test src/components/ConnectionSettingsPanel.test.tsx
```

예상: 컴포넌트가 없어 실패한다.

- [ ] **Step 3: 패널 컴포넌트 구현**

`src/components/ConnectionSettingsPanel.tsx`:

```tsx
import type { AiConnectionStatus, MarketConnectionStatusItem } from "@/lib/connections/connectionTypes";

type ConnectionSettingsPanelProps = {
  aiStatus: AiConnectionStatus;
  marketStatus: {
    exchanges: MarketConnectionStatusItem[];
  };
};

export function ConnectionSettingsPanel({ aiStatus, marketStatus }: ConnectionSettingsPanelProps) {
  return (
    <section className="connection-panel" aria-labelledby="connection-settings-title">
      <div>
        <p className="eyebrow">설정</p>
        <h2 id="connection-settings-title">연결 설정</h2>
      </div>

      <div className="connection-card">
        <strong>AI 연결</strong>
        <p>{aiStatus.message}</p>
        <span>비밀키 정책: 브라우저에 API key를 저장하지 않습니다.</span>
      </div>

      <div className="connection-card">
        <strong>거래소 API</strong>
        <ul>
          {marketStatus.exchanges.map((exchange) => (
            <li key={exchange.id}>
              {exchange.name}: {exchange.message}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

`src/components/AiChatPanel.tsx`는 `ConnectionSettingsPanel`을 받아 표시할 수 있도록 props를 확장한다. 초기 구현에서는 mock 상태를 직접 주입해도 된다.

- [ ] **Step 4: 테스트 통과와 타입 검사**

실행:

```bash
node --test src/components/ConnectionSettingsPanel.test.tsx
npm run typecheck
```

예상: 둘 다 통과한다.

- [ ] **Step 5: 커밋**

```bash
git add src/components/ConnectionSettingsPanel.tsx src/components/ConnectionSettingsPanel.test.tsx src/components/AiChatPanel.tsx src/app/globals.css
git commit -m "feat: add connection settings panel"
```

## Task 6: `/api/chat`를 AI provider registry로 연결

**파일:**
- 수정: `src/app/api/chat/route.ts`
- 수정: `src/app/api/chat/route.test.ts`
- 수정: `src/lib/ai/providers/providerRegistry.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/api/chat/route.test.ts`에 추가:

```ts
test("AI provider 설정이 없어도 기존 deterministic 응답을 유지한다", async () => {
  const request = new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validChatPayload)
  });

  const response = await POST(request);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.instrumentId, validChatPayload.instrumentId);
  assert.match(body.assistantMessage, /기준 instrumentId/);
});
```

- [ ] **Step 2: 테스트 실행**

실행:

```bash
npm run test -- src/app/api/chat/route.test.ts
```

예상: 현재 deterministic 응답은 통과하지만 provider registry 호출 검증이 없어 추가 구현이 필요하다.

- [ ] **Step 3: provider registry 호출로 분리**

`src/lib/ai/providers/providerRegistry.ts`에 deterministic provider 생성 함수를 추가하고, `/api/chat`의 응답 생성 책임을 provider로 이동한다. 검증 로직은 기존 route에 남겨 payload 안정성을 유지한다.

```ts
import type { ChatRequestPayload, ChatResponsePayload } from "@/lib/types/ai";

export type DeterministicResponder = (payload: ChatRequestPayload) => ChatResponsePayload;

export const createDeterministicAiProvider = (respond: DeterministicResponder) => ({
  id: "deterministic",
  name: "Deterministic AI",
  async createChatResponse(payload: ChatRequestPayload) {
    return respond(payload);
  }
});
```

`src/app/api/chat/route.ts`는 검증 후 provider를 호출한다.

```ts
const provider = createDeterministicAiProvider((payload) => {
  const selectedDrawing = findSelectedDrawing(payload);

  return {
    instrumentId: payload.instrumentId,
    exchange: payload.exchange,
    marketType: payload.marketType,
    displaySymbol: payload.displaySymbol,
    interval: payload.interval,
    selectedDrawingId: payload.selectedDrawingId,
    selectedDrawing,
    assistantMessage: createAssistantMessage(payload, selectedDrawing)
  };
});

const response = await provider.createChatResponse(payload);
return json(response);
```

- [ ] **Step 4: 전체 검증**

실행:

```bash
npm run test
npm run typecheck
```

예상: 모두 통과한다.

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/chat/route.ts src/app/api/chat/route.test.ts src/lib/ai/providers/providerRegistry.ts
git commit -m "feat: route chat through ai provider"
```

## Task 7: 문서 업데이트

**파일:**
- 수정: `README.md`
- 수정: `PLANS.md`

- [ ] **Step 1: README에 보안 설명 추가**

추가할 문구:

```md
## 로컬 주소와 보안

`http://localhost:3000`은 기본적으로 내 컴퓨터 안에서 접근하는 개발 주소입니다. 포트포워딩, 터널링, 공개 배포를 하지 않았다면 일반 인터넷 사용자에게 공개되지 않습니다.

다만 AI provider key, 거래소 API key, 외부 데이터 vendor key를 연결할 때는 다음 원칙을 지킵니다.

- API key를 브라우저 localStorage에 저장하지 않습니다.
- 기본 연결 방식은 서버 환경 변수입니다.
- 로컬 전용 임시 입력 기능을 추가하더라도 프로세스 메모리 안에서만 유지하고 새로고침/재시작 후 사라지게 합니다.
- 공개 배포 전에는 인증, rate limit, CORS, CSRF, 로그 마스킹을 별도 마일스톤으로 추가합니다.
```

- [ ] **Step 2: README에 AI/API 연결 설명 추가**

추가할 문구:

```md
## AI/API 연결

AI 연결은 provider interface 뒤에 둡니다. provider가 설정되지 않은 상태에서는 deterministic mock 응답을 사용하고, 실제 provider가 연결되면 같은 `/api/chat` 경로에서 구조화된 응답을 반환합니다.

거래소 market data API는 기존처럼 공통 `/api/markets/*` 경로를 사용합니다. 특정 거래소 이름이 API route에 들어가지 않으며, 실제 provider 구현 여부는 연결 설정 패널과 capability 표시에서 확인할 수 있습니다.
```

- [ ] **Step 3: PLANS.md에 다음 마일스톤 추가**

`PLANS.md`의 “현재 구현 상태 메모” 아래에 추가한다.

```md
## 다음 보강 마일스톤: 보안, 브랜딩, AI/API 연결

- `localhost` 실행 상태와 공개 노출 상태를 구분해 UI에 한국어로 안내한다.
- 제품명은 `ChartMind Studio · 차트마인드 스튜디오`를 기본 후보로 사용한다.
- API key는 브라우저에 저장하지 않고 서버 환경 변수 또는 로컬 전용 임시 메모리 설정만 사용한다.
- AI provider registry를 추가해 mock 응답과 실제 AI provider를 같은 interface로 교체 가능하게 만든다.
- 거래소 API provider 연결 상태를 설정 패널에서 확인할 수 있게 한다.
```

- [ ] **Step 4: 문서 검증**

실행:

```bash
rg "API key를 브라우저 localStorage에 저장하지 않습니다|ChartMind Studio|AI provider registry" README.md PLANS.md
```

예상: 세 문구가 모두 검색된다.

- [ ] **Step 5: 커밋**

```bash
git add README.md PLANS.md
git commit -m "docs: document security branding and connections"
```

## 전체 검증

모든 task 완료 후 실행한다.

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

예상 결과:

- TypeScript 오류가 없다.
- ESLint 오류가 없다.
- 모든 단위 테스트가 통과한다.
- Next.js production build가 성공한다.

## 수동 테스트

1. `npm run dev`를 실행한다.
2. `http://localhost:3000`을 연다.
3. 상단에 `ChartMind Studio`와 `차트마인드 스튜디오`가 보이는지 확인한다.
4. 보안 badge가 `로컬 실행 중` 또는 시스템 상태 API의 한국어 메시지를 보여주는지 확인한다.
5. 연결 설정 패널에서 AI 연결 상태가 mock 또는 configured 상태로 보이는지 확인한다.
6. 거래소 API 상태에서 Binance는 연결됨, 미구현 provider는 준비 중으로 보이는지 확인한다.
7. 기존 MarketSelector에서 현물/선물 instrument 선택이 유지되는지 확인한다.
8. `/api/chat` 요청이 기존처럼 `instrumentId`, `exchange`, `marketType` 기준으로 응답하는지 확인한다.

## 위험 요소와 가정

- `localhost` 자체는 공개 주소가 아니지만, 사용자가 `next dev -H 0.0.0.0`, 포트포워딩, 터널링, 클라우드 배포를 사용하면 외부 접근 가능성이 생긴다.
- AI API key를 사이트 안에서 입력받아 영구 저장하는 기능은 MVP에서 제외한다. 공개 배포 전에 인증, 암호화 저장소, 감사 로그, rate limit이 먼저 필요하다.
- 실제 AI provider 구현 시 최신 provider SDK와 모델 정책을 공식 문서 기준으로 다시 확인해야 한다.
- 이 계획은 보안 제품을 만드는 것이 아니라 개인용 워크스페이스의 기본 안전장치를 추가하는 범위다.

## 자체 검토

- 요구사항 반영: `localhost` 보안 위험 설명, 사이트 이름 보강, AI 연결 및 API 연결 기능 계획을 모두 포함했다.
- placeholder 점검: 실행자가 채워 넣어야 하는 빈 문구를 남기지 않았다.
- 타입 일관성: `AiConnectionStatus`, `MarketConnectionStatusItem`, `AccessScope`는 각 task에서 먼저 정의한 뒤 사용한다.
