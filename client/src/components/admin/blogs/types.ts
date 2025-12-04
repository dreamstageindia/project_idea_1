export interface Blog {
    id: string;
    title: string;
    slug: string;
    description?: string;
    content: string;
    imageUrl?: string;
    author: string;
    isPublished: boolean;
    publishedAt?: string;
    views: number;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface InsertBlog {
    title: string;
    slug: string;
    description?: string;
    content: string;
    imageUrl?: string;
    author?: string;
    isPublished?: boolean;
  }