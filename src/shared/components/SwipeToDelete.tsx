import { useState, useRef, type ReactNode, type TouchEvent } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeToDeleteProps {
  children: ReactNode;
  onDelete: () => void;
}

const DELETE_WIDTH = 72;
const THRESHOLD = 40;

export function SwipeToDelete({ children, onDelete }: SwipeToDeleteProps) {
  const [offset, setOffset] = useState(0);
  const [swiped, setSwiped] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);
  const isScrolling = useRef<boolean | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    tracking.current = true;
    isScrolling.current = null;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!tracking.current) return;

    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Determine scroll direction on first significant move
    if (isScrolling.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isScrolling.current = Math.abs(dy) > Math.abs(dx);
    }

    if (isScrolling.current) {
      tracking.current = false;
      setOffset(swiped ? -DELETE_WIDTH : 0);
      return;
    }

    // Prevent vertical scroll while swiping horizontally
    e.preventDefault();

    if (swiped) {
      setOffset(Math.min(0, Math.max(-DELETE_WIDTH, -DELETE_WIDTH + dx)));
    } else {
      setOffset(Math.min(0, Math.max(-DELETE_WIDTH - 20, dx)));
    }
  };

  const handleTouchEnd = () => {
    tracking.current = false;
    isScrolling.current = null;

    if (swiped) {
      if (offset > -DELETE_WIDTH + THRESHOLD) {
        setOffset(0);
        setSwiped(false);
      } else {
        setOffset(-DELETE_WIDTH);
      }
    } else {
      if (offset < -THRESHOLD) {
        setOffset(-DELETE_WIDTH);
        setSwiped(true);
      } else {
        setOffset(0);
      }
    }
  };

  const handleDelete = () => {
    setOffset(0);
    setSwiped(false);
    onDelete();
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Red delete zone behind */}
      <div className="absolute inset-y-0 right-0 w-[72px] flex items-center justify-center bg-danger">
        <button onClick={handleDelete} className="flex flex-col items-center gap-0.5 text-white">
          <Trash2 size={18} />
          <span className="text-[10px] font-medium">Delete</span>
        </button>
      </div>

      {/* Swipeable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: tracking.current ? 'none' : 'transform 0.2s ease-out',
        }}
        className="relative z-10 bg-surface"
      >
        {children}
      </div>
    </div>
  );
}
