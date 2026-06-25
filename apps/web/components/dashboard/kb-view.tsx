// @ts-nocheck
"use client"

import { useState, useRef } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import { Id } from "@workspace/backend/_generated/dataModel"
import { 
  BookOpen, 
  Search, 
  Plus, 
  FileText, 
  Trash2, 
  Sparkles, 
  Loader2, 
  ChevronRight, 
  File, 
  Tag, 
  Database,
  Calendar,
  Layers,
  X,
  ArrowRight,
  Info
} from "lucide-react"

export function KBView() {
  const orgId = "Acme Labs" // Fixed org matching dashboard top switcher
  
  // Convex queries and mutations
  const documents = useQuery(api.kb.listDocuments, { orgId })
  const deleteDocMutation = useMutation(api.kb.deleteDocument)

  // Local state
  const [searchQuery, setSearchQuery] = useState("")
  const [semanticMode, setSemanticMode] = useState(false)
  const [semanticResults, setSemanticResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Upload dialog state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadCategory, setUploadCategory] = useState("Integration")
  const [uploadingFile, setUploadingFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "parsing" | "indexing" | "success" | "error">("idle")
  const [statusMessage, setStatusMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Active document detail drawer
  const [selectedDoc, setSelectedDoc] = useState<any>(null)

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState("All")

  const categories = ["All", "Integration", "Models", "Orchestration", "Security"]

  // Trigger semantic search
  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch("/api/kb/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          orgId,
          limit: 4,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setSemanticResults(data.results || [])
        setSemanticMode(true)
      }
    } catch (err) {
      console.error("Semantic search failed:", err)
    } finally {
      setIsSearching(false)
    }
  }

  // Handle document upload pipeline
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadingFile(e.target.files[0])
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadingFile) return

    setUploadStatus("uploading")
    setStatusMessage("Uploading file buffer to secure storage...")

    try {
      const formData = new FormData()
      formData.append("file", uploadingFile)
      formData.append("orgId", orgId)
      formData.append("category", uploadCategory)

      setUploadStatus("parsing")
      setStatusMessage("Parsing document layers and extracting text segments...")

      const response = await fetch("/api/kb/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to process document")
      }

      setUploadStatus("indexing")
      setStatusMessage("Generating OpenAI vector embeddings (1536 dims) and computing auto-summarization...")

      const data = await response.json()
      
      setUploadStatus("success")
      setStatusMessage(`Document successfully indexed! Created ${data.chunksCount} semantic chunks.`)

      setTimeout(() => {
        setShowUploadModal(false)
        setUploadStatus("idle")
        setUploadingFile(null)
        setStatusMessage("")
      }, 2000)

    } catch (err: any) {
      setUploadStatus("error")
      setStatusMessage(err.message || "An unexpected error occurred during processing.")
    }
  }

  // Handle delete document
  const handleDeleteDoc = async (docId: Id<"documents">, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this document? This will remove the file, summary, chunks, and vector embeddings.")) {
      await deleteDocMutation({ documentId: docId })
      if (selectedDoc?._id === docId) {
        setSelectedDoc(null)
      }
    }
  }

  // Filter documents by category and standard search (if not in semantic mode)
  const filteredDocs = (documents || []).filter((doc) => {
    const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case "pdf": return "text-rose-400 bg-rose-500/10 border-rose-500/20"
      case "docx": return "text-blue-400 bg-blue-500/10 border-blue-500/20"
      default: return "text-amber-400 bg-amber-500/10 border-amber-500/20"
    }
  }

  return (
    <div className="space-y-6 text-left relative min-h-screen pb-16">
      
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <span>Smart Knowledge Base</span>
          </h2>
          <p className="text-xs text-slate-400">
            Upload PDF, DOCX, or TXT guides to automatically chunk, embed, and index them into AI Agent memory.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/15 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* ─── SEARCH & FILTER PANEL ─── */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        
        {/* Search Bar with Semantic Toggle */}
        <form onSubmit={handleSemanticSearch} className="flex-1 max-w-xl flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Ask a question or search documents..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (semanticMode) {
                  setSemanticMode(false)
                  setSemanticResults([])
                }
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-white/5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold hover:bg-slate-800 text-slate-200 transition-all flex items-center gap-2"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-400" />
            )}
            <span>Semantic Ask</span>
          </button>
        </form>

        {/* Category Pill Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat)
                setSemanticMode(false)
                setSemanticResults([])
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                selectedCategory === cat && !semanticMode
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-950/40 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {cat === "All" ? "All Resources" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ─── MAIN RESULTS GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left/Middle Column: Documents List OR Semantic Results */}
        <div className="lg:col-span-2 space-y-4">
          
          {semanticMode ? (
            
            // ─── SEMANTIC SEARCH RESULTS (RAG SOURCE) ───
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span>Semantic Vector Index Matches ({semanticResults.length})</span>
                </span>
                <button
                  onClick={() => {
                    setSemanticMode(false)
                    setSemanticResults([])
                    setSearchQuery("")
                  }}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold"
                >
                  Clear Results
                </button>
              </div>

              {semanticResults.length === 0 ? (
                <div className="border border-white/5 rounded-2xl p-12 text-center bg-slate-950/10 text-slate-500 space-y-2">
                  <Info className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">No matching semantic vectors found. Try index validation or rephrase query.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {semanticResults.map((match) => (
                    <div
                      key={match.embeddingId}
                      className="p-4 border border-slate-900 bg-slate-950/50 rounded-2xl hover:border-slate-800 transition-all text-left space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/10 rounded-full">
                            Citation #{match.citationNumber}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            Source: <strong className="text-slate-200">{match.documentTitle}</strong> (Chunk {match.chunkIndex})
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                          {(match.relevanceScore * 100).toFixed(1)}% Match
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-slate-950/70 p-3 rounded-xl border border-white/5">
                        "{match.text}"
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span>Category: {match.category}</span>
                        <span>File: {match.documentFileName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          ) : (

            // ─── STANDARD DOCUMENTS LIST ───
            <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-950/20 divide-y divide-white/5">
              
              {/* Table Header */}
              <div className="p-4 bg-slate-950/40 grid grid-cols-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <div className="col-span-3">Document Details</div>
                <div>Category</div>
                <div>Status</div>
                <div className="text-right">Actions</div>
              </div>

              {!documents ? (
                <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="text-xs">Loading Knowledge Base Documents...</span>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="p-16 text-center text-slate-500 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-xs">No documents uploaded. Click "Upload Document" above to get started.</p>
                </div>
              ) : (
                filteredDocs.map((doc) => (
                  <div
                    key={doc._id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-4 grid grid-cols-6 items-center text-xs hover:bg-white/5 transition-colors cursor-pointer ${
                      selectedDoc?._id === doc._id ? "bg-white/5 border-l-2 border-blue-500" : ""
                    }`}
                  >
                    <div className="col-span-3 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-[10px] uppercase ${getFileTypeColor(doc.fileType)}`}>
                        {doc.fileType}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-200 block truncate">{doc.title}</span>
                        <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                          {doc.fileName} • v{doc.version}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                        <Tag className="w-3 h-3 text-slate-500" />
                        <span>{doc.category || "General"}</span>
                      </span>
                    </div>

                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize ${
                        doc.status === "indexed" 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : doc.status === "processing"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        {doc.status === "processing" && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                        <span>{doc.status}</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <button
                        onClick={(e) => handleDeleteDoc(doc._id, e)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer inline-block"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Column: Selected Document Metadata & Auto Summarization */}
        <div className="lg:col-span-1">
          {selectedDoc ? (
            <div className="border border-white/5 bg-slate-950/20 p-5 rounded-2xl space-y-6">
              
              {/* Header Title */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white leading-tight">{selectedDoc.title}</h3>
                  <span className="text-[10px] text-slate-500 font-semibold block">{selectedDoc.fileName}</span>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-1 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all"
                  aria-label="Close document details"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-4">
                
                {/* Meta details list */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Version</span>
                    </span>
                    <span className="font-mono text-slate-300">v{selectedDoc.version}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Category</span>
                    </span>
                    <span className="text-slate-300">{selectedDoc.category || "General"}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Uploaded</span>
                    </span>
                    <span className="text-slate-300">
                      {new Date(selectedDoc.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <File className="w-3.5 h-3.5" />
                      <span>File Format</span>
                    </span>
                    <span className="text-slate-300 uppercase font-bold">{selectedDoc.fileType}</span>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 space-y-2.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Auto-Summarization</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-white/5 whitespace-pre-line">
                    {selectedDoc.summary || "No summary computed for this document version."}
                  </p>
                </div>

                <div className="border-t border-white/5 pt-4 flex gap-2">
                  <button
                    disabled={!selectedDoc.storageId}
                    onClick={() => {
                      if (selectedDoc.storageId) {
                        // Convex files are accessible via standard URL: /api/storage/id
                        // Let's resolve the full Convex HTTP URL or redirect to file
                        window.open(`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/storage/${selectedDoc.storageId}`, "_blank")
                      }
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs font-semibold hover:bg-slate-800 text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>Download File</span>
                  </button>
                </div>

              </div>

            </div>
          ) : (
            <div className="border border-dashed border-white/5 p-8 text-center bg-slate-950/5 text-slate-500 rounded-2xl text-xs space-y-2.5">
              <BookOpen className="w-8 h-8 mx-auto text-slate-700" />
              <p className="max-w-[200px] mx-auto text-slate-500">
                Select any document to review version history, auto-generated summary, and source parameters.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ─── UPLOAD DOCUMENT MODAL ─── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-md border border-slate-900 bg-slate-950 p-6 rounded-2xl shadow-2xl text-left space-y-6 relative">
            
            <button
              onClick={() => {
                if (uploadStatus !== "uploading" && uploadStatus !== "parsing" && uploadStatus !== "indexing") {
                  setShowUploadModal(false)
                }
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all"
              aria-label="Close upload modal"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Upload New Support Document</h3>
              <p className="text-xs text-slate-400">Add guides for real-time document text-splitting and vector indexing.</p>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              
              {/* Category */}
              <div className="space-y-2">
                <label htmlFor="document-category-select" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Document Category
                </label>
                <select
                  id="document-category-select"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  aria-label="Document Category"
                  title="Document Category"
                >
                  {categories.filter(c => c !== "All").map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Drag/Drop Box */}
              <div className="space-y-2">
                <label htmlFor="document-file-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Select Document File
                </label>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950/40 p-8 rounded-xl text-center cursor-pointer transition-all space-y-2.5"
                >
                  <input
                    id="document-file-input"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.txt,.md"
                    className="hidden"
                    aria-label="Select Document File"
                    title="Select Document File"
                  />
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                    <FileText className="w-5 h-5" />
                  </div>
                  
                  {uploadingFile ? (
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-200 block truncate max-w-[280px] mx-auto">
                        {uploadingFile.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold block">
                        {(uploadingFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-semibold text-slate-300 block">Click to select files</span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-1">
                        Supports PDF, DOCX, TXT, MD up to 10MB
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Indicator */}
              {uploadStatus !== "idle" && (
                <div className={`p-4 rounded-xl border text-xs flex gap-3 ${
                  uploadStatus === "success" 
                    ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-300"
                    : uploadStatus === "error"
                    ? "bg-rose-500/5 border-rose-500/10 text-rose-300"
                    : "bg-blue-500/5 border-blue-500/10 text-blue-300"
                }`}>
                  {(uploadStatus !== "success" && uploadStatus !== "error") ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400 shrink-0 mt-0.5" />
                  ) : uploadStatus === "success" ? (
                    <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <span className="font-bold block capitalize">Status: {uploadStatus}</span>
                    <p className="text-[11px] leading-relaxed opacity-90">{statusMessage}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploadStatus === "uploading" || uploadStatus === "parsing" || uploadStatus === "indexing"}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-center text-xs font-semibold hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadingFile || uploadStatus === "uploading" || uploadStatus === "parsing" || uploadStatus === "indexing"}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-center text-xs font-bold text-white shadow-md shadow-blue-500/15 transition-all cursor-pointer disabled:opacity-50"
                >
                  Process & Index
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
