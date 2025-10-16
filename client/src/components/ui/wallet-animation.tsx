import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, DollarSign, Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WalletAnimationProps {
  balance: number;
  currency?: string;
  transactions?: {
    id: string;
    amount: number;
    type: 'credit' | 'debit';
    description: string;
    timestamp: Date;
  }[];
  showTransactions?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  animated?: boolean;
}

export function WalletAnimation({ 
  balance, 
  currency = "INR",
  transactions = [],
  showTransactions = true,
  size = "md",
  className,
  animated = true
}: WalletAnimationProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [pulseEffect, setPulseEffect] = useState(false);
  const [floatingCoins, setFloatingCoins] = useState<Array<{x: number, y: number, id: number}>>([]);

  const sizeClasses = {
    sm: "w-64 h-32",
    md: "w-80 h-40",
    lg: "w-96 h-48"
  };

  useEffect(() => {
    if (animated && transactions.length > 0) {
      setPulseEffect(true);
      generateFloatingCoins();
      const timer = setTimeout(() => setPulseEffect(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [transactions.length, animated]);

  const generateFloatingCoins = () => {
    const coins = Array.from({ length: 5 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      id: i
    }));
    setFloatingCoins(coins);
    
    setTimeout(() => setFloatingCoins([]), 1500);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    return type === 'credit' ? 
      <ArrowUpRight className="w-4 h-4 text-green-500" /> : 
      <ArrowDownLeft className="w-4 h-4 text-red-500" />;
  };

  const getTransactionColor = (type: string) => {
    return type === 'credit' ? 'text-green-600' : 'text-red-600';
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const recentTransactions = transactions.slice(0, 3);

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {/* Main Wallet Card */}
      <motion.div
        className={cn(
          "relative h-full bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-xl shadow-xl overflow-hidden",
          "border border-blue-500/30",
          pulseEffect && animated ? "animate-pulse" : ""
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-16 h-16 border border-white rounded-full"></div>
          <div className="absolute bottom-4 left-4 w-12 h-12 border border-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white rounded-full"></div>
        </div>

        {/* Floating Coins */}
        <AnimatePresence>
          {floatingCoins.map((coin) => (
            <motion.div
              key={coin.id}
              initial={{ opacity: 0, scale: 0, y: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                y: [0, -30, -60]
              }}
              transition={{
                duration: 1.5,
                delay: coin.id * 0.1
              }}
              className="absolute pointer-events-none"
              style={{
                left: `${coin.x}%`,
                top: `${coin.y}%`
              }}
            >
              <Coins className="w-6 h-6 text-yellow-400" />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Card Content */}
        <div className="relative z-10 h-full p-6 flex flex-col justify-between text-white">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={pulseEffect ? { rotate: [0, 10, -10, 0] } : {}}
                transition={{ duration: 0.5 }}
              >
                <Wallet className="w-6 h-6" />
              </motion.div>
              <span className="font-medium">Wallet Balance</span>
            </div>
            
            <motion.div
              className="flex items-center gap-1"
              animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
            >
              <DollarSign className="w-5 h-5" />
              <span className="text-sm">{currency}</span>
            </motion.div>
          </div>

          {/* Balance */}
          <div className="text-center">
            <motion.div
              className="text-3xl font-bold mb-1"
              animate={pulseEffect ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              {formatCurrency(balance)}
            </motion.div>
            <div className="text-blue-200 text-sm">Available Balance</div>
          </div>

          {/* Shine Effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0"
            animate={isHovered ? { 
              opacity: [0, 0.1, 0],
              x: [-100, 100, 200]
            } : {}}
            transition={{ duration: 1 }}
          />
        </div>

        {/* Glow Effect */}
        <motion.div
          className="absolute inset-0 bg-blue-500 rounded-xl blur-xl opacity-0"
          animate={isHovered ? { opacity: 0.2 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ zIndex: -1 }}
        />
      </motion.div>

      {/* Recent Transactions */}
      {showTransactions && recentTransactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recent Transactions
            </h3>
          </div>
          
          <div className="divide-y divide-gray-100">
            <AnimatePresence>
              {recentTransactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        transaction.type === 'credit' ? "bg-green-100" : "bg-red-100"
                      )}>
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {transaction.description}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTime(transaction.timestamp)}
                        </div>
                      </div>
                    </div>
                    
                    <div className={cn(
                      "font-bold text-sm",
                      getTransactionColor(transaction.type)
                    )}>
                      {transaction.type === 'credit' ? '+' : '-'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {transactions.length > 3 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                View all transactions ({transactions.length})
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}