import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Wand2, Camera, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Camera,
      title: "Upload Your Look",
      description: "Simply upload a photo of yourself to get started with AI-powered style analysis"
    },
    {
      icon: Sparkles,
      title: "AI Style Analysis",
      description: "Get expert fashion feedback tailored to your chosen style category"
    },
    {
      icon: Wand2,
      title: "Virtual Try-On",
      description: "See yourself in recommended outfits from every angle with AI-generated images"
    },
    {
      icon: Heart,
      title: "Save Your Favorites",
      description: "Build your personal style gallery with your favorite AI-generated looks"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-purple-500/5 to-transparent" />
        
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-6xl md:text-8xl font-bold mb-6 animate-fade-in">
              <span className="gradient-text">Vybe</span>
            </h1>
            
            <p className="text-2xl md:text-3xl text-muted-foreground font-light max-w-2xl mx-auto">
              Transform your style with AI-powered fashion recommendations and virtual try-on
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button
                size="lg"
                onClick={() => navigate('/upload')}
                className="bg-gradient-to-r from-accent to-purple-600 hover:shadow-elegant transition-smooth text-lg px-8 py-6"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/saved')}
                className="text-lg px-8 py-6 transition-smooth"
              >
                View Saved Looks
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                How It Works
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Four simple steps to discover your perfect style
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="p-8 rounded-2xl bg-card border border-border shadow-soft transition-smooth hover:shadow-elegant hover:scale-105 hover:border-accent/50"
                >
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent/20 to-purple-500/20 flex items-center justify-center mb-6">
                    <feature.icon className="w-8 h-8 text-accent" />
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8 p-12 rounded-3xl bg-gradient-to-br from-accent/5 to-purple-500/5 border border-accent/20">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to Transform Your Style?
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands discovering their perfect look with AI-powered fashion recommendations
            </p>
            
            <Button
              size="lg"
              onClick={() => navigate('/upload')}
              className="bg-gradient-to-r from-accent to-purple-600 hover:shadow-elegant transition-smooth text-lg px-8 py-6"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Your Style Journey
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
