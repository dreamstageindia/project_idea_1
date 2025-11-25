import { SiApple, SiSamsung, SiSony, SiNike, SiAdidas, SiPuma } from "react-icons/si";

export default function BrandsShowcase() {
  const brands = [
    { icon: SiApple, name: "Apple" },
    { icon: SiSamsung, name: "Samsung" },
    { icon: SiSony, name: "Sony" },
    { icon: SiNike, name: "Nike" },
    { icon: SiAdidas, name: "Adidas" },
    { icon: SiPuma, name: "Puma" },
  ];

  return (
    <div className="py-12 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-center mb-8" data-testid="text-brands-title">
          Brands we deal in
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
          {brands.map((brand) => (
            <div 
              key={brand.name} 
              className="flex items-center justify-center grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100"
              data-testid={`brand-${brand.name.toLowerCase()}`}
            >
              <brand.icon className="w-12 h-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
