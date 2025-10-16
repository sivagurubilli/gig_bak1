import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  iconBg: string;
  borderColor: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  iconBg,
  borderColor,
}: StatsCardProps) {
  return (
    <Card className={cn("card-hover border-l-4", borderColor)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {change && (
              <p className={cn(
                "text-sm mt-1",
                {
                  'text-green-500': changeType === 'positive',
                  'text-red-500': changeType === 'negative',
                  'text-blue-500': changeType === 'neutral',
                }
              )}>
                {change}
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-lg", iconBg)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
