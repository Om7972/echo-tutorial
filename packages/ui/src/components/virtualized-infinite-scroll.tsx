"use client";

import React, { useRef, useEffect, useCallback } from "react";

interface Message {
  _id: string;
  [key: string]: any;
}

interface VirtualizedInfiniteScrollProps {
  /** All messages (including loaded pages) */
  items: Message[];
  /** Function to load previous messages */
  loadPrevious: () => void;
  /** Whether we're loading previous messages */
  isLoadingPrevious: boolean;
  /** Whether there are more previous messages to load */
  hasMorePrevious: boolean;
  /** Render function for each item */
  renderItem: (item: Message, index: number) => React.ReactNode;
  /** Estimated item height */
  estimatedItemHeight?: number;
  /** Optional header/loading indicator for previous messages */
  renderLoadMoreIndicator?: () => React.ReactNode;
  /** Optional class name for container */
  className?: string;
  /** Auto scroll to bottom when new items are added */
  autoScrollToBottom?: boolean;
}

export function VirtualizedInfiniteScroll({
  items,
  loadPrevious,
  isLoadingPrevious,
  hasMorePrevious,
  renderItem,
  renderLoadMoreIndicator,
  className,
  autoScrollToBottom = true,
}: VirtualizedInfiniteScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastItemCount = useRef(items.length);

  // Auto scroll to bottom when new items are added
  useEffect(() => {
    if (autoScrollToBottom && items.length > lastItemCount.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    lastItemCount.current = items.length;
  }, [items.length, autoScrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (items.length > 0 && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [items.length]);

  // Handle scroll to top to load previous
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop } = containerRef.current;
    if (scrollTop <= 10 && hasMorePrevious && !isLoadingPrevious) {
      loadPrevious();
    }
  }, [hasMorePrevious, isLoadingPrevious, loadPrevious]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto h-full w-full ${className || ""}`}
    >
      {hasMorePrevious || isLoadingPrevious ? (
        <div>
          {renderLoadMoreIndicator ? (
            renderLoadMoreIndicator()
          ) : (
            <div className="flex justify-center py-4">
              {isLoadingPrevious ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-400" />
              ) : null}
            </div>
          )}
        </div>
      ) : null}
      <div className="flex flex-col gap-4 p-4">
        {items.map((item, index) => (
          <div key={item._id || index}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
