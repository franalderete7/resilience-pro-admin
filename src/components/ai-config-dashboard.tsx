'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetchActivePrompt, saveNewPromptVersion } from '@/app/actions/prompt-actions'
import { 
  AlertTriangle, 
  Save, 
  History, 
  Zap,
  ArrowRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  LayoutTemplate,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function AiConfigDashboard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('rules')
  const [expanded, setExpanded] = useState(false)
  
  // Form State
  const [label, setLabel] = useState('')
  const [methodology, setMethodology] = useState('')
  const [categories, setCategories] = useState('')
  const [rules, setRules] = useState('')
  const [structure, setStructure] = useState('')

  // Initial State for Dirty Checking
  const [initialState, setInitialState] = useState({
    methodology: '',
    categories: '',
    rules: '',
    structure: ''
  })
  
  useEffect(() => {
    loadData()
  }, [])

  const hasUnsavedChanges = 
    methodology !== initialState.methodology ||
    categories !== initialState.categories ||
    rules !== initialState.rules ||
    structure !== initialState.structure

  async function loadData() {
    setLoading(true)
    try {
      const data = await fetchActivePrompt()
      if (data) {
        const loaded = {
          methodology: data.methodology || '',
          categories: data.categories || '',
          rules: data.rules || '',
          structure: data.structure || ''
        }
        
        setMethodology(loaded.methodology)
        setCategories(loaded.categories)
        setRules(loaded.rules)
        setStructure(loaded.structure)
        setInitialState(loaded)
        
        setLabel(`v${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.${new Date().getHours()}`)
      }
    } catch (err) {
      console.error('Failed to load prompts', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveNewPromptVersion({
        label,
        methodology,
        categories,
        rules,
        structure,
        isActive: true
      })
      
      setInitialState({ methodology, categories, rules, structure })
      alert('¡Sistema de prompts actualizado correctamente!')
    } catch (err) {
      console.error(err)
      alert('Error al guardar el prompt.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-zinc-400 gap-3 animate-pulse">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span>Cargando configuración del sistema...</span>
      </div>
    )
  }

  return (
    <div className="grid gap-6 transition-all duration-300 grid-cols-1">
      
      {/* --- MAIN EDITOR --- */}
      <div className="flex flex-col gap-4 w-full">
        
        {/* Header Bar */}
        <div className={cn(
          "flex items-center justify-between p-4 rounded-xl border backdrop-blur-sm sticky top-0 z-20 transition-all",
          hasUnsavedChanges 
            ? "bg-amber-950/20 border-amber-500/30 shadow-lg shadow-amber-900/10" 
            : "bg-zinc-900/50 border-zinc-800"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", hasUnsavedChanges ? "bg-amber-500/10" : "bg-indigo-500/10")}>
              {hasUnsavedChanges ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : <Zap className="h-5 w-5 text-indigo-400" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Prompt Studio</h2>
              <p className="text-xs text-zinc-400">
                {hasUnsavedChanges ? <span className="text-amber-400 font-medium">⚠️ Tienes cambios sin guardar</span> : "Configuración del cerebro de la IA"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">🏷️</span>
              <Input 
                value={label} 
                onChange={(e) => setLabel(e.target.value)} 
                placeholder="Versión (ej: v1.0)" 
                className="w-40 bg-zinc-950 border-zinc-800 text-zinc-300 pl-8 h-9 text-sm focus-visible:ring-indigo-500/50"
              />
            </div>
            
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              className={cn(
                "h-9 px-4 shadow-lg transition-all hover:scale-105 active:scale-95 border",
                hasUnsavedChanges 
                  ? "bg-amber-600 hover:bg-amber-500 text-white border-amber-500 shadow-amber-900/20 animate-pulse" 
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
              )}
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? 'Guardando...' : hasUnsavedChanges ? 'Guardar Cambios' : 'Guardado'}
            </Button>
            
            {/* Expanded button removed as it's full width now by default */}
          </div>
        </div>

        {/* Editor Area */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-180px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
            <div className="border-b border-zinc-800 px-2 bg-zinc-950/50">
              <TabsList className="bg-transparent h-12 gap-2">
                <TabsTrigger 
                  value="rules" 
                  className="data-[state=active]:bg-zinc-800 data-[state=active]:text-indigo-400 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Reglas
                </TabsTrigger>
                <TabsTrigger 
                  value="methodology" 
                  className="data-[state=active]:bg-zinc-800 data-[state=active]:text-blue-400 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <History className="h-4 w-4 mr-2" />
                  Metodología
                </TabsTrigger>
                <TabsTrigger 
                  value="categories" 
                  className="data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-400 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Categorías
                </TabsTrigger>
                <TabsTrigger 
                  value="structure" 
                  className="data-[state=active]:bg-zinc-800 data-[state=active]:text-amber-400 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <LayoutTemplate className="h-4 w-4 mr-2" />
                  Estructura JSON
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Content Areas */}
            <div className="flex-1 overflow-hidden relative group">
              <TabsContent value="rules" className="h-full mt-0 p-0">
                <Textarea 
                  value={rules} 
                  onChange={(e) => setRules(e.target.value)} 
                  className="h-full resize-none rounded-none border-0 bg-zinc-950/50 p-6 font-mono text-sm leading-relaxed focus-visible:ring-0 text-zinc-300 selection:bg-indigo-500/30" 
                  placeholder="Define aquí las reglas de series, repeticiones y lógica..."
                />
              </TabsContent>
              
              <TabsContent value="methodology" className="h-full mt-0 p-0">
                <Textarea 
                  value={methodology} 
                  onChange={(e) => setMethodology(e.target.value)} 
                  className="h-full resize-none rounded-none border-0 bg-zinc-950/50 p-6 font-mono text-sm leading-relaxed focus-visible:ring-0 text-zinc-300 selection:bg-blue-500/30" 
                  placeholder="Define la estructura de bloques y filosofía..."
                />
              </TabsContent>
              
              <TabsContent value="categories" className="h-full mt-0 p-0">
                <Textarea 
                  value={categories} 
                  onChange={(e) => setCategories(e.target.value)} 
                  className="h-full resize-none rounded-none border-0 bg-zinc-950/50 p-6 font-mono text-sm leading-relaxed focus-visible:ring-0 text-zinc-300 selection:bg-emerald-500/30" 
                  placeholder="Define qué significa cada categoría de ejercicio..."
                />
              </TabsContent>

              <TabsContent value="structure" className="h-full mt-0 p-0 relative">
                 <div className="absolute top-0 left-0 right-0 bg-amber-950/30 border-b border-amber-900/50 p-2 flex items-center justify-center gap-2 z-10 backdrop-blur-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-amber-200 text-xs font-medium">
                      ⚠️ Zona Peligrosa: Modificar la estructura JSON incorrectamente puede romper la generación de programas.
                    </span>
                 </div>
                <Textarea 
                  value={structure} 
                  onChange={(e) => setStructure(e.target.value)} 
                  className="h-full resize-none rounded-none border-0 bg-zinc-950/50 p-6 pt-12 font-mono text-sm leading-relaxed focus-visible:ring-0 text-zinc-300 selection:bg-amber-500/30" 
                  placeholder="Define la estructura JSON de salida..."
                />
              </TabsContent>
            </div>
            
            <div className="bg-zinc-900 border-t border-zinc-800 p-2 text-xs text-zinc-500 flex justify-between items-center">
               <div className="flex gap-4">
                 <span>Líneas: {
                   activeTab === 'rules' ? rules.split('\n').length : 
                   activeTab === 'methodology' ? methodology.split('\n').length : 
                   activeTab === 'categories' ? categories.split('\n').length :
                   structure.split('\n').length
                 }</span>
                 {hasUnsavedChanges && <span className="text-amber-500 font-bold animate-pulse">• Editado</span>}
               </div>
               <span className="font-mono">{activeTab.toUpperCase()}</span>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
