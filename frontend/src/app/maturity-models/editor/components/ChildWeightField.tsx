import WeightInput from "./WeightInput";

export default function ChildWeightField({
  id,
  name,
  value,
  allowZero = false,
  onChange,
  compact = false,
}: {
  compact?: boolean;
  id: string;
  name: string;
  value: number;
  allowZero?: boolean;
  onChange: (weight: number) => void;
}) {
  return (
    <label className={compact ? "col-start-2 row-start-2 w-20 text-xs font-medium text-gray-500 @lg:col-start-3 @lg:row-start-1" : "w-28 shrink-0 text-xs font-medium text-gray-600"}>
      <span className={compact ? "@lg:sr-only" : ""}>Weight<span className="sr-only"> for {name}</span></span>
      <WeightInput
        id={id}
        value={value}
        allowZero={allowZero}
        onChange={onChange}
        className="block"
      />
    </label>
  );
}
