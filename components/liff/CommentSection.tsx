/**
 * LIFF Comment Section Component
 * Allows users to add comments with images via LIFF
 */

'use client';

import { useState, useRef } from 'react';
import { MessageSquare, Send, Image as ImageIcon, X } from 'lucide-react';
import { convertImagesToWebP, validateImageFile } from '@/lib/image-utils';

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

interface Note {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
  images?: string[];
}

interface CommentSectionProps {
  ticketId: string;
  lineProfile: LineProfile | null;
  notes: Note[];
  onCommentAdded: (note: Note) => void;
}

export default function CommentSection({
  ticketId,
  lineProfile,
  notes,
  onCommentAdded,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError(null);
    setUploadingImages(true);

    try {
      // Validate all files
      for (const file of files) {
        const validation = validateImageFile(file, 10);
        if (!validation.valid) {
          setError(validation.error || 'Invalid file');
          setUploadingImages(false);
          return;
        }
      }

      // Convert to WebP
      const webpFiles = await convertImagesToWebP(files, 0.8);
      setSelectedImages((prev) => [...prev, ...webpFiles]);
      setUploadingImages(false);
    } catch (err) {
      console.error('[CommentSection] Image conversion failed:', err);
      setError('ไม่สามารถแปลงรูปภาพได้');
      setUploadingImages(false);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() && selectedImages.length === 0) {
      setError('กรุณาใส่ความคิดเห็นหรือรูปภาพ');
      return;
    }

    if (!lineProfile) {
      setError('กรุณาเข้าสู่ระบบก่อน');
      return;
    }

    setError(null);
    setAddingComment(true);

    try {
      // Upload images first if any
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        console.log('[CommentSection] Uploading images:', selectedImages.length);
        const formData = new FormData();
        selectedImages.forEach((file, idx) => {
          console.log(`[CommentSection] Adding image ${idx}:`, file.name, file.type, file.size);
          formData.append('images', file);
        });

        const uploadRes = await fetch(`/api/upload`, {
          method: 'POST',
          body: formData,
        });

        console.log('[CommentSection] Upload response status:', uploadRes.status);

        const uploadData = await uploadRes.json();
        console.log('[CommentSection] Upload response data:', uploadData);

        if (!uploadRes.ok) {
          const errorMsg = uploadData.error || 'Failed to upload images';
          console.error('[CommentSection] Upload failed:', errorMsg);
          throw new Error(`อัปโหลดรูปล้มเหลว: ${errorMsg}`);
        }

        imageUrls = uploadData.urls || [];
        console.log('[CommentSection] Image URLs:', imageUrls);
      }

      // Add comment
      console.log('[CommentSection] Adding comment with images:', imageUrls.length);
      const res = await fetch(`/api/liff/tickets/${ticketId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment.trim(),
          lineUserId: lineProfile.userId,
          lineName: lineProfile.displayName,
          lineAvatar: lineProfile.pictureUrl,
          images: imageUrls,
        }),
      });

      const data = await res.json();
      console.log('[CommentSection] Add note response:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add comment');
      }

      // Success
      onCommentAdded(data.data);
      setNewComment('');
      setSelectedImages([]);
    } catch (err: any) {
      console.error('[CommentSection] Failed to add comment:', err);
      setError(err.message || 'ไม่สามารถเพิ่มความคิดเห็นได้');
    } finally {
      setAddingComment(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">ความคิดเห็น</h3>
        <span className="text-sm text-gray-500">({notes.length})</span>
      </div>

      {/* Comment List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8">ยังไม่มีความคิดเห็น</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                {/* Show LINE profile picture for current user's comments */}
                {lineProfile && note.createdBy.includes(lineProfile.displayName) && lineProfile.pictureUrl && (
                  <img
                    src={lineProfile.pictureUrl}
                    alt={note.createdBy}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-gray-900 text-sm">{note.createdBy}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(note.createdAt).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm mt-1">{note.content}</p>
                  {note.images && note.images.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {note.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Image ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded border border-gray-200"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      {lineProfile && (
        <div className="space-y-3 pt-3 border-t border-gray-200">
          {/* Text Input */}
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="เพิ่มความคิดเห็น..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            disabled={addingComment}
          />

          {/* Image Preview */}
          {selectedImages.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {selectedImages.map((file, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    aria-label="Remove image"
                    title="Remove image"
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              aria-label="Upload images"
              title="Upload images"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImages || addingComment}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="text-sm">
                {uploadingImages ? 'กำลังแปลงรูป...' : 'แนบรูป'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleSubmitComment}
              disabled={addingComment || uploadingImages || (!newComment.trim() && selectedImages.length === 0)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span className="text-sm font-medium">
                {addingComment ? 'กำลังส่ง...' : 'ส่งความคิดเห็น'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Login Prompt */}
      {!lineProfile && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600">เข้าสู่ระบบด้วย LINE เพื่อแสดงความคิดเห็น</p>
        </div>
      )}
    </div>
  );
}
