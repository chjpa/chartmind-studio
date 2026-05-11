import { appBrand } from "@/lib/config/appBrand";

type AppHeaderProps = {
  onOpenPreferences: () => void;
};

export function AppHeader({ onOpenPreferences }: AppHeaderProps) {
  return (
    <header className="app-header" aria-label="제품 정보">
      <div className="brand-lockup">
        <p className="brand-korean-name">{appBrand.koreanName}</p>
        <div className="brand-title-row">
          <h1>{appBrand.name}</h1>
          <span className="local-status-badge">로컬 실행 중</span>
        </div>
        <p className="brand-tagline">{appBrand.tagline}</p>
      </div>
      <div className="header-actions">
        <p className="brand-description">{appBrand.description}</p>
        <button type="button" className="preferences-button" onClick={onOpenPreferences}>
          설정
        </button>
      </div>
    </header>
  );
}
