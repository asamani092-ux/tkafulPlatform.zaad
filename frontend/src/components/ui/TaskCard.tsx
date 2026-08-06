import type { ReactNode } from "react";
import Card from "./Card";
import Badge from "./Badge";
import ProgressBar from "./ProgressBar";
import Chip from "./Chip";

interface TaskCardProps {
  title: string;
  description?: string;
  status?: string;
  projectName?: string;
  progress?: number;
  tags?: string[];
  children?: ReactNode;
  actions?: ReactNode;
}

/** بطاقة مهمة — عقد TaskCard. */
export default function TaskCard({
  title,
  description,
  status,
  projectName,
  progress,
  tags,
  children,
  actions,
}: TaskCardProps) {
  return (
    <Card>
      <div className="zad-task-card__head">
        <h3 className="text-lg font-bold text-primary">{title}</h3>
        <div className="flex flex-wrap gap-2">
          {projectName && <Badge variant="primary">{projectName}</Badge>}
          {status && <Badge variant="warning">{status}</Badge>}
        </div>
      </div>
      {description && <p className="mb-3 text-sm text-brand-gray">{description}</p>}
      {typeof progress === "number" && (
        <div className="mb-3">
          <span className="me-2 text-sm">{progress}%</span>
          <ProgressBar value={progress} />
        </div>
      )}
      {tags && tags.length > 0 && (
        <div className="zad-task-card__tags">
          {tags.map((t) => (
            <Chip key={t} active={false} tabIndex={-1} style={{ cursor: "default" }}>
              {t}
            </Chip>
          ))}
        </div>
      )}
      {children}
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </Card>
  );
}
