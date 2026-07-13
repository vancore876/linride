import { Bike, Bus, Car, Truck } from "lucide-react";
import { VehicleType } from "@/types/linride";

const options: Array<{ value: VehicleType; icon: typeof Car }> = [
  { value: "Bike", icon: Bike },
  { value: "Car", icon: Car },
  { value: "Van", icon: Bus },
  { value: "Truck", icon: Truck },
  { value: "Taxi route car", icon: Car }
];

type VehicleTypeSelectorProps = {
  value: VehicleType;
  onChange: (value: VehicleType) => void;
};

export function VehicleTypeSelector({ value, onChange }: VehicleTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => {
        const Icon = option.icon;
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`linride-pill flex items-center gap-2 text-left ${selected ? "linride-pill-active" : ""}`}
          >
            <Icon size={18} />
            {option.value}
          </button>
        );
      })}
    </div>
  );
}
