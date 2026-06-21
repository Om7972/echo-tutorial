"use client";

import React, { useRef, useEffect, useCallback } from "react";
// @ts-ignore
import { VariableSizeList as List } from "react-window";

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
  estimatedItemHeight = 80,
  renderLoadMoreIndicator,
  className,
  autoScrollToBottom = true,
}: VirtualizedInfiniteScrollProps) {
  const listRef = useRef<List>(null);
  const rowHeights = useRef<Map<number, number>>(new Map());
  const lastItemCount = useRef(items.length);
  const initialScrollSet = useRef(false);

  // Handle item size
  const getItemSize = useCallback((index: number) => {
    return rowHeights.current.get(index) || estimatedItemHeight;
  }, [estimatedItemHeight]);

  // Set item size when measured
  const setItemSize = useCallback((index: number, size: number) => {
    if (rowHeights.current.get(index) !== size) {
      rowHeights.current.set(index, size);
      listRef.current?.resetAfterIndex(index);
    }
  }, []);

  // Auto scroll to bottom when new items are added
  useEffect(() => {
    if (autoScrollToBottom && items.length > lastItemCount.current && listRef.current) {
      listRef.current.scrollToItem(items.length - 1, "end");
    }
    lastItemCount.current = items.length;
  }, [items.length, autoScrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!initialScrollSet.current && items.length > 0 && listRef.current) {
      listRef.current.scrollToItem(items.length - 1, "end");
      initialScrollSet.current = true;
    }
  }, [items.length]);

  // Handle scroll to top to load previous
  const handleItemsRendered = useCallback(
    ({ visibleStartIndex }: { visibleStartIndex: number }) => {
      if (visibleStartIndex === 0 && hasMorePrevious && !isLoadingPrevious) {
        loadPrevious();
      }
    },
    [hasMorePrevious, isLoadingPrevious, loadPrevious]
  );

  // Inner element to support the "load more" indicator at the top
  const InnerElementType = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
  >(({ children, ...rest }, ref) => (
    <div {...rest} ref={ref}>
      {hasMorePrevious || isLoadingPrevious ? (
        <div style={{ height: "auto" }}>
          {renderLoadMoreIndicator ? (
            renderLoadMoreIndicator()
          ) : (
            <div className="flex justify-center py-4">
              {isLoadingPrevious ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-white" />
              ) : null}
            </div>
          )}
        </div>
      ) : null}
      {children}
    </div>
  ));
  InnerElementType.displayName = "InnerElementType";

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    const rowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (rowRef.current && item) {
        setItemSize(index, rowRef.current.offsetHeight);
      }
    }, [index, setItemSize, item]);

    return (
      <div style={style}>
        <div ref={rowRef}>{item && renderItem(item, index)}</div>
      </div>
    );
  };

  return (
    <div className={className}>
      <List
        ref={listRef}
        height="100%"
        width="100%"
        itemCount={items.length}
        itemSize={getItemSize}
        innerElementType={InnerElementType}
        onItemsRendered={handleItemsRendered}
        estimatedItemSize={estimatedItemHeight}
      >
        {Row}
      </List>
    </div>
  );
}
