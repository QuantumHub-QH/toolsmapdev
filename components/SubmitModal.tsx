'use client';

import React, { useState } from 'react';
import { X, Send, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface SubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubmitModal: React.FC<SubmitModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'models',
    description: '',
    assetIdOrUrl: '',
    creatorName: '',
    contact: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit asset');
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
        setFormData({
          title: '',
          category: 'models',
          description: '',
          assetIdOrUrl: '',
          creatorName: '',
          contact: '',
        });
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Error communicating with backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-700 bg-surface p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <h3 className="text-base font-bold text-white uppercase">Submit Free Asset</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-border p-1.5 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-12 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
            <h4 className="text-lg font-bold text-white">Submission Received!</h4>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Your asset has been sent to our backend queue for review and will be added to the live catalog.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-zinc-300 mb-1">Asset Name / Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Cyberpunk Modular Street Bench"
                className="w-full rounded-xl border border-border bg-black px-3.5 py-2 text-xs text-white focus:border-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-xl border border-border bg-black px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                >
                  <option value="models">3D Model / Prop</option>
                  <option value="pbr">PBR Texture</option>
                  <option value="scripts">Luau Script</option>
                  <option value="lighting">Lighting Preset</option>
                  <option value="skyboxes">Skybox</option>
                  <option value="sfx">Audio / SFX</option>
                  <option value="ui">Developer UI</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Creator / Author *</label>
                <input
                  type="text"
                  required
                  value={formData.creatorName}
                  onChange={(e) => setFormData({ ...formData, creatorName: e.target.value })}
                  placeholder="Your Dev Name"
                  className="w-full rounded-xl border border-border bg-black px-3.5 py-2 text-xs text-white focus:border-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-300 mb-1">Roblox Asset ID or Download URL</label>
              <input
                type="text"
                value={formData.assetIdOrUrl}
                onChange={(e) => setFormData({ ...formData, assetIdOrUrl: e.target.value })}
                placeholder="e.g. 13894729104 or https://github.com/..."
                className="w-full rounded-xl border border-border bg-black px-3.5 py-2 text-xs text-white focus:border-white focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-300 mb-1">Description & Features</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Polycount, textures included, installation notes..."
                className="w-full rounded-xl border border-border bg-black px-3.5 py-2 text-xs text-white focus:border-white focus:outline-none resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-white py-2.5 text-xs font-bold text-black hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span>Submitting to backend...</span>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Submit Free Asset</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
