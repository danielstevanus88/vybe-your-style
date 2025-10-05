import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Heart, Sparkles, ShoppingBag, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import outfit1 from "@/assets/outfit-1-denim-tee.jpg";
import outfit2 from "@/assets/outfit-2-blazer.jpg";
import outfit3 from "@/assets/outfit-3-dress.jpg";
import outfit4 from "@/assets/outfit-4-streetwear.jpg";

const Results = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedOutfits, setSelectedOutfits] = useState<number[]>([]);
  const [showGenerated, setShowGenerated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const image = localStorage.getItem('uploadedImage');
    if (!image) {
      navigate('/upload');
      return;
    }
    setUploadedImage(image);
  }, [navigate]);

  // Mock outfit recommendations
  const outfitRecommendations = [
    { id: 1, name: 'Classic Denim & White Tee', price: '$89', style: 'Timeless casual', image: outfit1 },
    { id: 2, name: 'Blazer & Trousers Combo', price: '$199', style: 'Professional chic', image: outfit2 },
    { id: 3, name: 'Flowy Summer Dress', price: '$129', style: 'Effortless elegance', image: outfit3 },
    { id: 4, name: 'Streetwear Hoodie Set', price: '$149', style: 'Urban cool', image: outfit4 },
  ];

  const toggleOutfitSelection = (id: number) => {
    setSelectedOutfits(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleGenerateImages = () => {
    if (selectedOutfits.length === 0) {
      toast.error("Please select at least one outfit");
      return;
    }
    setShowGenerated(true);
    toast.success("Generating your virtual try-on images!");
  };

  const handleSaveToGallery = () => {
    toast.success("Look saved to your gallery!");
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/categories')}
              className="mb-4 transition-smooth"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Your <span className="gradient-text">Style Analysis</span>
            </h1>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Original Image */}
            <Card className="p-6 shadow-elegant">
              <h2 className="text-2xl font-semibold mb-4">Your Uploaded Look</h2>
              {uploadedImage && (
                <img 
                  src={uploadedImage} 
                  alt="Original" 
                  className="w-full rounded-xl object-contain max-h-96"
                />
              )}
            </Card>

            {/* AI Analysis */}
            <Card className="p-6 shadow-elegant bg-gradient-to-br from-card to-muted/20">
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-accent" />
                AI Style Insights
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-background/50">
                  <p className="text-sm font-semibold text-accent mb-1">Overall Vibe</p>
                  <p className="text-muted-foreground">Casual chic with modern elements</p>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <p className="text-sm font-semibold text-accent mb-1">Strengths</p>
                  <p className="text-muted-foreground">Great color coordination and fit</p>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <p className="text-sm font-semibold text-accent mb-1">Recommendations</p>
                  <p className="text-muted-foreground">Try adding statement accessories to elevate the look</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Outfit Recommendations */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-6">Recommended Outfits</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {outfitRecommendations.map((outfit) => (
                <Card 
                  key={outfit.id}
                  className={`
                    p-4 cursor-pointer transition-smooth
                    ${selectedOutfits.includes(outfit.id) 
                      ? 'ring-2 ring-accent shadow-elegant scale-105' 
                      : 'hover:shadow-elegant hover:scale-102'
                    }
                  `}
                  onClick={() => toggleOutfitSelection(outfit.id)}
                >
                  <div className="aspect-square mb-4 rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={outfit.image} 
                      alt={outfit.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-semibold mb-2">{outfit.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{outfit.style}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-accent font-bold">{outfit.price}</span>
                    <Button variant="ghost" size="sm" className="hover:text-accent">
                      <ShoppingBag className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            <Button
              onClick={handleGenerateImages}
              disabled={selectedOutfits.length === 0}
              className="bg-gradient-to-r from-accent to-purple-600 hover:shadow-elegant transition-smooth px-8"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Virtual Try-On
            </Button>
            <Button variant="outline" className="transition-smooth">
              <RefreshCw className="w-4 h-4 mr-2" />
              Get More Recommendations
            </Button>
          </div>

          {/* Generated Images Section */}
          {showGenerated && (
            <div className="mt-12">
              <h2 className="text-3xl font-bold mb-6">Your Virtual Try-On</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {['Front View', 'Back View', 'Left Side', 'Right Side'].map((view, idx) => (
                  <Card key={idx} className="p-4 shadow-elegant">
                    <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                      <span className="text-6xl">📸</span>
                    </div>
                    <p className="text-center font-semibold">{view}</p>
                  </Card>
                ))}
              </div>
              <div className="flex justify-center mt-8 gap-4">
                <Button
                  onClick={handleSaveToGallery}
                  className="bg-gradient-to-r from-accent to-purple-600 hover:shadow-elegant transition-smooth"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Save to Gallery
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/saved')}
                  className="transition-smooth"
                >
                  View Saved Looks
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Results;
