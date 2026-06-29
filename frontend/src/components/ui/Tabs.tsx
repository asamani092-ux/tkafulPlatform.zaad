interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

/** شريط تبويبات segmented موحّد (‎.tab-bar). */
export default function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="tab-bar">
      {tabs.map((t) => (
        <button key={t.key} data-active={active === t.key} onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
