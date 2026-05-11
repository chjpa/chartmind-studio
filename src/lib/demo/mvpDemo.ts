export const mvpDemoFlow = [
  "앱을 연다.",
  "거래소에서 Binance를 선택한다.",
  "시장 유형에서 현물을 선택한다.",
  "BTC/USDT 차트를 연다.",
  "사용자가 추세선을 그린다.",
  "앱이 drawing을 instrumentId 기준으로 저장한다.",
  "AI에게 \"이 선 기준으로 롱/숏 시나리오 짜줘\"라고 묻는다.",
  "AI가 Binance 현물 BTC/USDT 기준으로 답한다.",
  "사용자가 Bybit 선물 BTC/USDT로 전환한다.",
  "Binance 현물에서 그린 선이 Bybit 선물에 나타나지 않는지 확인한다.",
  "Bybit 선물 차트에 새 추세선을 그린다.",
  "AI에게 다시 묻는다.",
  "AI가 Bybit 선물 BTC/USDT 기준으로 답한다.",
  "AI가 만든 진입/손절/익절 라인이 Bybit 선물 instrumentId 기준으로 저장된다."
] as const;

export const mvpDemoAcceptanceCriteria = [
  "현물/선물 드로잉이 섞이지 않는다.",
  "거래소별 드로잉이 섞이지 않는다.",
  "AI가 현재 instrument 기준으로만 답한다.",
  "chartActions가 현재 instrument 차트에만 적용된다."
] as const;
