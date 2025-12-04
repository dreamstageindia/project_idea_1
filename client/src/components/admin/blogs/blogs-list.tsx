import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Edit, Trash, Eye, Calendar, User } from "lucide-react";
import { BlogEditModal } from "./blog-edit-modal";
import type { Blog } from "./types";

export function BlogsList() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: blogs = [] } = useQuery<Blog[]>({ 
    queryKey: ["/api/admin/blogs"] 
  });
  
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);

  const deleteBlogMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/blogs/${id}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/blogs"] });
      toast({ title: "Blog deleted" });
    },
    onError: (e: any) => toast({ 
      title: "Delete failed", 
      description: e.message, 
      variant: "destructive" 
    }),
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not published";
    return new Date(dateString).toLocaleDateString();
  };

  const togglePublishStatus = async (blog: Blog) => {
    try {
      const res = await apiRequest("PUT", `/api/admin/blogs/${blog.id}`, {
        isPublished: !blog.isPublished,
      });
      await res.json();
      qc.invalidateQueries({ queryKey: ["/api/admin/blogs"] });
      toast({ 
        title: blog.isPublished ? "Blog unpublished" : "Blog published",
        description: `"${blog.title}" has been ${blog.isPublished ? "unpublished" : "published"}`,
      });
    } catch (error: any) {
      toast({ 
        title: "Update failed", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Blogs ({blogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[280px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blogs.map((blog) => (
                  <TableRow key={blog.id}>
                    <TableCell>
                      {blog.imageUrl ? (
                        <img 
                          src={blog.imageUrl} 
                          alt={blog.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <Eye className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{blog.title}</p>
                        <p className="text-sm text-muted-foreground">{blog.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {blog.author}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={blog.isPublished ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => togglePublishStatus(blog)}
                      >
                        {blog.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {blog.views}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(blog.publishedAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(blog.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingBlog(blog)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteBlogMutation.mutate(blog.id)}
                          disabled={deleteBlogMutation.isPending}
                        >
                          <Trash className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editingBlog && (
        <BlogEditModal
          blog={editingBlog}
          onClose={() => setEditingBlog(null)}
        />
      )}
    </>
  );
}