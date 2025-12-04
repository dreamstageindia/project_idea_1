import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Upload } from "lucide-react";
import { uploadFiles } from "@/lib/admin-utils";

export function BlogCreate() {
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

  const createBlogMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/blogs", data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/blogs"] });
      toast({ title: "Blog created successfully" });
      setFormData({
        title: "",
        slug: "",
        description: "",
        content: "",
        imageUrl: "",
        author: "Admin",
        isPublished: false,
      });
    },
    onError: (e: any) => {
      toast({ 
        title: "Create failed", 
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

    createBlogMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Blog Post</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="md:col-span-2">
              <Label htmlFor="blog-title">Title *</Label>
              <Input
                id="blog-title"
                value={formData.title}
                onChange={handleTitleChange}
                placeholder="Enter blog title"
                required
              />
            </div>

            {/* Slug */}
            <div>
              <Label htmlFor="blog-slug">Slug *</Label>
              <Input
                id="blog-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="blog-post-url"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL-friendly version of the title
              </p>
            </div>

            {/* Author */}
            <div>
              <Label htmlFor="blog-author">Author</Label>
              <Input
                id="blog-author"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Author name"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <Label htmlFor="blog-description">Short Description</Label>
              <Textarea
                id="blog-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the blog post"
                rows={3}
              />
            </div>

            {/* Image URL */}
            <div className="md:col-span-2">
              <Label htmlFor="blog-image">Featured Image URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="blog-image"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
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
              <Label htmlFor="blog-content">Content *</Label>
              <Textarea
                id="blog-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your blog content here..."
                rows={10}
                className="font-mono text-sm"
                required
              />
            </div>

            {/* Publish Status */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <input
                  id="is-published"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                />
                <Label htmlFor="is-published">Publish immediately</Label>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                If checked, the blog will be visible to all users immediately.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={createBlogMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              {createBlogMutation.isPending ? "Creating..." : "Create Blog"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormData({
                title: "",
                slug: "",
                description: "",
                content: "",
                imageUrl: "",
                author: "Admin",
                isPublished: false,
              })}
            >
              Reset Form
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}