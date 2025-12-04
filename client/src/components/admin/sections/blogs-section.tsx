import { useState } from "react";
import { BlogsList } from "@/components/admin/blogs/blogs-list";
import { BlogCreate } from "@/components/admin/blogs/blog-create";

export function BlogsSection() {
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Blog Management</h1>
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded-lg ${
              activeTab === "list"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setActiveTab("list")}
          >
            All Blogs
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${
              activeTab === "create"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setActiveTab("create")}
          >
            Create Blog
          </button>
        </div>
      </div>

      {activeTab === "list" ? <BlogsList /> : <BlogCreate />}
    </div>
  );
}