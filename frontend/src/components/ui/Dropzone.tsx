import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

interface DropzoneProps {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
}

/** منطقة سحب وإفلات — عقد Dropzone. */
export default function Dropzone({
  accept,
  multiple,
  onFiles,
  label = "اسحب الملف هنا أو استعرض",
  hint,
  error,
  disabled,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const emit = (list: FileList | null) => {
    if (!list?.length) return;
    onFiles(Array.from(list));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    emit(e.dataTransfer.files);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    emit(e.target.files);
    e.target.value = "";
  };

  return (
    <div
      className="zad-dropzone"
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled || undefined}
      data-active={dragging ? "true" : "false"}
      data-error={error ? "true" : "false"}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <strong>{label}</strong>
      {hint && <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-muted)" }}>{hint}</span>}
      {error && <span role="alert" style={{ fontSize: "var(--text-2xs)", color: "var(--danger-text)" }}>{error}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}
