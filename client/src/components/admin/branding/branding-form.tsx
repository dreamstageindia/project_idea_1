import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UploadIcon } from "lucide-react";
import { uploadFiles } from "@/lib/admin-utils";
import type { Branding } from "./types";

export function BrandingForm() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: branding } = useQuery<Branding>({ 
    queryKey: ["/api/admin/branding"] 
  });

  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#1e40af");
  const [accentColor, setAccentColor] = useState("#f97316");
  const [inrPerPoint, setInrPerPoint] = useState("1.00");
  const [maxSelections, setMaxSelections] = useState("1");
  const [customMax, setCustomMax] = useState("");

  useEffect(() => {
    if (branding) {
      setPrimaryColor(branding.primaryColor || "#1e40af");
      setAccentColor(branding.accentColor || "#f97316");
      setInrPerPoint(branding.inrPerPoint || "1.00");
      const val = branding.maxSelectionsPerUser;
      if (val === -1) {
        setMaxSelections("infinite");
      } else if ([1, 2, 5, 10].includes(val)) {
        setMaxSelections(String(val));
      } else {
        setMaxSelections("custom");
        setCustomMax(String(val));
      }
    }
  }, [branding]);

  const updateBrandingMutation = useMutation({
    mutationFn: async (body: Partial<Branding>) => {
      const res = await apiRequest("PUT", `/api/admin/branding`, body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/branding"] });
      toast({ title: "Branding updated" });
    },
    onError: (e: any) => toast({ 
      title: "Branding update failed", 
      description: e.message, 
      variant: "destructive" 
    }),
  });

  const handleMaxSelectionsChange = (value: string) => {
    setMaxSelections(value);
    let val: number;
    if (value === "infinite") val = -1;
    else if (value === "custom") return; // wait for input
    else val = Number(value);
    updateBrandingMutation.mutate({ maxSelectionsPerUser: val });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme & Redemption Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input
              defaultValue={branding?.companyName || ""}
              onBlur={(e) => updateBrandingMutation.mutate({ companyName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={primaryColor}
                onChange={(e) => {
                  setPrimaryColor(e.target.value);
                  updateBrandingMutation.mutate({ primaryColor: e.target.value });
                }}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                onBlur={(e) => updateBrandingMutation.mutate({ primaryColor: e.target.value })}
                placeholder="#1e40af"
                className="flex-1"
              />
              <div
                aria-label="Primary preview"
                className="w-10 h-10 rounded border"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Accent Color</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={accentColor}
                onChange={(e) => {
                  setAccentColor(e.target.value);
                  updateBrandingMutation.mutate({ accentColor: e.target.value });
                }}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                onBlur={(e) => updateBrandingMutation.mutate({ accentColor: e.target.value })}
                placeholder="#f97316"
                className="flex-1"
              />
              <div
                aria-label="Accent preview"
                className="w-10 h-10 rounded border"
                style={{ backgroundColor: accentColor }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>₹ per 1 point</Label>
            <Input
              type="number"
              step="0.01"
              value={inrPerPoint}
              onChange={(e) => setInrPerPoint(e.target.value)}
              onBlur={(e) => updateBrandingMutation.mutate({ inrPerPoint: e.target.value })}
              placeholder="1.00"
            />
            <p className="text-xs text-muted-foreground">
              How many rupees is one point worth? (Used for redemptions)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Product selections per user</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={maxSelections}
              onChange={(e) => handleMaxSelectionsChange(e.target.value)}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="infinite">Infinite</option>
              <option value="custom">Custom</option>
            </select>
            {maxSelections === "custom" && (
              <Input
                type="number"
                min="1"
                value={customMax}
                onChange={(e) => setCustomMax(e.target.value)}
                onBlur={(e) => {
                  const val = Number(e.target.value) || 1;
                  updateBrandingMutation.mutate({ maxSelectionsPerUser: val });
                }}
                placeholder="Enter number"
              />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (!files.length) return;
                try {
                  setLogoUploading(true);
                  const [url] = await uploadFiles(files.slice(0, 1));
                  await updateBrandingMutation.mutateAsync({ logoUrl: url });
                  toast({ title: "Logo updated" });
                } catch (err: any) {
                  toast({ title: "Logo upload failed", description: err.message, variant: "destructive" });
                } finally {
                  setLogoUploading(false);
                }
              }}
            />
            <UploadIcon className="h-5 w-5 opacity-60" />
            {logoUploading && <span className="text-sm text-muted-foreground">Uploading…</span>}
          </div>
          {branding?.logoUrl && (
            <div className="mt-2 w-28 h-28 rounded border overflow-hidden bg-muted">
              <img src={branding.logoUrl} alt="logo" className="object-contain w-full h-full" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Banner</Label>
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (!files.length) return;
                try {
                  setBannerUploading(true);
                  const [url] = await uploadFiles(files.slice(0, 1));
                  await updateBrandingMutation.mutateAsync({ bannerUrl: url });
                  toast({ title: "Banner updated" });
                } catch (err: any) {
                  toast({ title: "Banner upload failed", description: err.message, variant: "destructive" });
                } finally {
                  setBannerUploading(false);
                }
              }}
            />
            <UploadIcon className="h-5 w-5 opacity-60" />
            {bannerUploading && <span className="text-sm text-muted-foreground">Uploading…</span>}
          </div>
          {branding?.bannerUrl && (
            <div className="mt-2 w-full max-w-xl h-40 rounded border overflow-hidden bg-muted">
              <img src={branding.bannerUrl} alt="banner" className="object-cover w-full h-full" />
            </div>
          )}
        </div>

        <div>
          <Label>Banner Text</Label>
          <Textarea
            defaultValue={branding?.bannerText || ""}
            onBlur={(e) => updateBrandingMutation.mutate({ bannerText: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}