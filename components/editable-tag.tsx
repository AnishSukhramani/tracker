"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EditableTagProps {
  tag: string
  onRemove: () => void
  onUpdate: (newTag: string) => void
}

export function EditableTag({ tag, onRemove, onUpdate }: EditableTagProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState(tag)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  const handleSave = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== tag) {
      onUpdate(trimmed)
    } else if (!trimmed) {
      onRemove()
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(tag)
    setIsEditing(false)
  }

  const handleBlur = () => {
    handleSave()
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="h-6 w-20 text-xs"
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  return (
    <Badge
      variant="secondary"
      className="text-xs cursor-pointer hover:bg-secondary/80"
      onClick={(e) => {
        e.stopPropagation()
        setIsEditing(true)
      }}
    >
      {tag}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="ml-1 hover:bg-secondary rounded-full p-0.5"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  )
}

interface EditableTagsProps {
  tags: string[]
  onTagsChange: (newTags: string[]) => void
  transactionId: string
}

export function EditableTags({
  tags,
  onTagsChange,
  transactionId,
}: EditableTagsProps) {
  const [isAdding, setIsAdding] = React.useState(false)
  const [newTagValue, setNewTagValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  const handleAddTag = () => {
    const trimmed = newTagValue.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed])
      setNewTagValue("")
      setIsAdding(false)
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((t) => t !== tagToRemove))
  }

  const handleUpdateTag = (oldTag: string, newTag: string) => {
    if (newTag && newTag !== oldTag && !tags.includes(newTag)) {
      onTagsChange(tags.map((t) => (t === oldTag ? newTag : t)))
    } else if (!newTag) {
      handleRemoveTag(oldTag)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddTag()
    } else if (e.key === "Escape") {
      setIsAdding(false)
      setNewTagValue("")
    }
  }

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {tags.map((tag, index) => (
        <EditableTag
          key={index}
          tag={tag}
          onRemove={() => handleRemoveTag(tag)}
          onUpdate={(newTag) => handleUpdateTag(tag, newTag)}
        />
      ))}
      {isAdding ? (
        <Input
          ref={inputRef}
          value={newTagValue}
          onChange={(e) => setNewTagValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            handleAddTag()
          }}
          className="h-6 w-20 text-xs"
          placeholder="New tag..."
        />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      )}
    </div>
  )
}

