interface Step {
  key: string;
  label: string;
}

interface StepperProps {
  steps: Step[];
  current: number;
}

/** خطوات نموذج — عقد Stepper. current يبدأ من 0. */
export default function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="zad-stepper" aria-label="خطوات النموذج">
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={step.key} className="zad-stepper__item" data-state={state}>
            <span className="zad-stepper__num" aria-hidden="true">{i + 1}</span>
            <span>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
