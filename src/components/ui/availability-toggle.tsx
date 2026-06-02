import React from "react";

interface AvailabilityToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({
  checked,
  onChange,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? "bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]" : "bg-slate-700 shadow-inner"}
      `}
    >
      <span
        className={`
          pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out
          ${checked ? "translate-x-7" : "translate-x-0"}
        `}
      />
    </button>
  );
};
