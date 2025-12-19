/**
 * EditableField Component
 * Reusable component for in-place editing of ticket fields
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Save, X } from 'lucide-react';

interface EditableFieldProps {
  label: string;
  value: string;
  type?: 'text' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  onSave: (newValue: string) => Promise<void>;
  disabled?: boolean;
  icon?: React.ReactNode;
  placeholder?: string;
  rows?: number;
}

export default function EditableField({
  label,
  value,
  type = 'text',
  options = [],
  onSave,
  disabled = false,
  icon,
  placeholder,
  rows = 3,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(value);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (editedValue === value) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    try {
      await onSave(editedValue);
      setIsEditing(false);
    } catch (error) {
      // Error handling done in parent
      setEditedValue(value); // Reset on error
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {icon}
          <span>{label}</span>
        </div>
        <div className="pl-6">
          {type === 'text' && (
            <input
              type="text"
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          )}

          {type === 'textarea' && (
            <textarea
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
              placeholder={placeholder}
              rows={rows}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={loading}
            />
          )}

          {type === 'select' && (
            <Select value={editedValue} onValueChange={setEditedValue} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleSave} disabled={loading}>
              <Save className="h-3 w-3 mr-1" />
              บันทึก
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={loading}>
              <X className="h-3 w-3 mr-1" />
              ยกเลิก
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Get display value for select fields
  const displayValue = type === 'select' && options.length > 0
    ? options.find(opt => opt.value === value)?.label || value
    : value;

  return (
    <div className="space-y-1.5 group">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {icon}
        <span>{label}</span>
        {!disabled && (
          <button
            onClick={() => setIsEditing(true)}
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
            aria-label={`แก้ไข ${label}`}
          >
            <Edit className="h-3 w-3 text-gray-400" />
          </button>
        )}
      </div>
      <div className="pl-6">
        <span className="text-sm text-gray-900 whitespace-pre-wrap">{displayValue || '-'}</span>
      </div>
    </div>
  );
}
