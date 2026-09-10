import type { LucideIcon } from "lucide-react";
import { BarChart3, BriefcaseBusiness, Cloud, Code2, Compass, Database, Layers3, Settings2, ShieldCheck, Users } from "lucide-react";
import { resolveDomainColor, resolveDomainIcon } from "@/lib/domainAppearance";

const icons: Record<string, LucideIcon> = {
  layers: Layers3, shield: ShieldCheck, code: Code2, database: Database, users: Users,
  settings: Settings2, compass: Compass, chart: BarChart3, cloud: Cloud, briefcase: BriefcaseBusiness,
};

const themes: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200", emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200", amber: "bg-amber-50 text-amber-700 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200", slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function DomainIcon({ iconKey, colorKey, size = 20, name = "", className = "" }: {
  iconKey?: string | null; colorKey?: string | null; size?: number; name?: string; className?: string;
}) {
  const Icon = icons[resolveDomainIcon(iconKey, name)] ?? Layers3;
  const theme = themes[resolveDomainColor(colorKey, name)] ?? themes.slate;
  const boxSize = Math.max(32, size + 16);
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${theme} ${className}`} style={{ width: boxSize, height: boxSize }} aria-hidden="true"><Icon size={size} /></span>;
}
