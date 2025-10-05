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

// helper: convert dataURL (base64) to File
function dataURLtoFile(dataurl: string, filename: string) {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) {
    u8[n] = bstr.charCodeAt(n);
  }
  return new File([u8], filename, { type: mime });
}

const Results = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedOutfits, setSelectedOutfits] = useState<number[]>([]);
  const [showGenerated, setShowGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customClothes, setCustomClothes] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<Array<{ view: string; src?: string; error?: string }>>([]); // add state to hold returned images
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

  // Fetch AI style insights (feedback) when we have an uploaded image
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // reusable fetch function so we can retry from UI
  const fetchFeedback = async (signal?: AbortSignal) => {
    if (!uploadedImage) return;
    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
      const fd = new FormData();
      fd.append('image', dataURLtoFile(uploadedImage, 'uploaded.png'));
      // use selected style (first selected outfit as category) or a default
      const styleKey = selectedOutfits.length ? (outfitRecommendations.find(o => o.id === selectedOutfits[0])?.style || 'smart_casual') : 'smart_casual';
      fd.append('style', styleKey);

      const controller = new AbortController();
      if (signal) signal.addEventListener('abort', () => controller.abort());

      const res = await fetch('http://localhost:5001/api/feedback', { method: 'POST', body: fd, signal: controller.signal });
      if (!res.ok) {
        const text = await res.text();
        console.error('Feedback request failed', res.status, text);
        setFeedbackError(text || `Server returned ${res.status}`);
        setAiFeedback(null);
        return;
      }
      const json = await res.json();
      // expected: { overall_score, vibe, tips, tags }
      setAiFeedback(json);
      setFeedbackError(null);
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        console.warn('Feedback request aborted');
        return;
      }
      console.error('Failed to fetch feedback', e);
      setFeedbackError(e?.message || 'Failed to fetch feedback');
      setAiFeedback(null);
    } finally {
      setFeedbackLoading(false);
    }
  };

  useEffect(() => {
    if (!uploadedImage) return;
    const ac = new AbortController();
    fetchFeedback(ac.signal);
    return () => ac.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedImage]);

  const [aiFeedback, setAiFeedback] = useState<any>(null);

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

    try {
      const fd = new FormData();

      // --- 1) user's uploaded image (from state or localStorage)
      const userDataUrl = uploadedImage ?? localStorage.getItem('uploadedImage');
      if (!userDataUrl) {
        throw new Error('No uploaded image found');
      }
      fd.append('images', dataURLtoFile(userDataUrl, 'user-photo.png'));

      // --- 2) selected outfit images (fetch them and append as files)
      // outfitRecommendations is in scope (the list with outfit.image imports)
      const outfitFilesPromises = selectedOutfits.map(async (id) => {
        // handle app's "customClothes" items (you use IDs like 1000+ for custom uploads)
        if (id >= 1000) {
          const idx = id - 1000;
          const dataUrl = customClothes[idx];
          // convert dataURL to File
          return dataURLtoFile(dataUrl, `custom-outfit-${idx}.png`);
        }
        const outfit = outfitRecommendations.find(o => o.id === id);
        if (!outfit) throw new Error(`Outfit ${id} not found`);
        // outfit.image is an import that resolves to a URL, fetch it as blob
        const r = await fetch(outfit.image);
        const blob = await r.blob();
        const ext = (blob.type.split('/')[1] || 'jpg').split('+')[0];
        return new File([blob], `outfit-${id}.${ext}`, { type: blob.type || 'image/jpeg' });
      });

      const outfitFiles = await Promise.all(outfitFilesPromises);
      outfitFiles.forEach((f) => fd.append('images', f));

      // --- 3) prompt: describe how to combine them for Gemini
      const prompt = `Combine the user's photo (first image) with the following outfit images (${selectedOutfits.join(
        ','
      )}). Produce a realistic try-on image, keeping person's pose and lighting, apply Clothing from the outfit images, generate PNG. Output a single image.`;
      fd.append('prompt', prompt);

      // --- 4) POST to server
      // If your server is running on port 5001 locally (see server.js), call that URL.
      const res = await fetch('http://localhost:5001/api/generate', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error ${res.status}: ${text}`);
      }

      const json = await res.json();
      // server returns { results: [ { view, mimeType, data } ] }
      const results: any[] = json.results || [];
      const images = results.map((r) => {
        if (r && r.data && r.mimeType) {
          return { view: r.view || 'Generated', src: `data:${r.mimeType};base64,${r.data}` };
        }
        return { view: r.view || 'Generated', error: r.error || 'Generation failed' };
      });
      setGeneratedImages(images);
      setShowGenerated(true);
      toast.success("Virtual try-on complete!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
      // scroll to generated area if needed
      setTimeout(() => {
        virtualTryOnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
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
                {feedbackLoading ? (
                  <div className="p-4 rounded-lg bg-background/50 flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                    <div className="text-sm text-muted-foreground">Analysis loading...</div>
                  </div>
                ) : aiFeedback ? (
                  <>
                    <div className="p-4 rounded-lg bg-background/50">
                      <p className="text-sm font-semibold text-accent mb-1">Style Match Score</p>
                      <div className="flex items-center gap-3">
                        <div className="text-3xl font-bold gradient-text">{Math.round((aiFeedback.overall_score ?? 0) * 100)}%</div>
                        <p className="text-muted-foreground text-sm">{aiFeedback.vibe}</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-background/50">
                      <p className="text-sm font-semibold text-accent mb-1">Strengths & Recommendations</p>
                      <div className="space-y-2">
                        {(aiFeedback.tips || []).map((t: any, i: number) => (
                          <div key={i}>
                            <div className="text-sm font-medium">{t.label}</div>
                            <div className="text-sm text-muted-foreground">{t.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Component breakdown + detected garments + action plan */}
                    <div className="p-4 rounded-lg bg-background/50">
                      <p className="text-sm font-semibold text-accent mb-2">Detailed Breakdown</p>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {aiFeedback.components ? (
                          Object.entries(aiFeedback.components).map(([k, v]: any) => (
                            <div key={k} className="p-2 bg-muted rounded">
                              <div className="text-xs uppercase text-muted-foreground">{k.replace('_', ' ')}</div>
                              <div className="font-semibold">{Math.round((v ?? 0) * 100)}%</div>
                            </div>
                          ))
                        ) : null}
                      </div>

                      {/* action_plan and detected_garments removed per user request */}
                    </div>

                    {aiFeedback.tags?.length ? (
                      <div className="p-4 rounded-lg bg-background/50">
                        <p className="text-sm font-semibold text-accent mb-1">Detected features</p>
                        <div className="flex flex-wrap gap-2">
                          {aiFeedback.tags.map((tag: string, i: number) => (
                            <span key={i} className="px-2 py-1 text-xs rounded-full bg-zinc-100 border">{tag}</span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : feedbackError ? (
                  <div className="p-4 rounded-lg bg-background/50">
                    <p className="text-sm text-destructive mb-2">Failed to load analysis: {feedbackError}</p>
                    <div className="flex gap-2">
                      <Button onClick={() => fetchFeedback()} variant="outline">Retry</Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-background/50">
                    <p className="text-sm text-muted-foreground">Analysis loading...</p>
                  </div>
                )}
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
                {generatedImages.length
                  ? generatedImages.map((item, idx) => (
                      <Card key={idx} className="p-4 shadow-elegant">
                        <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                          {item.src ? (
                            <img src={item.src} alt={`generated-${idx}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-sm text-muted-foreground p-4">{item.error}</div>
                          )}
                        </div>
                        <p className="text-center font-semibold">{item.view || `Generated View ${idx + 1}`}</p>
                      </Card>
                    ))
                  : null}
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
