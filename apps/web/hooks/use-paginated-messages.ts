"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useConvex } from "convex/react";
// import { api } from "@workspace/backend/convex/_generated/api";
// import { Id } from "@workspace/backend/convex/_generated/dataModel";

interface UsePaginatedMessagesOptions {
  conversationId: any;
  limit?: number;
  enabled?: boolean;
}

export function usePaginatedMessages({
  conversationId,
  limit = 20,
  enabled = true,
}: UsePaginatedMessagesOptions) {
  const convex = useConvex();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: async ({ pageParam }) => {
      const result = await (convex as any).query(
        "conversations:getMessagesPaginated", 
        {
          conversationId,
          limit,
          cursor: pageParam as string | undefined,
        }
      );
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    initialPageParam: undefined,
  });

  const allMessages = data?.pages.flatMap((page) => page.messages) ?? [];

  return {
    messages: allMessages,
    loadPrevious: fetchNextPage,
    hasMorePrevious: hasNextPage ?? false,
    isLoadingPrevious: isFetchingNextPage,
    isLoading,
    error,
    refetch,
  };
}
