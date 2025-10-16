import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CoinAnimationProps {
  coinAmount: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  isHovered?: boolean;
  showSparkles?: boolean;
}

export function CoinAnimation({ 
  coinAmount, 
  size = "md", 
  className,
  isHovered = false,
  showSparkles = true
}: CoinAnimationProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [sparklePositions, setSparklePositions] = useState<Array<{x: number, y: number, id: number}>>([]);

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16", 
    lg: "w-24 h-24",
    xl: "w-32 h-32"
  };

  const coinSizes = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-20 h-20", 
    xl: "w-28 h-28"
  };

  useEffect(() => {
    if (isHovered) {
      setIsSpinning(true);
      if (showSparkles) {
        generateSparkles();
      }
      const timer = setTimeout(() => setIsSpinning(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isHovered, showSparkles]);

  const generateSparkles = () => {
    const sparkles = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      id: i
    }));
    setSparklePositions(sparkles);
    
    setTimeout(() => setSparklePositions([]), 1500);
  };

  const formatCoinAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  };

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
      {/* Sparkle Effects */}
      {showSparkles && sparklePositions.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute pointer-events-none animate-ping"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            animationDuration: '1s',
            animationDelay: `${sparkle.id * 0.1}s`
          }}
        >
          <div className="w-1 h-1 bg-yellow-400 rounded-full shadow-lg"></div>
        </div>
      ))}

      {/* Coin Container */}
      <div
        className={cn(
          "relative transform-gpu transition-all duration-500 ease-out",
          coinSizes[size],
          isSpinning ? "animate-spin" : "",
          isHovered ? "scale-110" : "scale-100"
        )}
        style={{
          transformStyle: "preserve-3d",
          animation: isSpinning ? "spin3d 2s ease-out" : undefined
        }}
      >
        {/* Coin Base */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 shadow-lg">
          {/* Inner Ring */}
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-700 shadow-inner">
            {/* Center Content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn(
                "font-bold text-yellow-900 drop-shadow-sm",
                size === "sm" ? "text-xs" : "",
                size === "md" ? "text-sm" : "",
                size === "lg" ? "text-base" : "",
                size === "xl" ? "text-lg" : ""
              )}>
                {formatCoinAmount(coinAmount)}
              </span>
            </div>
            
            {/* Decorative Pattern */}
            <div className="absolute inset-2 rounded-full border border-yellow-600 opacity-30"></div>
            <div className="absolute inset-3 rounded-full border border-yellow-500 opacity-20"></div>
          </div>
          
          {/* Highlight Effect */}
          <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-yellow-200 opacity-60 blur-sm"></div>
        </div>

        {/* Glow Effect */}
        <div 
          className={cn(
            "absolute inset-0 rounded-full transition-opacity duration-300",
            "bg-yellow-400 opacity-0 blur-md",
            isHovered ? "opacity-30" : "opacity-0"
          )}
        ></div>
      </div>

      {/* Coin Amount Label */}
      {size === "lg" || size === "xl" ? (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
          <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-full shadow-sm">
            {coinAmount.toLocaleString()} coins
          </span>
        </div>
      ) : null}
    </div>
  );
}

// Add custom keyframes for 3D spinning animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin3d {
    0% { transform: rotateY(0deg) rotateX(0deg); }
    25% { transform: rotateY(90deg) rotateX(15deg); }
    50% { transform: rotateY(180deg) rotateX(0deg); }
    75% { transform: rotateY(270deg) rotateX(-15deg); }
    100% { transform: rotateY(360deg) rotateX(0deg); }
  }
`;
document.head.appendChild(style);