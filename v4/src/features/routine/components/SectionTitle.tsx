interface Props {
  icon: string;
  text: string;
  right?: React.ReactNode;
}

export function SectionTitle({ icon, text, right }: Props) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        <span>{icon}</span>{text}
      </h3>
      {right}
    </div>
  );
}
