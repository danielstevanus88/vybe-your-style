import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

const SavedLooks = () => {
  const navigate = useNavigate();
  const [savedLooks] = useState([
    { id: 1, name: 'Summer Casual Look', date: '2025-10-03', outfits: 2 },
    { id: 2, name: 'Office Professional', date: '2025-10-02', outfits: 3 },
    { id: 3, name: 'Weekend Streetwear', date: '2025-10-01', outfits: 1 },
  ]);

  const handleDelete = (id: number) => {
    toast.success("Look deleted");
  };

  const handleDownload = (id: number) => {
    toast.success("Downloading images...");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <Button
              variant="ghost"
              onClick={() => navigate('/upload')}
              className="mb-6 transition-smooth"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Saved Looks</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Your collection of styled outfits
            </p>
          </div>

          {/* Saved Looks Grid */}
          {savedLooks.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedLooks.map((look) => (
                <Card key={look.id} className="p-6 shadow-elegant hover:shadow-2xl transition-smooth group">
                  <div className="aspect-square bg-muted rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                    <span className="text-8xl">👔</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{look.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {look.outfits} outfit{look.outfits > 1 ? 's' : ''} • {look.date}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(look.id)}
                      className="flex-1 transition-smooth"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(look.id)}
                      className="text-destructive hover:bg-destructive/10 transition-smooth"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground mb-6">No saved looks yet</p>
              <Button
                onClick={() => navigate('/upload')}
                className="bg-gradient-to-r from-accent to-purple-600 hover:shadow-elegant transition-smooth"
              >
                Create Your First Look
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedLooks;
