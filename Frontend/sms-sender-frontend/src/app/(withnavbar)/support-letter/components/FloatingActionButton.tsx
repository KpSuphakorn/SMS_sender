import { CheckCircle } from "lucide-react";

interface FloatingActionButtonProps {
  selectedCount: number;
  onApprove: () => void;
}

export const FloatingActionButton = ({ selectedCount, onApprove }: FloatingActionButtonProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 md:hidden">
      <button
        onClick={onApprove}
        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-full shadow-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-110"
      >
        <CheckCircle className="w-6 h-6" />
      </button>
    </div>
  );
};
