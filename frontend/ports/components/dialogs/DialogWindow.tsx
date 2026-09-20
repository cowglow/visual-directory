import { PropsWithChildren } from "react";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import "./dialogs.css";

interface DialogWindowProps {
  title: string;
  onClose: () => void;
  className?: string;
}

export default function DialogWindow({
  title,
  onClose,
  className,
  children,
}: PropsWithChildren<DialogWindowProps>) {
  const { t } = useTranslation();

  return (
    <div className={className ? `window ${className}` : "window"}>
      <div className="title-bar">
        <button aria-label={t.common.close} className="close" onClick={onClose} />
        <h1 className="title">{title}</h1>
        <button aria-label={t.common.resize} disabled className="hidden" />
      </div>
      <div className="separator" />
      <div className="modal-dialog">{children}</div>
    </div>
  );
}
