'use client'

import { useRef, useState } from 'react'
import { Paperclip, Image as ImageIcon, FileText, X } from 'lucide-react'

interface FileUploaderProps {
  onFileSelect: (file: File, preview?: string) => void
  onRemoveFile: () => void
  accept?: string
  maxSize?: number // in MB
  selectedFile?: File | null
  preview?: string | null
}

export function FileUploader({ 
  onFileSelect, 
  onRemoveFile,
  accept = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx',
  maxSize = 10,
  selectedFile,
  preview
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSize) {
      setError(`El archivo debe ser menor a ${maxSize}MB`)
      return
    }

    setError(null)

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        onFileSelect(file, reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      onFileSelect(file)
    }
  }

  const handleRemove = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setError(null)
    onRemoveFile()
  }

  const isImage = selectedFile?.type.startsWith('image/')

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
      />

      {!selectedFile && (
        <label
          htmlFor="file-upload"
          className="p-2 hover:bg-dark-hover rounded-lg transition-colors cursor-pointer inline-block"
          title="Adjuntar archivo o imagen"
        >
          <Paperclip className="w-5 h-5 text-dark-muted" />
        </label>
      )}

      {error && (
        <div className="absolute bottom-12 left-0 bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg whitespace-nowrap">
          {error}
        </div>
      )}

      {selectedFile && (
        <div className="absolute bottom-12 left-0 bg-dark-card border border-dark-border rounded-lg p-3 max-w-xs">
          <div className="flex items-center gap-3">
            {isImage && preview ? (
              <img 
                src={preview} 
                alt="Preview" 
                className="w-16 h-16 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-16 bg-dark-hover rounded flex items-center justify-center">
                <FileText className="w-8 h-8 text-dark-muted" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-dark-text truncate">{selectedFile.name}</p>
              <p className="text-xs text-dark-muted">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={handleRemove}
              className="p-1 hover:bg-dark-hover rounded transition-colors"
            >
              <X className="w-4 h-4 text-dark-muted" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
