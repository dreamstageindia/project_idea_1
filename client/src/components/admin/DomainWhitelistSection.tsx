import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, X, Trash2, Edit, Check, X as XIcon, UserPlus, Shield, Settings } from "lucide-react";

interface DomainWhitelist {
  id: string;
  domain: string;
  isActive: boolean;
  autoCreateUser: boolean;
  defaultPoints: number;
  canLoginWithoutEmployeeId: boolean;
  createdAt: string;
  updatedAt: string;
}

export function DomainWhitelistSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: domains = [], isLoading } = useQuery<DomainWhitelist[]>({ 
    queryKey: ["/api/admin/domain-whitelist"] 
  });

  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
  const [editDomainDraft, setEditDomainDraft] = useState<Partial<DomainWhitelist>>({});
  const [newDomain, setNewDomain] = useState("");

  const addDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const res = await apiRequest("POST", "/api/admin/domain-whitelist", {
        domain,
        isActive: true,
        autoCreateUser: true,
        defaultPoints: 100,
        canLoginWithoutEmployeeId: true
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/domain-whitelist"] });
      setNewDomain("");
      toast({ title: "Domain added successfully" });
    },
    onError: (e: any) => toast({ 
      title: "Failed to add domain", 
      description: e.message, 
      variant: "destructive" 
    }),
  });

  const updateDomainMutation = useMutation({
    mutationFn: async (payload: Partial<DomainWhitelist> & { id: string }) => {
      const { id, ...body } = payload;
      const res = await apiRequest("PUT", `/api/admin/domain-whitelist/${id}`, body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/domain-whitelist"] });
      setEditingDomainId(null);
      toast({ title: "Domain updated" });
    },
    onError: (e: any) => toast({ 
      title: "Failed to update domain", 
      description: e.message, 
      variant: "destructive" 
    }),
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/domain-whitelist/${id}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/domain-whitelist"] });
      toast({ title: "Domain deleted" });
    },
    onError: (e: any) => toast({ 
      title: "Failed to delete domain", 
      description: e.message, 
      variant: "destructive" 
    }),
  });

  const startEditDomain = (domain: DomainWhitelist) => {
    setEditingDomainId(domain.id);
    setEditDomainDraft({
      domain: domain.domain,
      isActive: domain.isActive,
      autoCreateUser: domain.autoCreateUser,
      defaultPoints: domain.defaultPoints,
      canLoginWithoutEmployeeId: domain.canLoginWithoutEmployeeId,
    });
  };

  const saveEditDomain = () => {
    if (!editingDomainId) return;
    updateDomainMutation.mutate({ id: editingDomainId, ...editDomainDraft });
  };

  const handleAddDomain = () => {
    if (!newDomain.trim()) {
      toast({ title: "Please enter a domain", variant: "destructive" });
      return;
    }
    addDomainMutation.mutate(newDomain.trim().toLowerCase());
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading domains...</div>;
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Domain-Based Authentication
          </CardTitle>
          <CardDescription>
            Configure which email domains can access the platform. Users from whitelisted domains can auto-register.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Auto-Create Users</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically create user accounts when someone from a whitelisted domain logs in for the first time
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Domain Verification</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Only emails from whitelisted domains can receive OTPs and access the platform
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold">Flexible Configuration</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Set default points, toggle features, and manage access for each domain individually
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Domain Whitelist Management</CardTitle>
          <CardDescription>
            Add domains that are authorized to access the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add new domain */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter domain (e.g., company.com)"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
              disabled={addDomainMutation.isPending}
            />
            <Button onClick={handleAddDomain} disabled={addDomainMutation.isPending}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Domain
            </Button>
          </div>

          {/* Domains table */}
          {domains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No domains configured yet.</p>
              <p className="text-sm">Add a domain above to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Auto Create</TableHead>
                    <TableHead>Default Points</TableHead>
                    <TableHead>Login Without ID</TableHead>
                    <TableHead className="w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map((domain) => {
                    const isEditing = editingDomainId === domain.id;
                    return (
                      <TableRow key={domain.id}>
                        <TableCell className="font-mono">@{domain.domain}</TableCell>
                        <TableCell>
                          {isEditing ? (
                            <select
                              className="border rounded px-2 py-1 text-sm"
                              value={editDomainDraft.isActive ? "true" : "false"}
                              onChange={(e) =>
                                setEditDomainDraft(d => ({ ...d, isActive: e.target.value === "true" }))
                              }
                            >
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          ) : (
                            <Badge variant={domain.isActive ? "default" : "secondary"}>
                              {domain.isActive ? "Active" : "Inactive"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <select
                              className="border rounded px-2 py-1 text-sm"
                              value={editDomainDraft.autoCreateUser ? "true" : "false"}
                              onChange={(e) =>
                                setEditDomainDraft(d => ({ ...d, autoCreateUser: e.target.value === "true" }))
                              }
                            >
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          ) : (
                            domain.autoCreateUser ? (
                              <Check className="h-5 w-5 text-green-600" />
                            ) : (
                              <XIcon className="h-5 w-5 text-red-600" />
                            )
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="number"
                              min="0"
                              value={String(editDomainDraft.defaultPoints ?? 0)}
                              onChange={(e) =>
                                setEditDomainDraft(d => ({ ...d, defaultPoints: parseInt(e.target.value) || 0 }))
                              }
                              className="w-24"
                            />
                          ) : (
                            domain.defaultPoints
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <select
                              className="border rounded px-2 py-1 text-sm"
                              value={editDomainDraft.canLoginWithoutEmployeeId ? "true" : "false"}
                              onChange={(e) =>
                                setEditDomainDraft(d => ({ ...d, canLoginWithoutEmployeeId: e.target.value === "true" }))
                              }
                            >
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          ) : (
                            domain.canLoginWithoutEmployeeId ? (
                              <Check className="h-5 w-5 text-green-600" />
                            ) : (
                              <XIcon className="h-5 w-5 text-red-600" />
                            )
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={saveEditDomain}
                                disabled={updateDomainMutation.isPending}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setEditingDomainId(null)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => startEditDomain(domain)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteDomainMutation.mutate(domain.id)}
                                disabled={deleteDomainMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}