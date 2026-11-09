import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Loader2, 
  Save, 
  Plus, 
  Trash2, 
  Eye, 
  BrainCircuit, 
  ShieldCheck, 
  Clock, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Project, SceneAnalysis, CharacterProfile, SceneSegment } from '../types';
import { analyzeScene, updateSceneAnalysis } from '../services/api';

interface SceneAnalysisPanelProps {
  project: Project;
  onProjectUpdated: (updated: Project) => void;
}

export const SceneAnalysisPanel: React.FC<SceneAnalysisPanelProps> = ({
  project,
  onProjectUpdated,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [useMock, setUseMock] = useState(true); // default to true to protect user API credits
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Local editable copy of scene analysis
  const [analysis, setAnalysis] = useState<SceneAnalysis | null>(project.scene_analysis || null);

  useEffect(() => {
    setAnalysis(project.scene_analysis || null);
    setIsDirty(false);
  }, [project.scene_analysis]);

  const handleRunAnalysis = async () => {
    try {
      setError(null);
      setSuccessMessage(null);
      setIsAnalyzing(true);
      const updated = await analyzeScene(project.id, useMock);
      onProjectUpdated(updated);
      setSuccessMessage(
        useMock 
          ? 'Scene analyzed successfully in Mock Mode (0 API credits used)!' 
          : 'Gemini Vision AI successfully analyzed the cutscene!'
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scene analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!analysis) return;
    try {
      setError(null);
      setSuccessMessage(null);
      setIsSaving(true);
      const updated = await updateSceneAnalysis(project.id, analysis);
      onProjectUpdated(updated);
      setIsDirty(false);
      setSuccessMessage('Scene descriptions and character profiles saved to database!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // Character editing helpers
  const handleUpdateCharacter = (index: number, field: keyof CharacterProfile, value: string) => {
    if (!analysis) return;
    const newChars = [...analysis.characters];
    newChars[index] = { ...newChars[index], [field]: value };
    setAnalysis({ ...analysis, characters: newChars });
    setIsDirty(true);
  };

  const handleAddCharacter = () => {
    if (!analysis) return;
    const newChar: CharacterProfile = {
      id: `char_${analysis.characters.length + 1}`,
      name: 'New Character',
      observed_appearance: 'Visual clothing and features seen in video',
      observed_actions: 'Visible movements or gestures',
      inferred_role: 'Supporting character or bystander',
      confidence: 'medium',
      confidence_rationale: 'Added by user'
    };
    setAnalysis({ ...analysis, characters: [...analysis.characters, newChar] });
    setIsDirty(true);
  };

  const handleDeleteCharacter = (index: number) => {
    if (!analysis) return;
    const newChars = analysis.characters.filter((_, i) => i !== index);
    setAnalysis({ ...analysis, characters: newChars });
    setIsDirty(true);
  };

  // Scene segment editing helpers
  const handleUpdateScene = (index: number, field: keyof SceneSegment, value: any) => {
    if (!analysis) return;
    const newScenes = [...analysis.scenes];
    newScenes[index] = { ...newScenes[index], [field]: value };
    setAnalysis({ ...analysis, scenes: newScenes });
    setIsDirty(true);
  };

  const handleAddScene = () => {
    if (!analysis) return;
    const lastScene = analysis.scenes[analysis.scenes.length - 1];
    const newStart = lastScene ? lastScene.timestamp_end : 0.0;
    const newEnd = Math.min((project.duration || 10.0), newStart + 3.0);

    const newSegment: SceneSegment = {
      id: `scene_${analysis.scenes.length + 1}`,
      timestamp_start: newStart,
      timestamp_end: newEnd,
      description: 'New scene segment description',
      directly_observed_details: 'Specific actions visible in this timeframe',
      inferred_context: 'Inferred narrative context',
      characters_present: []
    };
    setAnalysis({ ...analysis, scenes: [...analysis.scenes, newSegment] });
    setIsDirty(true);
  };

  const handleDeleteScene = (index: number) => {
    if (!analysis) return;
    const newScenes = analysis.scenes.filter((_, i) => i !== index);
    setAnalysis({ ...analysis, scenes: newScenes });
    setIsDirty(true);
  };

  return (
    <div className="space-y-6">
      {/* Control Banner */}
      <div className="p-5 rounded-2xl bg-studio-800 border border-studio-700 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>AI Scene Understanding</span>
                {analysis?.is_mock && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Mock Mode (Credits Saved)
                  </span>
                )}
                {analysis && !analysis.is_mock && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Gemini 2.5 Flash
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Identifies visible characters, environment setting, and timeline actions with direct observations vs. inferences.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none px-3 py-1.5 rounded-lg bg-studio-900 border border-studio-700">
            <input
              type="checkbox"
              checked={useMock}
              onChange={(e) => setUseMock(e.target.checked)}
              className="rounded bg-studio-800 border-studio-600 text-indigo-600 focus:ring-0"
            />
            <span className="font-medium">Mock Mode (No credits)</span>
          </label>

          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isAnalyzing ? 'Analyzing...' : analysis ? 'Re-analyze' : 'Run Scene Analysis'}</span>
          </button>

          {isDirty && (
            <button
              onClick={handleSaveEdits}
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition disabled:opacity-50 animate-pulse"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Changes</span>
            </button>
          )}
        </div>
      </div>

      {/* Error or Success feedback */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Observation vs Inference Methodology Guide */}
      <div className="p-4 rounded-xl bg-studio-800/80 border border-studio-700/80 text-xs text-slate-300 flex items-start gap-3">
        <HelpCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-200">How AI Observations are Distinguished:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="p-2 rounded bg-emerald-950/20 border border-emerald-500/30 text-emerald-300">
              <span className="font-bold flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Direct Observations:
              </span>
              Strictly what is visibly present in the video frames (clothing, physical actions, physical setting).
            </div>
            <div className="p-2 rounded bg-purple-950/20 border border-purple-500/30 text-purple-300">
              <span className="font-bold flex items-center gap-1">
                <BrainCircuit className="w-3.5 h-3.5" /> Inferred Roles & Context:
              </span>
              Educated hypotheses regarding character motivations and plot. You can freely edit them!
            </div>
          </div>
        </div>
      </div>

      {!analysis && !isAnalyzing && (
        <div className="py-16 text-center border-2 border-dashed border-studio-700/80 rounded-2xl bg-studio-800/40 p-8">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-3">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-white">No Scene Analysis Yet</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
            Click <strong>"Run Scene Analysis"</strong> above to have Gemini inspect the {project.frames_count} sampled video frames.
          </p>
          <button
            onClick={handleRunAnalysis}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/30 inline-flex items-center gap-2 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Analyze Now</span>
          </button>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          {/* Section 1: Scene Setting & Overview */}
          <div className="p-5 rounded-2xl bg-studio-800 border border-studio-700 space-y-4 shadow-lg">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span>Scene Overview & Setting</span>
            </h4>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Narrative Summary
              </label>
              <textarea
                rows={2}
                value={analysis.summary}
                onChange={(e) => {
                  setAnalysis({ ...analysis, summary: e.target.value });
                  setIsDirty(true);
                }}
                className="w-full bg-studio-900 border border-studio-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Environment / Location
                </label>
                <input
                  type="text"
                  value={analysis.setting.environment}
                  onChange={(e) => {
                    setAnalysis({
                      ...analysis,
                      setting: { ...analysis.setting, environment: e.target.value }
                    });
                    setIsDirty(true);
                  }}
                  className="w-full bg-studio-900 border border-studio-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Time of Day / Lighting
                </label>
                <input
                  type="text"
                  value={analysis.setting.time_of_day}
                  onChange={(e) => {
                    setAnalysis({
                      ...analysis,
                      setting: { ...analysis.setting, time_of_day: e.target.value }
                    });
                    setIsDirty(true);
                  }}
                  className="w-full bg-studio-900 border border-studio-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Atmospheric Mood
                </label>
                <input
                  type="text"
                  value={analysis.setting.atmosphere}
                  onChange={(e) => {
                    setAnalysis({
                      ...analysis,
                      setting: { ...analysis.setting, atmosphere: e.target.value }
                    });
                    setIsDirty(true);
                  }}
                  className="w-full bg-studio-900 border border-studio-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Character Identification & Profiles */}
          <div className="p-5 rounded-2xl bg-studio-800 border border-studio-700 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>Identified Characters ({analysis.characters.length})</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Character voice casting in Phase 4 will link directly to these profiles.
                </p>
              </div>
              <button
                onClick={handleAddCharacter}
                className="px-3 py-1.5 rounded-lg bg-studio-700 hover:bg-studio-600 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Character</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.characters.map((char, idx) => (
                <div
                  key={char.id || idx}
                  className="rounded-xl bg-studio-900 border border-studio-700 p-4 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={char.name}
                      onChange={(e) => handleUpdateCharacter(idx, 'name', e.target.value)}
                      className="font-bold text-sm text-white bg-transparent border-b border-studio-700 focus:border-indigo-500 focus:outline-none pb-0.5 flex-1"
                      placeholder="Character Name"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={char.confidence}
                        onChange={(e) => handleUpdateCharacter(idx, 'confidence', e.target.value)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border bg-studio-800 ${
                          char.confidence === 'high' 
                            ? 'text-emerald-400 border-emerald-500/30' 
                            : char.confidence === 'medium'
                            ? 'text-amber-400 border-amber-500/30'
                            : 'text-purple-400 border-purple-500/30'
                        }`}
                      >
                        <option value="high">High Conf.</option>
                        <option value="medium">Medium Conf.</option>
                        <option value="low">Speculative</option>
                      </select>
                      <button
                        onClick={() => handleDeleteCharacter(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Delete character"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Direct Observation: Appearance */}
                  <div className="p-2.5 rounded-lg bg-emerald-950/15 border border-emerald-500/20 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Observed Appearance (Physical)
                    </span>
                    <textarea
                      rows={2}
                      value={char.observed_appearance}
                      onChange={(e) => handleUpdateCharacter(idx, 'observed_appearance', e.target.value)}
                      className="w-full bg-studio-900/80 border border-emerald-500/20 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Direct Observation: Actions */}
                  <div className="p-2.5 rounded-lg bg-emerald-950/15 border border-emerald-500/20 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Observed Actions (In Cutscene)
                    </span>
                    <textarea
                      rows={2}
                      value={char.observed_actions}
                      onChange={(e) => handleUpdateCharacter(idx, 'observed_actions', e.target.value)}
                      className="w-full bg-studio-900/80 border border-emerald-500/20 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Inferred Role */}
                  <div className="p-2.5 rounded-lg bg-purple-950/15 border border-purple-500/20 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1">
                      <BrainCircuit className="w-3 h-3" /> Inferred Role / Intent
                    </span>
                    <textarea
                      rows={2}
                      value={char.inferred_role}
                      onChange={(e) => handleUpdateCharacter(idx, 'inferred_role', e.target.value)}
                      className="w-full bg-studio-900/80 border border-purple-500/20 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Scene Segment Breakdown */}
          <div className="p-5 rounded-2xl bg-studio-800 border border-studio-700 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Timeline Breakdown ({analysis.scenes.length} Segments)</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Approximate timestamps matched to cutscene video.
                </p>
              </div>
              <button
                onClick={handleAddScene}
                className="px-3 py-1.5 rounded-lg bg-studio-700 hover:bg-studio-600 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Segment</span>
              </button>
            </div>

            <div className="space-y-3">
              {analysis.scenes.map((scene, idx) => (
                <div
                  key={scene.id || idx}
                  className="rounded-xl bg-studio-900 border border-studio-700 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-studio-750 text-indigo-400 border border-studio-700">
                        Segment #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1 font-mono text-slate-300 text-xs">
                        <input
                          type="number"
                          step="0.1"
                          value={scene.timestamp_start}
                          onChange={(e) => handleUpdateScene(idx, 'timestamp_start', parseFloat(e.target.value) || 0)}
                          className="w-14 bg-studio-800 border border-studio-700 rounded px-1.5 py-0.5 text-center text-white"
                        />
                        <span>s →</span>
                        <input
                          type="number"
                          step="0.1"
                          value={scene.timestamp_end}
                          onChange={(e) => handleUpdateScene(idx, 'timestamp_end', parseFloat(e.target.value) || 0)}
                          className="w-14 bg-studio-800 border border-studio-700 rounded px-1.5 py-0.5 text-center text-white"
                        />
                        <span>s</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteScene(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Delete segment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Event Summary
                    </label>
                    <input
                      type="text"
                      value={scene.description}
                      onChange={(e) => handleUpdateScene(idx, 'description', e.target.value)}
                      className="w-full bg-studio-800 border border-studio-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-2.5 rounded bg-emerald-950/15 border border-emerald-500/20 text-xs">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">
                        Directly Observed Details
                      </span>
                      <textarea
                        rows={2}
                        value={scene.directly_observed_details}
                        onChange={(e) => handleUpdateScene(idx, 'directly_observed_details', e.target.value)}
                        className="w-full bg-studio-900 border border-emerald-500/20 rounded p-1.5 text-xs text-slate-200"
                      />
                    </div>

                    <div className="p-2.5 rounded bg-purple-950/15 border border-purple-500/20 text-xs">
                      <span className="text-[10px] uppercase font-bold text-purple-400 block mb-1">
                        Inferred Context
                      </span>
                      <textarea
                        rows={2}
                        value={scene.inferred_context}
                        onChange={(e) => handleUpdateScene(idx, 'inferred_context', e.target.value)}
                        className="w-full bg-studio-900 border border-purple-500/20 rounded p-1.5 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confidence Notes Footer */}
          <div className="p-4 rounded-xl bg-studio-800/60 border border-studio-700/60 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Methodology & Confidence Notes: </span>
            {analysis.confidence_notes}
          </div>
        </div>
      )}
    </div>
  );
};
