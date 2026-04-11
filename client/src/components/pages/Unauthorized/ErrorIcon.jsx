import { ShieldOff } from "lucide-react";

export function ErrorIcon() {
  return (
    <div className="w-20 h-20 bg-forest/10 rounded-full flex items-center justify-center mx-auto">
      <ShieldOff className="w-12 h-12 md:w-14 md:h-14 lg:w-18 lg:h-18 text-forest/40" />
    </div>
  );
}
