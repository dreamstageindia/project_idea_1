// src/pages/home.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import logo from '@assets/logo.png';

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

export default function Home() {
  const [, setLocation] = useLocation();
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  const { data: branding } = useQuery<Branding>({
    queryKey: ["/api/admin/branding"],
  });

  const companyName = branding?.companyName || "Carelon";
  const primaryColor = branding?.primaryColor || "#1e40af";

  const options = [
    {
      id: "brand-store",
      title: "Brand Store",
      description: "Explore our exclusive brand collection",
      position: "top-left",
      path: "/dashboard"
    },
    {
      id: "special-occasions",
      title: "Special Occasions",
      description: "Gifts for memorable moments",
      position: "top-right",
      path: "/special-occasions"
    },
    {
      id: "bulk-buy",
      title: "Blogs",
      description: "Blogs",
      position: "bottom-left",
      path: "/blog"
    },
    {
      id: "csr-blog",
      title: "CSR Support",
      description: "Corporate social responsibility & insights",
      position: "bottom-right",
      path: "/csr"
    }
  ];

  const getPositionStyles = (position: string) => {
    const baseStyles = "absolute transform transition-all duration-300 ease-in-out";
    
    switch (position) {
      case "top-left":
        return `${baseStyles} top-0 left-0 -translate-x-1/2 -translate-y-1/2`;
      case "top-right":
        return `${baseStyles} top-0 right-0 translate-x-1/2 -translate-y-1/2`;
      case "bottom-left":
        return `${baseStyles} bottom-0 left-0 -translate-x-1/2 translate-y-1/2`;
      case "bottom-right":
        return `${baseStyles} bottom-0 right-0 translate-x-1/2 translate-y-1/2`;
      default:
        return baseStyles;
    }
  };

  const getHoverEffect = (optionId: string, position: string) => {
    if (hoveredOption !== optionId) return {};
    
    switch (position) {
      case "top-left":
        return { transform: 'translate(-55%, -55%) scale(1.05)' };
      case "top-right":
        return { transform: 'translate(55%, -55%) scale(1.05)' };
      case "bottom-left":
        return { transform: 'translate(-55%, 55%) scale(1.05)' };
      case "bottom-right":
        return { transform: 'translate(55%, 55%) scale(1.05)' };
      default:
        return {};
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          {/* Main Title */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              {companyName}
              <span className="block text-3xl md:text-4xl font-light text-blue-600 mt-2">
                Gifting
              </span>
            </h1>
          </div>

          {/* Interactive Logo with Options */}
          <div className="relative flex items-center justify-center my-16">
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-96 h-96 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full opacity-30 blur-xl"></div>
            </div>
            
            {/* Connection Lines */}
            <div className="absolute inset-0">
              {options.map((option) => (
                <div
                  key={option.id}
                  className={`absolute w-32 h-0.5 bg-gray-300 transition-all duration-300 ${
                    hoveredOption === option.id ? 'bg-blue-500 scale-110' : ''
                  }`}
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${
                      option.position === 'top-left' ? '-45deg' :
                      option.position === 'top-right' ? '45deg' :
                      option.position === 'bottom-left' ? '-135deg' : '135deg'
                    }) translateX(-50%)`,
                    transformOrigin: 'left center'
                  }}
                />
              ))}
            </div>

            {/* Central Logo Area */}
            <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 w-80 h-80 flex items-center justify-center transition-all duration-300 hover:shadow-3xl hover:scale-105">
              <div className="text-center">
                <img
                  src={logo}
                  alt={`${companyName} Logo`}
                  className="w-48 h-48 object-contain mx-auto mb-4"
                />
              </div>
            </div>

            {/* Option Cards */}
            {options.map((option) => (
              <div
                key={option.id}
                className={getPositionStyles(option.position)}
                style={getHoverEffect(option.id, option.position)}
                onMouseEnter={() => setHoveredOption(option.id)}
                onMouseLeave={() => setHoveredOption(null)}
              >
                <Button
                  className={`
                    w-48 h-48 rounded-2xl shadow-lg border-2 border-white bg-white/90 backdrop-blur-sm
                    hover:shadow-2xl hover:scale-105 transition-all duration-300
                    flex flex-col items-center justify-center p-4
                    ${hoveredOption === option.id ? 'ring-4 ring-blue-500/20 bg-white' : ''}
                  `}
                  onClick={() => setLocation(option.path)}
                  style={{
                    background: hoveredOption === option.id 
                      ? `linear-gradient(135deg, white, ${primaryColor}15)`
                      : 'white'
                  }}
                >
                  <div className="text-center space-y-2 w-full">
                    <h3 className="text-base font-bold text-gray-900 leading-tight line-clamp-2 break-words">
                      {option.title}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 break-words">
                      {option.description}
                    </p>
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mt-1 transition-all duration-300"
                      style={{
                        backgroundColor: hoveredOption === option.id ? primaryColor : '#f3f4f6'
                      }}
                    >
                      <ArrowRight 
                        className="h-4 w-4 transition-all duration-300"
                        style={{
                          color: hoveredOption === option.id ? 'white' : primaryColor,
                          transform: hoveredOption === option.id ? 'translateX(2px)' : 'none'
                        }}
                      />
                    </div>
                  </div>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}