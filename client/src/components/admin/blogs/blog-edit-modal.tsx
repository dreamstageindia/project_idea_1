import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, X, Upload } from "lucide-react";
import { uploadFiles } from "@/lib/admin-utils";
import type { Blog } from "./types";

interface BlogEditModalProps {
  blog: Blog;
  onClose: () => void;
}

export function BlogEditModal({ blog, onClose }: BlogEditModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    content: "",
    imageUrl: "",
    author: "Admin",
    isPublished: false,
  });

  useEffect(() => {
    setFormData({
      title: blog.title,
      slug: blog.slug,
      description: blog.description || "",
      content: blog.content,
      imageUrl: blog.imageUrl || "",
      author: blog.author || "Admin",
      isPublished: blog.isPublished,
    });
  }, [blog]);

  const updateBlogMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/admin/blogs/${blog.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/blogs"] });
      toast({ title: "Blog updated successfully" });
      onClose();
    },
    onError: (e: any) => {
      toast({ 
        title: "Update failed", 
        description: e.message, 
        variant: "destructive" 
      });
    },
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-')
      .trim();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    
    if (!formData.slug.trim()) {
      toast({ title: "Slug is required", variant: "destructive" });
      return;
    }
    
    if (!formData.content.trim()) {
      toast({ title: "Content is required", variant: "destructive" });
      return;
    }

    updateBlogMutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Blog: {blog.title}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={handleTitleChange}
                required
              />
            </div>

            {/* Slug */}
            <div>
              <Label htmlFor="edit-slug">Slug *</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
              />
            </div>

            {/* Author */}
            <div>
              <Label htmlFor="edit-author">Author</Label>
              <Input
                id="edit-author"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <Label htmlFor="edit-description">Short Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Image URL */}
            <div className="md:col-span-2">
              <Label htmlFor="edit-image">Featured Image URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-image"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const urls = await uploadFiles([file]);
                          setFormData(prev => ({ ...prev, imageUrl: urls[0] }));
                          toast({ title: "Image uploaded successfully" });
                        } catch (error: any) {
                          toast({ 
                            title: "Upload failed", 
                            description: error.message, 
                            variant: "destructive" 
                          });
                        }
                      }
                    };
                    input.click();
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
              {formData.imageUrl && (
                <div className="mt-2">
                  <img 
                    src={formData.imageUrl} 
                    alt="Preview" 
                    className="w-32 h-32 object-cover rounded border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/200x200?text=Invalid+URL";
                    }}
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="md:col-span-2">
              <Label htmlFor="edit-content">Content *</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={12}
                className="font-mono text-sm"
                required
              />
            </div>

            {/* Publish Status */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <input
                  id="edit-is-published"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                />
                <Label htmlFor="edit-is-published">Publish this blog</Label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateBlogMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateBlogMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}