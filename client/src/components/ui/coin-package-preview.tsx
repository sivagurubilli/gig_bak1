import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CoinAnimation } from "./coin-animation";
import { formatCurrency } from "@/lib/utils";
import { Sparkles, Star, TrendingUp, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoinPackage {
  id: string;
  name: string;
  coinAmount: number;
  price: string;
  description?: string | null;
  discount?: number | null;
  isActive: boolean;
  createdAt: Date;
}

interface CoinPackagePreviewProps {
  package: CoinPackage;
  isPopular?: boolean;
  isPremium?: boolean;
  onSelect?: (pkg: CoinPackage) => void;
  className?: string;
}

export function CoinPackagePreview({ 
  package: pkg, 
  isPopular = false, 
  isPremium = false,
  onSelect,
  className 
}: CoinPackagePreviewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  const handleClick = () => {
    setIsSelected(!isSelected);
    onSelect?.(pkg);
  };

  const getPackageIcon = () => {
    if (isPremium) return <Crown className="w-4 h-4 text-purple-600" />;
    if (isPopular) return <Star className="w-4 h-4 text-orange-500" />;
    if (pkg.coinAmount >= 1000) return <TrendingUp className="w-4 h-4 text-green-600" />;
    return <Sparkles className="w-4 h-4 text-blue-500" />;
  };

  const getGradientClass = () => {
    if (isPremium) return "from-purple-50 to-purple-100 border-purple-200";
    if (isPopular) return "from-orange-50 to-orange-100 border-orange-200";
    return "from-blue-50 to-blue-100 border-blue-200";
  };

  const getHoverGradient = () => {
    if (isPremium) return "from-purple-100 to-purple-200";
    if (isPopular) return "from-orange-100 to-orange-200";
    return "from-blue-100 to-blue-200";
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-300 transform-gpu",
        "hover:shadow-xl hover:scale-105 active:scale-95",
        isSelected ? "ring-2 ring-primary ring-offset-2" : "",
        isHovered ? `bg-gradient-to-br ${getHoverGradient()}` : `bg-gradient-to-br ${getGradientClass()}`,
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Popular/Premium Badge */}
      {(isPopular || isPremium) && (
        <div className="absolute top-2 right-2 z-10">
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs font-semibold",
              isPremium ? "bg-purple-600 text-white" : "bg-orange-500 text-white"
            )}
          >
            {isPremium ? "PREMIUM" : "POPULAR"}
          </Badge>
        </div>
      )}

      {/* Discount Badge */}
      {pkg.discount && pkg.discount > 0 && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="destructive" className="text-xs font-bold">
            -{pkg.discount}%
          </Badge>
        </div>
      )}

      <CardContent className="p-6 text-center">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {getPackageIcon()}
          <h3 className="text-lg font-bold text-gray-800">{pkg.name}</h3>
        </div>

        {/* 3D Coin Animation */}
        <div className="mb-6 flex justify-center">
          <CoinAnimation
            coinAmount={pkg.coinAmount}
            size="lg"
            isHovered={isHovered}
            showSparkles={isHovered}
            className="drop-shadow-lg"
          />
        </div>

        {/* Package Details */}
        <div className="space-y-3 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {pkg.coinAmount.toLocaleString()} Coins
            </div>
            <div className="text-sm text-gray-600">
              {(pkg.coinAmount / parseFloat(pkg.price)).toFixed(0)} coins per $
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(pkg.price)}
            </div>
            {pkg.discount && (
              <div className="text-sm text-gray-500 line-through">
                {formatCurrency((parseFloat(pkg.price) / (1 - pkg.discount / 100)).toFixed(2))}
              </div>
            )}
          </div>

          {pkg.description && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {pkg.description}
            </p>
          )}
        </div>

        {/* Value Proposition */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span>Best value for gaming</span>
          </div>
        </div>

        {/* Action Button */}
        <Button
          className={cn(
            "w-full font-semibold transition-all duration-200",
            isPremium ? "bg-purple-600 hover:bg-purple-700" : "",
            isPopular ? "bg-orange-500 hover:bg-orange-600" : "",
            !isPremium && !isPopular ? "bg-blue-600 hover:bg-blue-700" : "",
            isHovered ? "shadow-lg transform scale-105" : ""
          )}
          size="lg"
        >
          {isSelected ? "Selected" : "Select Package"}
        </Button>

        {/* Features List */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div>✓ Instant delivery</div>
            <div>✓ Secure payment</div>
            <div>✓ 24/7 support</div>
          </div>
        </div>
      </CardContent>

      {/* Animated Background Effects */}
      {isHovered && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-transparent to-yellow-400 opacity-30 blur-sm animate-pulse"></div>
        </>
      )}
    </Card>
  );
}

// Grid layout component for multiple packages
interface CoinPackageGridProps {
  packages: CoinPackage[];
  onPackageSelect?: (pkg: CoinPackage) => void;
  className?: string;
}

export function CoinPackageGrid({ packages, onPackageSelect, className }: CoinPackageGridProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6", className)}>
      {packages.map((pkg, index) => (
        <CoinPackagePreview
          key={pkg.id}
          package={pkg}
          isPopular={index === 1} // Second package is popular
          isPremium={index === packages.length - 1} // Last package is premium
          onSelect={onPackageSelect}
        />
      ))}
    </div>
  );
}