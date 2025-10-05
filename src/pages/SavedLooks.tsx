import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Trash2, Download } from "lucide-react";
import { getImageBlob, putImage, deleteImage } from "@/lib/idb";
import { toast } from "sonner";

const SavedLooks = () => {
  const navigate = useNavigate();
  const [savedLooks, setSavedLooks] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('vybe_saved_looks') || '[]');
      // migrate legacy entries that used `images: [{src, view}, ...]` into { front, back }
      const migrated = (raw || []).map((s: any) => {
        if (!s) return s;
        if (Array.isArray(s.images)) {
          const front = s.images[0] || null;
          const back = s.images[1] || s.images[0] || null;
          return {
            ...s,
            front: front ? { src: front.src, view: front.view || 'Front View' } : { src: undefined, view: 'Front View' },
            back: back ? { src: back.src, view: back.view || 'Back View' } : { src: undefined, view: 'Back View' },
          };
        }
        return s;
      });
      // persist migration if needed
      if (JSON.stringify(raw) !== JSON.stringify(migrated)) {
        localStorage.setItem('vybe_saved_looks', JSON.stringify(migrated));
      }
      return migrated;
    } catch {
      return [];
    }
  });

  // track which view (front/back) is active per look id
  const [activeView, setActiveView] = useState<Record<number, 'front' | 'back'>>({});
  const [previews, setPreviews] = useState<Record<number, { front?: string | null; back?: string | null }>>({});

  // Load image blobs from IDB for previews and migrate legacy data URIs whenever savedLooks changes
  useEffect(() => {
    let mounted = true;
    const createdObjectUrls: string[] = [];

    const loadAll = async () => {
      const items = Array.isArray(savedLooks) ? savedLooks : [];
      const newPreviews: Record<number, any> = {};
      let needsPersist = false;

      for (const s of items) {
        if (!s) continue;
        const id = s.id;

        // Migrate legacy direct data-URI sources into IDB
        if (s.front?.src && typeof s.front.src === 'string' && s.front.src.startsWith('data:')) {
          try {
            const key = `look_${id}_front`;
            await putImage(key, s.front.src);
            s.front = { key, view: s.front.view || 'Front View' };
            needsPersist = true;
          } catch (e) {
            console.warn('IDB put failed for front', e);
          }
        }
        if (s.back?.src && typeof s.back.src === 'string' && s.back.src.startsWith('data:')) {
          try {
            const key = `look_${id}_back`;
            await putImage(key, s.back.src);
            s.back = { key, view: s.back.view || 'Back View' };
            needsPersist = true;
          } catch (e) {
            console.warn('IDB put failed for back', e);
          }
        }

        // Load preview object URLs for front/back if keys available
        if (s.front?.key) {
          try {
            const blob = await getImageBlob(s.front.key);
            const url = blob ? URL.createObjectURL(blob) : null;
            if (url) createdObjectUrls.push(url);
            newPreviews[id] = newPreviews[id] || {};
            newPreviews[id].front = url;
          } catch (e) {
            console.warn('Failed to load front blob', e);
            newPreviews[id] = newPreviews[id] || {};
            newPreviews[id].front = null;
          }
        }
        if (s.back?.key) {
          try {
            const blob = await getImageBlob(s.back.key);
            const url = blob ? URL.createObjectURL(blob) : null;
            if (url) createdObjectUrls.push(url);
            newPreviews[id] = newPreviews[id] || {};
            newPreviews[id].back = url;
          } catch (e) {
            console.warn('Failed to load back blob', e);
            newPreviews[id] = newPreviews[id] || {};
            newPreviews[id].back = null;
          }
        }
      }

      if (!mounted) return;
      if (needsPersist) {
        localStorage.setItem('vybe_saved_looks', JSON.stringify(items));
        setSavedLooks(items);
      }
      setPreviews(newPreviews);
    };

    loadAll();
    return () => {
      mounted = false;
      createdObjectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedLooks]);

  const handleDelete = (id: number) => {
    const filtered = savedLooks.filter((s: any) => s.id !== id);
    setSavedLooks(filtered);
    localStorage.setItem('vybe_saved_looks', JSON.stringify(filtered));
    // remove associated images from IndexedDB (best-effort)
    const removed = savedLooks.find((s: any) => s.id === id);
    if (removed) {
      try {
        if (removed.front?.key) deleteImage(removed.front.key);
        if (removed.back?.key) deleteImage(removed.back.key);
      } catch (e) {
        console.warn('Failed to delete images from IDB', e);
      }
    }
    toast.success('Look deleted');
  };

  const handleDownload = async (id: number) => {
    const look = savedLooks.find((s: any) => s.id === id);
    if (!look) {
      toast.error('Look not found');
      return;
    }

    const toDownload: Array<{ url: string; name: string } > = [];
    const createdUrls: string[] = [];

    // helper that creates a downloadable url from various sources
    const ensureUrl = async (kind: 'front' | 'back') => {
      // 1) if previews has an object URL, use it
      const preview = previews[id] ? (kind === 'front' ? previews[id].front : previews[id].back) : undefined;
      if (preview) return preview;

      // 2) if metadata has a direct src (legacy), use it
      const metaSrc = kind === 'front' ? look.front?.src : look.back?.src;
      if (metaSrc) return metaSrc;

      // 3) if metadata has an IDB key, read blob from IDB and create object URL
      const key = kind === 'front' ? look.front?.key : look.back?.key;
      if (key) {
        try {
          const blob = await getImageBlob(key);
          if (blob) {
            const url = URL.createObjectURL(blob);
            createdUrls.push(url);
            return url;
          }
        } catch (e) {
          console.warn('Failed to read image from IDB', e);
        }
      }
      return undefined;
    };

    // attempt to get both urls
    const frontUrl = await ensureUrl('front');
    const backUrl = await ensureUrl('back');

    if (frontUrl) toDownload.push({ url: frontUrl, name: `${look.name.replace(/\s+/g,'_')}_front.png` });
    if (backUrl) toDownload.push({ url: backUrl, name: `${look.name.replace(/\s+/g,'_')}_back.png` });

    if (!toDownload.length) {
      toast.error('No images available to download');
      return;
    }

    // trigger downloads sequentially
    toDownload.forEach((item) => {
      const a = document.createElement('a');
      a.href = item.url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });

    // revoke any object URLs we created
    createdUrls.forEach((u) => URL.revokeObjectURL(u));

    toast.success('Downloading images...');
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
              {savedLooks.map((look: any) => {
                const currentView = activeView[look.id] || 'front';
                const previewFromIdb = previews[look.id] ? (currentView === 'front' ? previews[look.id].front : previews[look.id].back) : undefined;
                const previewSrc = previewFromIdb || (currentView === 'front' ? look.front?.src : look.back?.src);

                return (
                  <Card key={look.id} className="p-6 shadow-elegant hover:shadow-2xl transition-smooth group">
                    <div className="aspect-square bg-muted rounded-xl mb-4 flex items-center justify-center overflow-hidden relative">
                      {previewSrc ? (
                        <img src={previewSrc} alt={`${look.name} - ${currentView}`} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-8xl">�</span>
                      )}

                      {/* Small toggle buttons */}
                      <div className="absolute top-3 right-3 flex gap-2">
                        <Button size="sm" variant="outline" className={currentView === 'front' ? 'bg-accent text-white' : ''} onClick={() => setActiveView(prev => ({ ...prev, [look.id]: 'front' }))}>Front</Button>
                        <Button size="sm" variant="outline" className={currentView === 'back' ? 'bg-accent text-white' : ''} onClick={() => setActiveView(prev => ({ ...prev, [look.id]: 'back' }))}>Back</Button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{look.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {look.outfits} outfit{look.outfits > 1 ? 's' : ''}  {look.date}
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
                );
              })}
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
