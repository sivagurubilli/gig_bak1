import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Crown, Star, TrendingUp, Zap } from "lucide-react";

interface LeaderboardEntry {
  id: number;
  rank: number;
  username: string;
  name: string;
  avatar: string;
  score: number;
  badgeLevel: number;
  change?: 'up' | 'down' | 'same';
}

interface LeaderboardAnimationProps {
  entries: LeaderboardEntry[];
  type: 'coins' | 'gifts' | 'level';
  className?: string;
  showPodium?: boolean;
  animated?: boolean;
}

export function LeaderboardAnimation({ 
  entries, 
  type, 
  className,
  showPodium = true,
  animated = true
}: LeaderboardAnimationProps) {
  const [hoveredEntry, setHoveredEntry] = useState<number | null>(null);
  const [animationStage, setAnimationStage] = useState(0);

  useEffect(() => {
    if (animated) {
      const timer = setInterval(() => {
        setAnimationStage(prev => (prev + 1) % 4);
      }, 2000);
      return () => clearInterval(timer);
    }
  }, [animated]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <Trophy className="w-5 h-5 text-gray-500" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return "from-yellow-400 via-yellow-500 to-yellow-600";
      case 2: return "from-gray-300 via-gray-400 to-gray-500";
      case 3: return "from-amber-500 via-amber-600 to-amber-700";
      default: return "from-blue-400 via-blue-500 to-blue-600";
    }
  };

  const getChangeIcon = (change?: string) => {
    switch (change) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      default: return null;
    }
  };

  const formatScore = (score: number) => {
    if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
    if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
    return score.toLocaleString();
  };

  const topThree = entries.slice(0, 3);
  const otherEntries = entries.slice(3);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Podium View for Top 3 */}
      {showPodium && topThree.length >= 3 && (
        <div className="relative">
          <div className="flex items-end justify-center gap-4 mb-8">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <div 
                className={cn(
                  "relative mb-2 p-4 rounded-xl shadow-lg transition-all duration-500",
                  "bg-gradient-to-br from-gray-100 to-gray-200",
                  hoveredEntry === topThree[1]?.id ? "scale-110 shadow-xl" : "scale-100"
                )}
                onMouseEnter={() => setHoveredEntry(topThree[1]?.id)}
                onMouseLeave={() => setHoveredEntry(null)}
              >
                <div className="w-16 h-16 mx-auto mb-2 relative">
                  <img 
                    src={topThree[1]?.avatar} 
                    alt={topThree[1]?.name}
                    className="w-full h-full rounded-full object-cover border-4 border-gray-400"
                  />
                  <div className="absolute -top-2 -right-2">
                    <Medal className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-800">{topThree[1]?.name}</div>
                  <div className="text-sm text-gray-600">{formatScore(topThree[1]?.score)}</div>
                </div>
              </div>
              <div className="w-20 h-16 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">2</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center">
              <div 
                className={cn(
                  "relative mb-2 p-6 rounded-xl shadow-lg transition-all duration-500",
                  "bg-gradient-to-br from-yellow-100 to-yellow-200",
                  hoveredEntry === topThree[0]?.id ? "scale-110 shadow-xl" : "scale-100",
                  animated && animationStage % 2 === 0 ? "animate-pulse" : ""
                )}
                onMouseEnter={() => setHoveredEntry(topThree[0]?.id)}
                onMouseLeave={() => setHoveredEntry(null)}
              >
                <div className="w-20 h-20 mx-auto mb-2 relative">
                  <img 
                    src={topThree[0]?.avatar} 
                    alt={topThree[0]?.name}
                    className="w-full h-full rounded-full object-cover border-4 border-yellow-400"
                  />
                  <div className="absolute -top-3 -right-3">
                    <Crown className="w-10 h-10 text-yellow-500" />
                  </div>
                  {animated && (
                    <div className="absolute inset-0 rounded-full border-4 border-yellow-400 animate-ping opacity-75"></div>
                  )}
                </div>
                <div className="text-center">
                  <div className="font-bold text-yellow-800 text-lg">{topThree[0]?.name}</div>
                  <div className="text-yellow-700 font-semibold">{formatScore(topThree[0]?.score)}</div>
                </div>
              </div>
              <div className="w-24 h-20 bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-lg flex items-center justify-center">
                <span className="text-white font-bold text-2xl">1</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div 
                className={cn(
                  "relative mb-2 p-4 rounded-xl shadow-lg transition-all duration-500",
                  "bg-gradient-to-br from-amber-100 to-amber-200",
                  hoveredEntry === topThree[2]?.id ? "scale-110 shadow-xl" : "scale-100"
                )}
                onMouseEnter={() => setHoveredEntry(topThree[2]?.id)}
                onMouseLeave={() => setHoveredEntry(null)}
              >
                <div className="w-16 h-16 mx-auto mb-2 relative">
                  <img 
                    src={topThree[2]?.avatar} 
                    alt={topThree[2]?.name}
                    className="w-full h-full rounded-full object-cover border-4 border-amber-600"
                  />
                  <div className="absolute -top-2 -right-2">
                    <Medal className="w-8 h-8 text-amber-600" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-amber-800">{topThree[2]?.name}</div>
                  <div className="text-sm text-amber-700">{formatScore(topThree[2]?.score)}</div>
                </div>
              </div>
              <div className="w-20 h-12 bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">3</span>
              </div>
            </div>
          </div>

          {/* Confetti Effect */}
          {animated && animationStage === 1 && (
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-bounce"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 50}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '1s'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Other Entries */}
      <div className="space-y-2">
        {otherEntries.map((entry, index) => (
          <div
            key={entry.id}
            className={cn(
              "flex items-center p-4 rounded-lg transition-all duration-300",
              "bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md",
              hoveredEntry === entry.id ? "transform scale-105 shadow-lg" : ""
            )}
            onMouseEnter={() => setHoveredEntry(entry.id)}
            onMouseLeave={() => setHoveredEntry(null)}
          >
            {/* Rank */}
            <div className="flex items-center justify-center w-12 h-12 mr-4">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full text-white font-bold",
                `bg-gradient-to-br ${getRankColor(entry.rank)}`
              )}>
                {entry.rank}
              </div>
            </div>

            {/* Avatar */}
            <div className="relative mr-4">
              <img 
                src={entry.avatar} 
                alt={entry.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-300"
              />
              {entry.badgeLevel > 0 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{entry.badgeLevel}</span>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{entry.name}</div>
              <div className="text-sm text-gray-600">@{entry.username}</div>
            </div>

            {/* Score */}
            <div className="text-right mr-4">
              <div className="font-bold text-gray-900">{formatScore(entry.score)}</div>
              <div className="text-sm text-gray-600 capitalize">{type}</div>
            </div>

            {/* Change Indicator */}
            <div className="flex items-center">
              {getChangeIcon(entry.change)}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Stars Animation */}
      {animated && (
        <div className="fixed inset-0 pointer-events-none z-10">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "absolute w-4 h-4 text-yellow-400 animate-pulse",
                animationStage === 2 ? "opacity-100" : "opacity-0"
              )}
              style={{
                left: `${20 + (i * 20)}%`,
                top: `${10 + (i * 15)}%`,
                animationDelay: `${i * 0.3}s`,
                transition: 'opacity 0.5s ease-in-out'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}