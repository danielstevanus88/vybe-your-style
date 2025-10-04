import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";

const Upload = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      localStorage.setItem('uploadedImage', result);
      toast.success("Image uploaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleContinue = () => {
    if (!uploadedImage) {
      toast.error("Please upload an image first");
      return;
    }
    navigate('/categories');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              <span className="gradient-text">Vybe</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Transform your style with AI-powered fashion recommendations
            </p>
          </div>

          {/* Upload Area */}
          <div className="space-y-8">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className={`
                relative border-2 border-dashed rounded-2xl p-12 transition-smooth
                ${isDragging ? 'border-accent bg-accent/5 scale-105' : 'border-border hover:border-accent/50'}
                ${uploadedImage ? 'bg-card' : 'bg-muted/20'}
              `}
            >
              {uploadedImage ? (
                <div className="space-y-6">
                  <img 
                    src={uploadedImage} 
                    alt="Uploaded" 
                    className="w-full max-h-96 object-contain rounded-xl shadow-elegant"
                  />
                  <div className="flex gap-4 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setUploadedImage(null)}
                      className="transition-smooth"
                    >
                      Change Image
                    </Button>
                    <Button
                      onClick={handleContinue}
                      className="bg-gradient-to-r from-accent to-purple-600 hover:shadow-elegant transition-smooth"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Continue to Style Selection
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center cursor-pointer">
                  <UploadIcon className={`w-16 h-16 mb-4 transition-smooth ${isDragging ? 'text-accent scale-110' : 'text-muted-foreground'}`} />
                  <p className="text-xl font-semibold mb-2">Drop your image here</p>
                  <p className="text-muted-foreground mb-6">or click to browse</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <Button variant="outline" type="button" className="transition-smooth hover:border-accent">
                    Choose File
                  </Button>
                </label>
              )}
            </div>

            {/* Info Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: "🎨", title: "Style Analysis", desc: "AI analyzes your outfit" },
                { icon: "👗", title: "Smart Recommendations", desc: "Get personalized outfit ideas" },
                { icon: "✨", title: "Virtual Try-On", desc: "See yourself in new looks" }
              ].map((item, idx) => (
                <div key={idx} className="p-6 rounded-xl bg-card border border-border shadow-soft transition-smooth hover:shadow-elegant hover:scale-105">
                  <div className="text-4xl mb-3">{item.icon}</div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
