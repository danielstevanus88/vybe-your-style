import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Heart, Sparkles, ShoppingBag, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import outfit1 from "@/assets/outfit-1-denim-tee.jpg";
import outfit2 from "@/assets/outfit-2-blazer.jpg";
import outfit3 from "@/assets/outfit-3-dress.jpg";
import outfit4 from "@/assets/outfit-4-streetwear.jpg";

const Results = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedOutfits, setSelectedOutfits] = useState<number[]>([]);
  const [showGenerated, setShowGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customClothes, setCustomClothes] = useState<string[]>([]);
  const virtualTryOnRef = useRef<HTMLDivElement>(null);
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
    { id: 1, name: 'Classic Denim & White Tee', price: '$89', style: 'Timeless casual', image: outfit1, matchScore: 94 },
    { id: 2, name: 'Blazer & Trousers Combo', price: '$199', style: 'Professional chic', image: outfit2, matchScore: 88 },
    { id: 3, name: 'Flowy Summer Dress', price: '$129', style: 'Effortless elegance', image: outfit3, matchScore: 91 },
    { id: 4, name: 'Streetwear Hoodie Set', price: '$149', style: 'Urban cool', image: outfit4, matchScore: 85 },
  ];

  const toggleOutfitSelection = (id: number) => {
    setSelectedOutfits(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleGenerateImages = async () => {
    if (selectedOutfits.length === 0) {
      toast.error("Please select at least one outfit");
      return;
    }
    
    setIsGenerating(true);
    toast.info("AI is generating your virtual try-on images...");
    
    // Simulate AI generation (replace with actual API call)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsGenerating(false);
    setShowGenerated(true);
    toast.success("Virtual try-on complete!");
    
    // Auto-scroll to the generated section
    setTimeout(() => {
      virtualTryOnRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  const handleSaveToGallery = () => {
    toast.success("Look saved to your gallery!");
  };

  const handleCustomClothesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload image files only");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCustomClothes(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });

    toast.success("Custom clothing uploaded!");
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
                  <p className="text-sm font-semibold text-accent mb-1">Style Match Score</p>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-bold gradient-text">92%</div>
                    <p className="text-muted-foreground text-sm">Excellent match with your selected style category</p>
                  </div>
                </div>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h2 className="text-3xl font-bold mb-2">Recommended Outfits</h2>
                <p className="text-muted-foreground">Click to select outfits for virtual try-on</p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleCustomClothesUpload}
                  className="hidden"
                />
                <Button variant="outline" className="transition-smooth" asChild>
                  <span>
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Upload Your Own Clothes
                  </span>
                </Button>
              </label>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {outfitRecommendations.map((outfit) => (
                <Card 
                  key={outfit.id}
                  className={`
                    p-4 cursor-pointer transition-smooth relative
                    ${selectedOutfits.includes(outfit.id) 
                      ? 'ring-4 ring-accent shadow-elegant scale-105 bg-accent/5' 
                      : 'hover:shadow-elegant hover:scale-102 hover:ring-2 hover:ring-accent/50'
                    }
                  `}
                  onClick={() => toggleOutfitSelection(outfit.id)}
                >
                  {selectedOutfits.includes(outfit.id) && (
                    <div className="absolute top-2 left-2 bg-accent text-accent-foreground px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 z-10">
                      <Heart className="w-3 h-3 fill-current" />
                      Selected
                    </div>
                  )}
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
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">{outfit.matchScore}% match</span>
                      <Button variant="ghost" size="sm" className="hover:text-accent">
                        <ShoppingBag className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              
              {/* Custom Uploaded Clothes */}
              {customClothes.map((clothingImg, idx) => (
                <Card 
                  key={`custom-${idx}`}
                  className={`
                    p-4 cursor-pointer transition-smooth relative
                    ${selectedOutfits.includes(1000 + idx) 
                      ? 'ring-4 ring-accent shadow-elegant scale-105 bg-accent/5' 
                      : 'hover:shadow-elegant hover:scale-102 hover:ring-2 hover:ring-accent/50'
                    }
                  `}
                  onClick={() => toggleOutfitSelection(1000 + idx)}
                >
                  {selectedOutfits.includes(1000 + idx) && (
                    <div className="absolute top-2 left-2 bg-accent text-accent-foreground px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 z-10">
                      <Heart className="w-3 h-3 fill-current" />
                      Selected
                    </div>
                  )}
                  <div className="aspect-square mb-4 rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={clothingImg} 
                      alt="Custom clothing"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-semibold mb-2">Your Custom Outfit</h3>
                  <p className="text-sm text-muted-foreground mb-2">Uploaded by you</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            <Button
              onClick={handleGenerateImages}
              disabled={selectedOutfits.length === 0 || isGenerating}
              className="bg-gradient-to-r from-accent to-purple-600 hover:shadow-elegant transition-smooth px-8"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Virtual Try-On
                </>
              )}
            </Button>
            <Button variant="outline" className="transition-smooth">
              <RefreshCw className="w-4 h-4 mr-2" />
              Get More Recommendations
            </Button>
          </div>

          {/* Loading UI */}
          {isGenerating && (
            <div className="mt-12 p-12 bg-card rounded-3xl border border-border shadow-elegant">
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-accent animate-spin" />
                  <Sparkles className="w-8 h-8 text-accent absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold">AI is Creating Your Look</h3>
                  <p className="text-muted-foreground">Generating your virtual try-on images from multiple angles...</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Generated Images Section */}
          {showGenerated && !isGenerating && (
            <div ref={virtualTryOnRef} className="mt-12 scroll-mt-8">
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
