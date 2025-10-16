import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDocumentSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { FileText, Plus, Edit, Trash2, Search, Eye, Download, Shield, ScrollText, Briefcase } from "lucide-react";
import type { Document } from "@shared/schema";
import { z } from "zod";

const documentFormSchema = insertDocumentSchema;

export default function DocumentManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["/api/documents"],
  });

  const form = useForm<z.infer<typeof documentFormSchema>>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      name: "",
      type: "terms",
      content: "",
      version: "1.0",
    },
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof documentFormSchema>) => {
      return apiRequest("POST", "/api/documents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsDialogOpen(false);
      setEditingDocument(null);
      form.reset();
      toast({
        title: "Success",
        description: "Document created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create document",
        variant: "destructive",
      });
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Document> }) => {
      return apiRequest("PATCH", `/api/documents/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsDialogOpen(false);
      setEditingDocument(null);
      form.reset();
      toast({
        title: "Success",
        description: "Document updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update document",
        variant: "destructive",
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof documentFormSchema>) => {
    if (editingDocument) {
      // Increment version for updates
      const currentVersion = parseFloat(editingDocument.version);
      const newVersion = (currentVersion + 0.1).toFixed(1);
      updateDocumentMutation.mutate({ 
        id: editingDocument.id, 
        data: { ...data, version: newVersion }
      });
    } else {
      createDocumentMutation.mutate(data);
    }
  };

  const handleEdit = (doc: Document) => {
    setEditingDocument(doc);
    form.reset({
      name: doc.name,
      type: doc.type,
      content: doc.content,
      version: doc.version,
    });
    setIsDialogOpen(true);
  };

  const handleView = (doc: Document) => {
    setViewingDocument(doc);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      deleteDocumentMutation.mutate(id);
    }
  };

  const handleDownload = (doc: Document) => {
    const element = document.createElement("a");
    const file = new Blob([doc.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${doc.name}_v${doc.version}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const filteredDocuments = documents?.filter((doc: Document) => {
    const matchesSearch = !searchQuery || 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || doc.type === typeFilter;
    
    return matchesSearch && matchesType;
  }) || [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'nda':
        return <Shield className="h-4 w-4" />;
      case 'terms':
        return <ScrollText className="h-4 w-4" />;
      case 'scope':
        return <Briefcase className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'nda':
        return <Badge className="bg-red-100 text-red-800">NDA</Badge>;
      case 'terms':
        return <Badge className="bg-blue-100 text-blue-800">Terms & Conditions</Badge>;
      case 'scope':
        return <Badge className="bg-green-100 text-green-800">Scope of Work</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getDocumentTemplate = (type: string) => {
    switch (type) {
      case 'nda':
        return `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into on [DATE] by and between Gigglebuz and the User.

1. CONFIDENTIAL INFORMATION
The parties acknowledge that they may have access to certain confidential information...

2. OBLIGATIONS
The receiving party agrees to:
- Keep all confidential information strictly confidential
- Not disclose to any third parties
- Use information solely for platform purposes

3. TERM
This agreement shall remain in effect until terminated by either party with 30 days written notice.

[Additional terms and conditions...]`;

      case 'terms':
        return `TERMS AND CONDITIONS

Welcome to Gigglebuz. These terms and conditions ("Terms") govern your use of our platform.

1. ACCEPTANCE OF TERMS
By accessing and using this platform, you accept and agree to be bound by these Terms.

2. USER ACCOUNTS
- Users must provide accurate information
- Users are responsible for account security
- One account per person

3. PLATFORM USAGE
- Respectful behavior is required
- No spam or inappropriate content
- Follow community guidelines

4. PAYMENTS AND COINS
- Virtual currency terms
- Purchase and refund policies
- Transaction processing

[Additional terms and conditions...]`;

      case 'scope':
        return `SCOPE OF WORK

This document outlines the scope of work for platform development and maintenance.

1. PROJECT OVERVIEW
Development and maintenance of the Gigglebuz social platform including:
- User management system
- Virtual currency and gifting
- Content moderation
- Payment processing

2. DELIVERABLES
- Admin panel functionality
- User-facing mobile application
- API development
- Database management

3. TIMELINE
Phase 1: Core functionality (30 days)
Phase 2: Advanced features (45 days)
Phase 3: Testing and deployment (15 days)

4. RESPONSIBILITIES
Client: Provide requirements, feedback, and timely approvals
Vendor: Deliver quality code, documentation, and support

[Additional scope details...]`;

      default:
        return "";
    }
  };

  const totalDocuments = documents?.length || 0;
  const documentsByType = {
    nda: documents?.filter((d: Document) => d.type === 'nda').length || 0,
    terms: documents?.filter((d: Document) => d.type === 'terms').length || 0,
    scope: documents?.filter((d: Document) => d.type === 'scope').length || 0,
  };

  return (
    <AdminLayout title="Document Management">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Documents</p>
                  <p className="text-3xl font-bold text-gray-900">{totalDocuments}</p>
                </div>
                <div className="gradient-bg p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">NDAs</p>
                  <p className="text-3xl font-bold text-red-600">{documentsByType.nda}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Terms</p>
                  <p className="text-3xl font-bold text-blue-600">{documentsByType.terms}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <ScrollText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Scope Docs</p>
                  <p className="text-3xl font-bold text-green-600">{documentsByType.scope}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <Briefcase className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full sm:w-96"
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="nda">NDA</SelectItem>
                <SelectItem value="terms">Terms & Conditions</SelectItem>
                <SelectItem value="scope">Scope of Work</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg text-white" onClick={() => setEditingDocument(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDocument ? "Edit Document" : "Add New Document"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Platform Terms of Service" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document Type</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              if (!editingDocument) {
                                form.setValue("content", getDocumentTemplate(value));
                              }
                            }} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="nda">Non-Disclosure Agreement</SelectItem>
                              <SelectItem value="terms">Terms & Conditions</SelectItem>
                              <SelectItem value="scope">Scope of Work</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="version"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Version</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="1.0" disabled={!!editingDocument} />
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          {editingDocument ? "Version will be auto-incremented on update" : "Starting version number"}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Content</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter document content..."
                            rows={20}
                            className="font-mono text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="flex-1 gradient-bg text-white" 
                      disabled={createDocumentMutation.isPending || updateDocumentMutation.isPending}
                    >
                      {(createDocumentMutation.isPending || updateDocumentMutation.isPending) ? 
                        "Saving..." : 
                        editingDocument ? "Update Document" : "Create Document"
                      }
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Documents ({filteredDocuments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Content Preview</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc: Document) => (
                    <TableRow key={doc.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(doc.type)}
                          <span className="font-medium">{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(doc.type)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">v{doc.version}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-gray-500 truncate">
                          {doc.content.substring(0, 100)}...
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(doc.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(doc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(doc)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                            disabled={deleteDocumentMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {!isLoading && filteredDocuments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No documents found</p>
                <p className="text-sm">Create your first document to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Document Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {viewingDocument && getTypeIcon(viewingDocument.type)}
                <span>{viewingDocument?.name} v{viewingDocument?.version}</span>
              </DialogTitle>
            </DialogHeader>
            
            {viewingDocument && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  {getTypeBadge(viewingDocument.type)}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(viewingDocument)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        handleEdit(viewingDocument);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {viewingDocument.content}
                  </pre>
                </div>
                
                <div className="text-sm text-gray-500">
                  <p>Last updated: {formatDate(viewingDocument.updatedAt)}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Document Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Document Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => {
                form.setValue("name", "Non-Disclosure Agreement");
                form.setValue("type", "nda");
                form.setValue("content", getDocumentTemplate("nda"));
                form.setValue("version", "1.0");
                setIsDialogOpen(true);
              }}>
                <div className="flex items-center space-x-3">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <Shield className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">NDA Template</h4>
                    <p className="text-sm text-gray-500">Non-disclosure agreement</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => {
                form.setValue("name", "Terms and Conditions");
                form.setValue("type", "terms");
                form.setValue("content", getDocumentTemplate("terms"));
                form.setValue("version", "1.0");
                setIsDialogOpen(true);
              }}>
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <ScrollText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Terms Template</h4>
                    <p className="text-sm text-gray-500">Platform terms & conditions</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => {
                form.setValue("name", "Scope of Work");
                form.setValue("type", "scope");
                form.setValue("content", getDocumentTemplate("scope"));
                form.setValue("version", "1.0");
                setIsDialogOpen(true);
              }}>
                <div className="flex items-center space-x-3">
                  <div className="gradient-bg p-2 rounded-lg">
                    <Briefcase className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium">SOW Template</h4>
                    <p className="text-sm text-gray-500">Project scope document</p>
                  </div>
                </div>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
