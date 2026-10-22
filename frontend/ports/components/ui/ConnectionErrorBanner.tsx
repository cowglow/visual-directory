import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import "./connection-error-banner.css";

interface ConnectionErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export default function ConnectionErrorBanner({ message, onRetry }: ConnectionErrorBannerProps) {
  const { t } = useTranslation();

  return (
    <div className="connection-error-banner">
      <span>{message}</span>
      <button type="button" className="btn" onClick={onRetry}>
        {t.connectionErrorBanner.retry}
      </button>
    </div>
  );
}
