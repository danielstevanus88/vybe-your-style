import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

const styleCategories = [
  { id: 'casual', name: 'Casual Chic', emoji: '👕', desc: 'Relaxed everyday style' },
  { id: 'formal', name: 'Formal Elegance', emoji: '🤵', desc: 'Business & events' },
  { id: 'street', name: 'Streetwear', emoji: '🧢', desc: 'Urban fashion' },
  { id: 'vintage', name: 'Vintage', emoji: '🕰️', desc: 'Retro & classic' },
  { id: 'sporty', name: 'Athleisure', emoji: '👟', desc: 'Active & comfortable' },
  { id: 'bohemian', name: 'Bohemian', emoji: '🌺', desc: 'Free-spirited vibes' },
  { id: 'minimalist', name: 'Minimalist', emoji: '⚪', desc: 'Clean & simple' },
  { id: 'luxury', name: 'High Fashion', emoji: '💎', desc: 'Runway-inspired' },
];

const Categories = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (!selectedCategory) {
      toast.error("Please select a style category");
      return;
    }
    localStorage.setItem('selectedCategory', selectedCategory);
    navigate('/results');
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
              Back
            </Button>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Choose Your <span className="gradient-text">Style Vibe</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Select a category for personalized outfit recommendations
            </p>
          </div>

          {/* Categories Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {styleCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`
                  p-6 rounded-xl border-2 text-left transition-smooth
                  ${selectedCategory === category.id
                    ? 'border-accent bg-accent/10 scale-105 shadow-elegant'
                    : 'border-border bg-card hover:border-accent/50 hover:scale-102 shadow-soft'
                  }
                `}
              >
                <div className="text-5xl mb-4">{category.emoji}</div>
                <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                <p className="text-sm text-muted-foreground">{category.desc}</p>
              </button>
            ))}
          </div>

          {/* Continue Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleContinue}
              disabled={!selectedCategory}
              className="bg-gradient-to-r from-accent to-purple-600 hover:shadow-elegant transition-smooth px-8 py-6 text-lg"
            >
              Get My Recommendations
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;
