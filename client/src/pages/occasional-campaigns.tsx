// src/pages/occasional-campaigns.tsx
import { useState, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { CheckCircle, Calendar, Users, Gift } from "lucide-react";

// Import images for campaigns
import tribeCampaignImg from '@assets/generated_images/white_gift_box_background.png';
import sunshineGiftingImg from '@assets/generated_images/sunshine_gifting_ribbon.png';
import anniversaryCelebrationImg from '@assets/generated_images/purple_gift_box_with_bow.png';

type Campaign = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  maxParticipants?: number;
  currentParticipants: number;
  eligibilityCriteria?: string;
  benefits: string[];
};

type Branding = {
  id: string;
  logoUrl: string | null;
  companyName: string;
  primaryColor: string;
  accentColor: string;
  bannerUrl: string | null;
  bannerText: string | null;
  updatedAt: string;
};

// Campaign Card Component
function CampaignCard({ 
  campaign, 
  onSelect,
  isSelected 
}: { 
  campaign: Campaign;
  onSelect: (campaign: Campaign) => void;
  isSelected: boolean;
}) {
  const participationPercentage = campaign.maxParticipants 
    ? (campaign.currentParticipants / campaign.maxParticipants) * 100
    : 0;

  return (
    <div 
      className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-lg ${
        isSelected 
          ? 'border-blue-600 ring-4 ring-blue-100' 
          : 'border-gray-200 hover:border-blue-300'
      }`}
      onClick={() => onSelect(campaign)}
    >
      <div className="relative">
        <img
          src={campaign.imageUrl}
          alt={campaign.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-4 right-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            campaign.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {campaign.isActive ? 'Active' : 'Coming Soon'}
          </div>
        </div>
      </div>
      
      <div className="p-6">
        
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">{campaign.name}</h3>
        <p className="text-gray-600 mb-4">{campaign.description}</p>
        
        
        
        
        
        
        
        <Button
          className={`w-full mt-6 ${
            isSelected 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
          }`}
          size="lg"
        >
          {isSelected ? 'Selected' : 'Select Campaign'}
        </Button>
      </div>
    </div>
  );
}

// Campaign Hero Component
function CampaignHero({ 
  backgroundImage, 
  companyName 
}: { 
  backgroundImage?: string; 
  companyName: string;
}) {
  const heroStyle = useMemo<React.CSSProperties>(() => {
    if (backgroundImage) {
      return {
        backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 100%), url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      };
    }
    return {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    };
  }, [backgroundImage]);

  return (
    <div 
      className="relative h-80 rounded-2xl mx-4 mt-4 mb-8 overflow-hidden shadow-xl"
      style={heroStyle}
    >
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="relative z-10 h-full flex items-center justify-center text-center text-white">
        <div className="max-w-4xl px-6">
          <div className="flex justify-center mb-4">
            <Gift className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold mb-4 drop-shadow-lg">
            Special Occasions
          </h1>
          <p className="text-2xl font-semibold mb-6 drop-shadow-md">
            {companyName} Exclusive Campaigns
          </p>
          <p className="text-xl opacity-90 drop-shadow-md">
            Join our special campaigns and celebrate memorable moments together
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OccasionalCampaigns() {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const { data: branding } = useQuery<Branding>({
    queryKey: ["/api/admin/branding"],
  });

  // Mock campaign data - in real app, this would come from API
  const campaigns: Campaign[] = [
    {
      id: "1",
      name: "Join the Tribe",
      description: "",
      imageUrl: tribeCampaignImg,
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      isActive: true,
      maxParticipants: 1000,
      currentParticipants: 756,
      eligibilityCriteria: "All active employees with minimum 6 months tenure",
      benefits: [
        "Exclusive member-only events",
        "Early access to new product launches",
        "Special member pricing",
        "Priority customer support",
        "Quarterly member gifts"
      ]
    },
    {
      id: "2",
      name: "Sunshine Gifting",
      description: "",
      imageUrl: sunshineGiftingImg,
      startDate: "2024-03-01",
      endDate: "2024-08-31",
      isActive: true,
      currentParticipants: 342,
      eligibilityCriteria: "Available for all employees",
      benefits: [
        "Curated gift collections",
        "Personalized gifting options",
        "Flexible delivery scheduling",
        "Budget-friendly choices",
        "Eco-friendly packaging"
      ]
    },
    {
      id: "3",
      name: "Celebrating 5 Years",
      description: "",
      imageUrl: anniversaryCelebrationImg,
      startDate: "2024-06-01",
      endDate: "2024-09-30",
      isActive: true,
      maxParticipants: 500,
      currentParticipants: 189,
      eligibilityCriteria: "Employees who joined before 2023",
      benefits: [
        "Limited edition anniversary merchandise",
        "Special bonus points",
        "Exclusive anniversary events",
        "Commemorative gifts",
        "Recognition awards"
      ]
    }
  ];

  const companyName = branding?.companyName || "Your Company";
  const primaryColor = branding?.primaryColor || "#1e40af";

  const handleCampaignSelect = useCallback((campaign: Campaign) => {
    if (selectedCampaign?.id === campaign.id) {
      setSelectedCampaign(null);
    } else {
      setSelectedCampaign(campaign);
      toast({
        title: "Campaign Selected",
        description: `You've selected "${campaign.name}"`,
      });
    }
  }, [selectedCampaign, toast]);

  const handleJoinCampaign = useCallback(() => {
    if (!selectedCampaign) {
      toast({
        title: "No Campaign Selected",
        description: "Please select a campaign to join",
        variant: "destructive",
      });
      return;
    }

    // In real app, this would call an API to join the campaign
    toast({
      title: "Successfully Joined!",
      description: `You've joined "${selectedCampaign.name}"`,
    });
    
    // Reset selection after joining
    setSelectedCampaign(null);
  }, [selectedCampaign, toast]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <CampaignHero 
        companyName={companyName}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Featured Campaigns
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover our exclusive campaigns designed to celebrate life's special moments together. 
            Select any campaign to learn more and participate.
          </p>
        </div>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onSelect={handleCampaignSelect}
              isSelected={selectedCampaign?.id === campaign.id}
            />
          ))}
        </div>

        

    
      </div>
      
      <Footer />
    </div>
  );
}