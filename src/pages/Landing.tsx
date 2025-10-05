import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Upload, Search, Shirt, Heart } from "lucide-react";
import heroImage from "@/assets/hero-fashion.jpg";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Upload,
      title: "Upload Your Look",
      description: "Share a photo of your outfit for instant AI analysis"
    },
    {
      icon: Search,
      title: "Select Your Style",
      description: "Choose from various aesthetics to match your vibe"
    },
    {
      icon: Shirt,
      title: "Get Recommendations",
      description: "Receive personalized outfit suggestions with shopping links"
    },
    {
      icon: Heart,
      title: "Virtual Try-On",
      description: "See yourself in new outfits from 4 different angles"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* subtle gradient overlay behind the hero image */}
        <div className="absolute inset-0 gradient-hero opacity-40 pointer-events-none"></div>
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Fashion hero"
            className="w-full h-full object-cover opacity-80 filter blur-sm"
          />
        </div>

  <div className="relative container mx-auto px-4 py-24 md:py-32 z-40">
          {/* pink translucent jumbotron background behind the main hero content */}
          <div className="absolute inset-x-6 top-12 md:top-20 -z-10 rounded-3xl bg-pink-500/8" style={{ height: 'calc(100% - 3rem)' }} />

          <div className="max-w-3xl mx-auto text-center space-y-8 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-50/40 backdrop-blur-sm border border-pink-200/30">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
              <span className="text-sm font-medium text-primary-foreground">AI-Powered Fashion Assistant</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-primary-foreground tracking-tight">
              Discover Your Perfect Style with Vybe
            </h1>

            <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
              Upload your outfit, get instant AI feedback, and see yourself in new looks with virtual try-on technology
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                variant="default"
                size="lg"
                onClick={() => navigate('/upload')}
                className="bg-background/90 text-foreground hover:bg-background shadow-xl"
              >
                Start Your Style Journey
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/saved')}
                className="border-primary-foreground/30 bg-background/10 backdrop-blur-sm text-primary-foreground hover:bg-background/20"
              >
                <Heart className="w-4 h-4" /> View Saved Looks
              </Button>
            </div>
          </div>
        </div>
        {/* pink foreground layer in front of the hero (transparent) */}
        <div aria-hidden className="absolute inset-0 pointer-events-none z-30" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.48) 0%, rgba(168,85,247,0.42) 40%, rgba(236,72,153,0.48) 100%)' }} />
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How Vybe Works</h2>
            <p className="text-muted-foreground text-lg">
              Four simple steps to elevate your style game
            </p>
          </div>
            <div className="rounded-2xl p-6 bg-pink-50/30 border border-pink-200/20">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((feature, index) => (
                  <Card key={index} className="p-6 hover:shadow-lg transition-smooth border-2 hover:border-pink-300/50">
                    <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-4 shadow-sm">
                      <feature.icon className="w-6 h-6 text-pink-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </Card>
                ))}
              </div>
            </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 gradient-hero">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 drop-shadow-lg">
            Ready to Transform Your Wardrobe?
          </h2>
          <p className="text-xl text-foreground/85 mb-8 drop-shadow-sm">
            Join thousands of style-conscious users discovering their perfect look
          </p>
          <Button
            variant="default"
            size="lg"
            onClick={() => navigate('/upload')}
            className="bg-background/90 text-foreground hover:bg-background shadow-2xl"
          >
            Get Started Now
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
