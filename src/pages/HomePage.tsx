import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Send, Trash2, Feather } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Toaster, toast } from '@/components/ui/sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import type { Thought } from '@shared/types';
export function HomePage() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [newThought, setNewThought] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fetchThoughts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api<Thought[]>('/api/thoughts');
      setThoughts(data);
    } catch (error) {
      toast.error('Gagal memuat keluh kesah.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchThoughts();
  }, [fetchThoughts]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThought.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const createdThought = await api<Thought>('/api/thoughts', {
        method: 'POST',
        body: JSON.stringify({ text: newThought }),
      });
      setThoughts(prev => [createdThought, ...prev]);
      setNewThought('');
      toast.success('Keluh kesah berhasil disimpan!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan.';
      toast.error(`Gagal menyimpan: ${errorMessage}`);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDelete = async (id: string) => {
    // Optimistic UI update
    const originalThoughts = thoughts;
    setThoughts(prev => prev.filter(t => t.id !== id));
    try {
      await api(`/api/thoughts/${id}`, { method: 'DELETE' });
      toast.success('Keluh kesah berhasil dihapus.');
    } catch (error) {
      // Revert on failure
      setThoughts(originalThoughts);
      toast.error('Gagal menghapus keluh kesah.');
      console.error(error);
    }
  };
  return (
    <>
      <div className="min-h-screen bg-background dark:bg-gradient-subtle font-sans antialiased">
        <ThemeToggle className="fixed top-4 right-4" />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-16 md:py-24">
            <header className="text-center space-y-4 animate-fade-in">
              <div className="inline-block p-3 bg-primary/10 rounded-full">
                <Feather className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
                Keluh Kesahmu
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Tuliskan apa yang ada di pikiranmu hari ini. Lepaskan dan biarkan mengalir.
              </p>
            </header>
            <section className="mt-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                  value={newThought}
                  onChange={(e) => setNewThought(e.target.value)}
                  placeholder="Tulis kata-kata hari ini..."
                  className="min-h-[120px] text-base p-4 focus-visible:ring-2 focus-visible:ring-primary/50"
                  maxLength={500}
                  disabled={isSubmitting}
                />
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {newThought.length} / 500
                  </p>
                  <Button type="submit" disabled={!newThought.trim() || isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Simpan
                  </Button>
                </div>
              </form>
            </section>
            <section className="mt-16">
              <div className="space-y-6">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="p-6">
                      <Skeleton className="h-4 w-3/4 mb-4" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="flex justify-end mt-4">
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </Card>
                  ))
                ) : thoughts.length > 0 ? (
                  <AnimatePresence>
                    {thoughts.map((thought) => (
                      <motion.div
                        key={thought.id}
                        layout
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <Card className="overflow-hidden group transition-all duration-200 hover:shadow-lg hover:border-primary/20">
                          <CardContent className="p-6">
                            <p className="text-foreground text-pretty leading-relaxed">
                              {thought.text}
                            </p>
                          </CardContent>
                          <CardFooter className="bg-muted/50 px-6 py-3 flex justify-between items-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-sm text-muted-foreground cursor-default">
                                    {formatDistanceToNow(new Date(thought.createdAt), { addSuffix: true, locale: id })}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{format(new Date(thought.createdAt), "eeee, d MMMM yyyy 'pukul' HH:mm", { locale: id })}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDelete(thought.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : (
                  <div className="text-center py-16 border-2 border-dashed rounded-lg animate-fade-in">
                    <Feather className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium text-foreground">Belum ada keluh kesah</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Jadilah yang pertama untuk menuliskan sesuatu.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
        <footer className="text-center py-8 text-sm text-muted-foreground">
          <p>made with vibe code atsari</p>
        </footer>
      </div>
      <Toaster richColors closeButton />
    </>
  );
}
// Shadcn UI Tooltip components are needed for the date display
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"