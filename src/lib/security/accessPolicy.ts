export type AccessScope = "local" | "lan" | "public" | "unknown";

export type SystemStatus = {
  accessScope: AccessScope;
  isPubliclyExposed: boolean;
  message: string;
  secretPolicy: string;
  nodeEnv: string;
  hasAiApiKey: boolean;
};

type SystemStatusInput = {
  host: string | null;
  nodeEnv: string;
  hasAiApiKey: boolean;
};

const extractHostname = (host: string | null): string | null => {
  if (!host) {
    return null;
  }

  const trimmedHost = host.trim().toLowerCase();
  if (trimmedHost.length === 0) {
    return null;
  }

  if (trimmedHost.startsWith("[")) {
    const endIndex = trimmedHost.indexOf("]");
    return endIndex > 0 ? trimmedHost.slice(1, endIndex) : trimmedHost;
  }

  const colonCount = trimmedHost.split(":").length - 1;
  if (colonCount === 1) {
    return trimmedHost.split(":")[0] ?? null;
  }

  return trimmedHost;
};

const isLanIpv4 = (hostname: string) => {
  const segments = hostname.split(".").map((segment) => Number(segment));
  if (segments.length !== 4 || segments.some((segment) => !Number.isInteger(segment) || segment < 0 || segment > 255)) {
    return false;
  }

  const [first, second] = segments;

  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
};

export const classifyAccessScope = (host: string | null): AccessScope => {
  const hostname = extractHostname(host);

  if (!hostname) {
    return "unknown";
  }

  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return "local";
  }

  if (isLanIpv4(hostname)) {
    return "lan";
  }

  return "public";
};

const statusMessages: Record<AccessScope, string> = {
  local: "현재 요청은 로컬 주소에서 들어왔습니다. 개발 환경에서만 접근 가능한 상태로 보입니다.",
  lan: "현재 요청은 사설 네트워크 주소에서 들어왔습니다. 같은 네트워크의 기기에서 접근할 수 있습니다.",
  public: "현재 요청은 공개 주소에서 들어왔습니다. 외부 인터넷에 노출된 상태일 수 있습니다.",
  unknown: "요청 host 정보를 확인할 수 없어 공개 노출 여부를 판단할 수 없습니다."
};

const secretPolicies: Record<AccessScope, string> = {
  local: "API 키는 브라우저에 저장하지 않습니다. OPENAI_API_KEY는 서버 환경 변수로만 사용합니다.",
  lan: "API 키는 브라우저에 저장하지 않습니다. 사설망 접근에서도 서버 밖으로 전달하지 않습니다.",
  public: "API 키는 브라우저에 저장하지 않습니다. 공개 접근 상태에서는 요청 권한과 사용량을 엄격히 제한해야 합니다.",
  unknown: "API 키는 브라우저에 저장하지 않습니다. host를 알 수 없으므로 보수적인 비밀키 정책을 적용합니다."
};

export const createSystemStatus = ({ host, nodeEnv, hasAiApiKey }: SystemStatusInput): SystemStatus => {
  const accessScope = classifyAccessScope(host);

  return {
    accessScope,
    isPubliclyExposed: accessScope === "public",
    message: statusMessages[accessScope],
    secretPolicy: secretPolicies[accessScope],
    nodeEnv,
    hasAiApiKey
  };
};
