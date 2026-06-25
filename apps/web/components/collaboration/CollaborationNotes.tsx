// @ts-nocheck
"use client";

/**
 * Collaboration Notes Component
 * Rich text editor with mentions, tags, and permissions
 */

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";

interface CollaborationNotesProps {
  orgId: string;
  conversationId?: Id<"unified_conversations">;
  customerId?: Id<"unified_customers">;
  currentUserId: string;
  currentUserName: string;
}

export function CollaborationNotes({
  orgId,
  conversationId,
  customerId,
  currentUserId,
  currentUserName,
}: CollaborationNotesProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"private" | "team" | "mentioned" | "assigned">("team");
  const [tags, setTags] = useState<string[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterVisibility, setFilterVisibility] = useState<string[]>([]);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Queries
  const notes = useQuery(api.collaboration.notes.getNotes, {
    orgId,
    conversationId,
    customerId,
    userId: currentUserId,
    visibility: filterVisibility.length > 0 ? filterVisibility : undefined,
    tags: filterTags.length > 0 ? filterTags : undefined,
    isPinned: showPinnedOnly ? true : undefined,
  });

  const availableTags = useQuery(api.collaboration.tags.getTags, {
    orgId,
  });

  // Mutations
  const createNote = useMutation(api.collaboration.notes.createNote);
  const updateNote = useMutation(api.collaboration.notes.updateNote);
  const deleteNote = useMutation(api.collaboration.notes.deleteNote);
  const togglePin = useMutation(api.collaboration.notes.togglePin);

  const handleCreateNote = async () => {
    if (!content.trim()) return;

    try {
      await createNote({
        orgId,
        conversationId,
        customerId,
        content,
        contentFormat: "markdown",
        plainText: content, // In real app, strip markdown
        authorId: currentUserId,
        authorName: currentUserName,
        visibility,
        tags,
        mentions,
      });

      // Reset form
      setContent("");
      setTags([]);
      setMentions([]);
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      await deleteNote({
        noteId: noteId as Id<"collaboration_notes">,
        orgId,
        userId: currentUserId,
      });
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const handleTogglePin = async (noteId: string) => {
    try {
      await togglePin({
        noteId: noteId as Id<"collaboration_notes">,
        orgId,
        userId: currentUserId,
      });
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const insertMention = () => {
    const selection = editorRef.current?.selectionStart || 0;
    const newContent = content.slice(0, selection) + "@" + content.slice(selection);
    setContent(newContent);
    editorRef.current?.focus();
  };

  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Team Notes</h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {isCreating ? "Cancel" : "+ New Note"}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => setShowPinnedOnly(!showPinnedOnly)}
              className={`px-3 py-1 rounded-full text-sm ${
                showPinnedOnly ? "bg-yellow-600 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              📌 Pinned Only
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {["private", "team", "mentioned", "assigned"].map((vis) => (
              <button
                key={vis}
                onClick={() => {
                  if (filterVisibility.includes(vis)) {
                    setFilterVisibility(filterVisibility.filter(v => v !== vis));
                  } else {
                    setFilterVisibility([...filterVisibility, vis]);
                  }
                }}
                className={`px-3 py-1 rounded-full text-sm capitalize ${
                  filterVisibility.includes(vis)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {vis}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Create Note Form */}
      {isCreating && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium mb-2">Visibility</label>
              <div className="flex gap-2">
                {[
                  { value: "private", label: "🔒 Private", desc: "Only you" },
                  { value: "team", label: "👥 Team", desc: "All team members" },
                  { value: "mentioned", label: "@ Mentioned", desc: "Author + mentions" },
                  { value: "assigned", label: "📌 Assigned", desc: "Author + assignees" },
                ].map((vis) => (
                  <button
                    key={vis.value}
                    onClick={() => setVisibility(vis.value as any)}
                    className={`flex-1 p-3 rounded-lg border-2 text-left ${
                      visibility === vis.value
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-sm">{vis.label}</div>
                    <div className="text-xs text-gray-600">{vis.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Note Content</label>
                <div className="flex gap-2 text-sm">
                  <button
                    onClick={insertMention}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    @ Mention
                  </button>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-600">Markdown supported</span>
                </div>
              </div>
              <textarea
                ref={editorRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note... Use @ to mention team members"
                className="w-full h-40 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2">Tags</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {availableTags?.slice(0, 10).map((tag) => (
                  <button
                    key={tag._id}
                    onClick={() => addTag(tag.name)}
                    disabled={tags.includes(tag.name)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 disabled:opacity-50"
                    style={{ backgroundColor: tags.includes(tag.name) ? undefined : tag.color + "20" }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNote}
                disabled={!content.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Create Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-4">
        {!notes || notes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No notes found
          </div>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note._id}
              note={note}
              currentUserId={currentUserId}
              onDelete={() => handleDeleteNote(note._id)}
              onTogglePin={() => handleTogglePin(note._id)}
              isSelected={selectedNote === note._id}
              onClick={() => setSelectedNote(selectedNote === note._id ? null : note._id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Note Card Component
interface NoteCardProps {
  note: any;
  currentUserId: string;
  onDelete: () => void;
  onTogglePin: () => void;
  isSelected: boolean;
  onClick: () => void;
}

function NoteCard({
  note,
  currentUserId,
  onDelete,
  onTogglePin,
  isSelected,
  onClick,
}: NoteCardProps) {
  const isAuthor = note.authorId === currentUserId;

  const visibilityIcons = {
    private: "🔒",
    team: "👥",
    mentioned: "@",
    assigned: "📌",
  };

  return (
    <div
      className={`bg-white rounded-lg shadow p-6 cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-blue-500" : "hover:shadow-md"
      } ${note.isPinned ? "border-l-4 border-yellow-500" : ""}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{visibilityIcons[note.visibility as keyof typeof visibilityIcons]}</span>
          <div>
            <div className="font-medium">{note.authorName}</div>
            <div className="text-xs text-gray-500">
              {new Date(note.createdAt).toLocaleString()}
              {note.updatedAt !== note.createdAt && " (edited)"}
            </div>
          </div>
        </div>

        {isAuthor && (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
              className={`p-2 rounded-lg hover:bg-gray-100 ${
                note.isPinned ? "text-yellow-600" : "text-gray-400"
              }`}
              title={note.isPinned ? "Unpin" : "Pin"}
            >
              📌
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 text-red-600 rounded-lg hover:bg-red-50"
              title="Delete"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      <div className="prose prose-sm max-w-none mb-3">
        <p className="whitespace-pre-wrap">{note.content}</p>
      </div>

      {note.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-2">
          {note.tags.map((tag: string) => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {note.mentions.length > 0 && (
        <div className="text-xs text-gray-600">
          Mentioned: {note.mentions.length} user{note.mentions.length > 1 ? "s" : ""}
        </div>
      )}

      {isSelected && note.editHistory && note.editHistory.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm font-medium mb-2">Edit History</div>
          <div className="space-y-2">
            {note.editHistory.map((edit: any, i: number) => (
              <div key={i} className="text-xs text-gray-600">
                Edited {new Date(edit.editedAt).toLocaleString()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
