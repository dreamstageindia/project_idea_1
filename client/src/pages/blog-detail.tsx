import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Calendar, User, Eye, ArrowLeft, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { Link } from "wouter";

type Blog = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content: string;
  imageUrl?: string;
  author: string;
  publishedAt?: string;
  views: number;
  createdAt: string;
};

export default function BlogDetailPage() {
  const [match, params] = useRoute("/blog/:slug");
  const slug = params?.slug || "";
  
  const { data: blog, isLoading, error } = useQuery<Blog>({
    queryKey: [`/api/blogs/${slug}`],
    enabled: !!slug,
  });

  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not published";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">Loading blog post...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-3xl mb-4">📝</div>
              <h2 className="text-2xl font-bold mb-2">Blog Post Not Found</h2>
              <p className="text-gray-600 mb-6">
                The blog post you're looking for doesn't exist or has been removed.
              </p>
              <Link href="/blog">
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Blog
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Back Button */}
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <Link href="/blog">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Button>
        </Link>
      </div>

      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Image */}
        {blog.imageUrl && (
          <div className="mb-8 rounded-2xl overflow-hidden">
            <img 
              src={blog.imageUrl} 
              alt={blog.title}
              className="w-full h-[400px] object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://placehold.co/1200x600?text=No+Image";
              }}
            />
          </div>
        )}

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {blog.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-6">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium">{blog.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(blog.publishedAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span>{blog.views} views</span>
            </div>
          </div>

          {blog.description && (
            <p className="text-xl text-gray-700 italic border-l-4 border-blue-500 pl-4 py-2 mb-6">
              {blog.description}
            </p>
          )}
        </header>

        {/* Content */}
        <div className="prose prose-lg max-w-none mb-8">
          <div 
            className="whitespace-pre-wrap text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: blog.content.replace(/\n/g, '<br/>') 
            }}
          />
        </div>

        {/* Share Section */}
        <Card className="mb-8">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Found this article helpful?</p>
                <p className="text-sm text-gray-600">Share it with others</p>
              </div>
              <Button onClick={handleShare} variant="outline">
                <Share2 className="mr-2 h-4 w-4" />
                {copied ? "Copied!" : "Share"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back to Blog */}
        <div className="text-center">
          <Link href="/blog">
            <Button variant="outline" size="lg">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to All Blog Posts
            </Button>
          </Link>
        </div>
      </article>
      
      <Footer />
    </div>
  );
}