import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Heart, Sparkles, Star, Crown } from "lucide-react";

interface GiftAnimationProps {
  giftName: string;
  coinCost: number;
  imageUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  isHovered?: boolean;
  showFloatingHearts?: boolean;
  tier?: "common" | "rare" | "legendary";
}

export function GiftAnimation({ 
  giftName,
  coinCost,
  imageUrl,
  size = "md", 
  className,
  isHovered = false,
  showFloatingHearts = true,
  tier = "common"
}: GiftAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [floatingElements, setFloatingElements] = useState<Array<{x: number, y: number, id: number, type: string}>>([]);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-20 h-20", 
    lg: "w-28 h-28",
    xl: "w-36 h-36"
  };

  const tierColors = {
    common: "from-blue-400 to-blue-600",
    rare: "from-purple-400 to-purple-600", 
    legendary: "from-yellow-400 to-yellow-600"
  };

  const tierIcons = {
    common: Heart,
    rare: Star,
    legendary: Crown
  };

  useEffect(() => {
    if (isHovered && showFloatingHearts) {
      setIsAnimating(true);
      generateFloatingElements();
      const timer = setTimeout(() => setIsAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isHovered, showFloatingHearts]);

  const generateFloatingElements = () => {
    const elements = Array.from({ length: 8 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      id: i,
      type: tier === "legendary" ? "crown" : tier === "rare" ? "star" : "heart"
    }));
    setFloatingElements(elements);
    
    setTimeout(() => setFloatingElements([]), 1800);
  };

  const getIcon = () => {
    const IconComponent = tierIcons[tier];
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
      {/* Floating Elements */}
      {showFloatingHearts && floatingElements.map((element) => (
        <div
          key={element.id}
          className="absolute pointer-events-none animate-bounce"
          style={{
            left: `${element.x}%`,
            top: `${element.y}%`,
            animationDuration: `${1 + Math.random()}s`,
            animationDelay: `${element.id * 0.1}s`
          }}
        >
          <div className="text-red-500 opacity-80">
            {element.type === "crown" && <Crown className="w-3 h-3" />}
            {element.type === "star" && <Star className="w-3 h-3" />}
            {element.type === "heart" && <Heart className="w-3 h-3 fill-current" />}
          </div>
        </div>
      ))}

      {/* Main Gift Container */}
      <div
        className={cn(
          "relative transform-gpu transition-all duration-500 ease-out",
          sizeClasses[size],
          isAnimating ? "animate-pulse scale-110" : "scale-100",
          isHovered ? "scale-105" : "scale-100"
        )}
        style={{
          transformStyle: "preserve-3d",
          animation: isAnimating ? "giftBounce 1s ease-out" : undefined
        }}
      >
        {/* Gift Box Base */}
        <div className={cn(
          "absolute inset-0 rounded-xl shadow-lg",
          `bg-gradient-to-br ${tierColors[tier]}`
        )}>
          {/* Ribbon */}
          <div className="absolute inset-x-0 top-1/2 h-2 bg-gradient-to-r from-red-400 to-red-600 transform -translate-y-1/2"></div>
          <div className="absolute inset-y-0 left-1/2 w-2 bg-gradient-to-b from-red-400 to-red-600 transform -translate-x-1/2"></div>
          
          {/* Bow */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
            <div className="w-4 h-3 bg-red-500 rounded-full relative">
              <div className="absolute inset-0 bg-red-400 rounded-full transform scale-75"></div>
            </div>
          </div>

          {/* Gift Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={giftName}
                className="w-8 h-8 object-cover rounded-full"
              />
            ) : (
              <div className="text-white">
                {getIcon()}
              </div>
            )}
            
            <div className={cn(
              "text-center mt-1",
              size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
            )}>
              <div className="text-white font-bold text-xs truncate">
                {giftName}
              </div>
              <div className="text-yellow-200 text-xs">
                {coinCost} coins
              </div>
            </div>
          </div>

          {/* Shine Effect */}
          <div 
            className={cn(
              "absolute inset-0 rounded-xl transition-opacity duration-300",
              "bg-gradient-to-tr from-white to-transparent opacity-0",
              isHovered ? "opacity-20" : "opacity-0"
            )}
          ></div>
        </div>

        {/* Tier Badge */}
        {tier !== "common" && (
          <div className="absolute -top-2 -right-2">
            <div className={cn(
              "px-2 py-1 rounded-full text-xs font-bold text-white",
              tier === "rare" ? "bg-purple-600" : "bg-yellow-600"
            )}>
              {tier.toUpperCase()}
            </div>
          </div>
        )}

        {/* Glow Effect */}
        <div 
          className={cn(
            "absolute inset-0 rounded-xl transition-opacity duration-300 blur-md",
            `bg-gradient-to-br ${tierColors[tier]} opacity-0`,
            isHovered ? "opacity-40" : "opacity-0"
          )}
          style={{ zIndex: -1 }}
        ></div>
      </div>

      {/* Sparkle Effects */}
      {isAnimating && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <Sparkles
              key={i}
              className={cn(
                "absolute w-4 h-4 text-yellow-400 animate-ping",
                "opacity-60"
              )}
              style={{
                left: `${20 + (i * 15)}%`,
                top: `${10 + (i * 10)}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Add custom keyframes for gift bounce animation
const style = document.createElement('style');
style.textContent = `
  @keyframes giftBounce {
    0% { transform: scale(1) rotateY(0deg); }
    25% { transform: scale(1.1) rotateY(10deg); }
    50% { transform: scale(1.05) rotateY(-10deg); }
    75% { transform: scale(1.1) rotateY(5deg); }
    100% { transform: scale(1) rotateY(0deg); }
  }
`;
document.head.appendChild(style);