// @ts-nocheck
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";

export function useMessageReactions(conversationId: Id<"conversations">) {
  const addReaction = useMutation(api.conversations.addReaction);
  const removeReaction = useMutation(api.conversations.removeReaction);

  const toggleReaction = (messageId: Id<"messages">, userId: string, emoji: string) => {
    // First try to remove, if it doesn't exist, add
    removeReaction({ messageId, userId, emoji }).then(() => {
      // If removal succeeded, do nothing
    }).catch(() => {
      // If removal failed, add
      addReaction({ messageId, conversationId, userId, emoji });
    });
  };

  return { toggleReaction };
}
