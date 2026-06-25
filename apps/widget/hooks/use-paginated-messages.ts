// @ts-nocheck
"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";

interface UsePaginatedMessagesOptions {
  conversationId: Id<"conversations">;
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
  } = useInfiniteQuery<
    any,
    Error,
    any,
    any[],
    string | null
  >({
    queryKey: ["messages", conversationId],
    queryFn: async ({ pageParam }) => {
      const result = await convex.query(api.conversations.getMessagesPaginated, {
        conversationId,
        limit,
        cursor: pageParam ?? undefined,
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    initialPageParam: null as string | null,
  });

  const allMessages = data?.pages.flatMap((page: any) => page.messages) ?? [];

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
