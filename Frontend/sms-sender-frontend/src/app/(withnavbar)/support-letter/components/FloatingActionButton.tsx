import { CheckCircle, Loader2 } from "lucide-react";

interface FloatingActionButtonProps {
  selectedCount: number;
  onApprove: () => void;
  isApproving?: boolean;
}

export const FloatingActionButton = ({ 
  selectedCount, 
  onApprove, 
  isApproving = false 
}: FloatingActionButtonProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 md:hidden">
      <button
        onClick={onApprove}
        disabled={isApproving}
        className={`text-white p-4 rounded-full shadow-2xl transition-all duration-200 transform ${
          isApproving
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:scale-110'
        }`}
      >
        {isApproving ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <CheckCircle className="w-6 h-6" />
        )}
      </button>
    </div>
  );
};
