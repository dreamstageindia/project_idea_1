import { useState } from "react";
import { CampaignsList } from "@/components/admin/campaigns/campaigns-list";
import { CampaignCreate } from "@/components/admin/campaigns/campaign-create";

export function CampaignsSection() {
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded-lg ${
              activeTab === "list"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setActiveTab("list")}
          >
            All Campaigns
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${
              activeTab === "create"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setActiveTab("create")}
          >
            Create Campaign
          </button>
        </div>
      </div>

      {activeTab === "list" ? <CampaignsList /> : <CampaignCreate />}
    </div>
  );
}