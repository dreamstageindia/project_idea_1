import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import bgImage from "@assets/bg_3.png";

type Branding = {
  companyName: string;
  logoUrl: string | null;
};

export default function Home() {
  const [, setLocation] = useLocation();

  const { data: branding } = useQuery<Branding>({
    queryKey: ["/api/admin/branding"],
  });

  const menus = [
    { title: "Brand Store", color: "bg-[#1f3b73]", path: "/dashboard" },
    { title: "Special Occasions", color: "bg-[#f2cf2f]", path: "/special-occasions" },
    { title: "Bulk Buy", color: "bg-[#f57c21]", path: "/bulk-buy" },
    { title: "CSR Support / Blog", color: "bg-[#2e9b4e]", path: "/csr" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* HEADER */}
      <div className="flex flex-col items-center mb-16">
        {branding?.logoUrl && (
          <img src={branding.logoUrl} alt="logo" className="h-16 mb-3" />
        )}
        
        <h2 className="text-4xl font-semibold text-[#1f3b73] mt-1">
          Gifting
        </h2>
      </div>

      {/* 4 CIRCLES */}
      <div className="grid grid-cols-2 gap-x-28 gap-y-28 place-items-center">
        {menus.map((menu) => (
          <button
            key={menu.title}
            onClick={() => setLocation(menu.path)}
            className="group relative"
          >
            {/* GREEN OUTER RING */}
            <div className="w-56 h-56 rounded-full border-[12px] border-[#7bc144] flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              
              {/* INNER COLORED CIRCLE */}
              <div
                className={`w-36 h-36 rounded-full ${menu.color} flex items-center justify-center`}
              >
                <span className="text-white text-base font-semibold text-center px-4 leading-tight">
                  {menu.title}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
