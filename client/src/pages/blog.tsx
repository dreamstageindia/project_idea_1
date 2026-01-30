import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, User, Eye, ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import blogImage from '@assets/blog.jpg'; // Add this import

type Blog = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  author: string;
  publishedAt?: string;
  views: number;
  createdAt: string;
};

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: blogs = [], isLoading } = useQuery<Blog[]>({
    queryKey: ["/api/blogs"],
  });

  const filteredBlogs = useMemo(() => {
    if (!searchQuery.trim()) return blogs;
    
    const query = searchQuery.toLowerCase();
    return blogs.filter(blog => 
      blog.title.toLowerCase().includes(query) ||
      blog.description?.toLowerCase().includes(query) ||
      blog.author.toLowerCase().includes(query)
    );
  }, [blogs, searchQuery]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not published";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section with Blog Image */}
      <div 
        className="relative min-h-[400px] md:min-h-[500px] rounded-2xl mx-4 mt-4 mb-8 overflow-hidden shadow-xl"
        style={{
          backgroundImage: `url(${blogImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Optional gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-transparent to-purple-900/30"></div>
        
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-4">
          
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search blog posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 py-6 text-lg"
            />
          </div>
          <p className="text-center text-gray-500 mt-2">
            {filteredBlogs.length} blog posts found
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading blog posts...</div>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">No blog posts found</div>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBlogs.map((blog) => (
              <Card key={blog.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {blog.imageUrl && (
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={blog.imageUrl} 
                      alt={blog.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=No+Image";
                      }}
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="line-clamp-2">
                    <Link href={`/blog/${blog.slug}`} className="hover:text-blue-600">
                      {blog.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {blog.description || "No description available"}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{blog.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(blog.publishedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{blog.views}</span>
                    </div>
                  </div>
                  
                  <Link href={`/blog/${blog.slug}`}>
                    <Button variant="outline" className="w-full">
                      Read More
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}