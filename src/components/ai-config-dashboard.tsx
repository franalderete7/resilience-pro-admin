'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetchActivePrompt, saveNewPromptVersion, analyzePromptModules } from '@/app/actions/prompt-actions'
import { AuditResult } from '@/lib/prompts/prompt-auditor'
import { 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  Play, 
  History, 
  Zap,
  ArrowRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  Bug,
  LayoutTemplate,
  AlertOctagon,
  Quote
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function AiConfigDashboard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
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
  
  // Analysis State
  const [auditData, setAuditData] = useState<AuditResult | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  // Check for unsaved changes
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
      
      // Update initial state to current to clear dirty flag
      setInitialState({ methodology, categories, rules, structure })
      alert('¡Sistema de prompts actualizado correctamente!')
    } catch (err) {
      console.error(err)
      alert('Error al guardar el prompt.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    setAuditData(null)
    try {
      const result = await analyzePromptModules(methodology, rules, categories)
      setAuditData(result)
    } catch (err) {
      console.error(err)
      alert('Error al analizar el prompt.')
    } finally {
      setAnalyzing(false)
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
    <div className={cn(
      "grid gap-6 transition-all duration-300", 
      expanded ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-12"
    )}>
      
      {/* --- LEFT COLUMN: EDITOR --- */}
      <div className={cn(
        "flex flex-col gap-4 transition-all duration-300",
        expanded ? "w-full" : "lg:col-span-8"
      )}>
        
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
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setExpanded(!expanded)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800 hidden lg:flex"
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-220px)]">
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

      {/* --- RIGHT COLUMN: AUDITOR --- */}
      {!expanded && (
        <div className="lg:col-span-4 flex flex-col gap-4 h-[calc(100vh-100px)] overflow-hidden">
          
          {/* Analysis Card */}
          <Card className="bg-zinc-900 border-zinc-800 flex flex-col h-full shadow-xl overflow-hidden">
            <CardHeader className="border-b border-zinc-800 bg-zinc-950 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Bug className="h-4 w-4 text-rose-400" />
                  Auditor de IA
                </CardTitle>
                {auditData && (
                  <span className={cn(
                    "text-xs font-bold px-3 py-1 rounded-full border",
                    auditData.score >= 90 ? "bg-emerald-950/50 border-emerald-900 text-emerald-400" :
                    auditData.score >= 70 ? "bg-amber-950/50 border-amber-900 text-amber-400" :
                    "bg-rose-950/50 border-rose-900 text-rose-400"
                  )}>
                    {auditData.score}/100
                  </span>
                )}
              </div>
              <CardDescription className="mt-1">
                Análisis técnico de conflictos y errores.
              </CardDescription>
            </CardHeader>

            <div className="flex-1 overflow-y-auto p-0 bg-zinc-950/30 scrollbar-thin scrollbar-thumb-zinc-800">
              {!auditData && !analyzing && (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-60">
                  <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4 border border-zinc-700">
                    <Play className="h-8 w-8 text-zinc-500 ml-1" />
                  </div>
                  <h3 className="text-zinc-300 font-medium mb-2">Listo para auditar</h3>
                  <p className="text-zinc-500 text-sm max-w-[200px]">
                    El auditor buscará errores específicos y contradicciones en tus reglas.
                  </p>
                </div>
              )}

              {analyzing && (
                <div className="h-full flex flex-col items-center justify-center p-8 space-y-6">
                  <div className="relative">
                    <div className="h-16 w-16 border-4 border-zinc-800 rounded-full"></div>
                    <div className="h-16 w-16 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-indigo-300 font-medium animate-pulse">Analizando lógica...</p>
                    <p className="text-zinc-500 text-xs">Escaneando {rules.length + methodology.length} caracteres</p>
                  </div>
                </div>
              )}

              {auditData && !analyzing && (
                <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Summary Box */}
                  <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                      <LayoutTemplate className="h-3 w-3" /> Resumen
                    </h4>
                    <p className="text-zinc-300 text-sm leading-relaxed">{auditData.summary}</p>
                  </div>

                  {/* Issues List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
                        Hallazgos Específicos ({auditData.issues.length})
                      </h4>
                    </div>

                    {auditData.issues.length === 0 ? (
                      <div className="bg-emerald-950/10 border border-emerald-900/30 rounded-lg p-6 flex flex-col items-center text-center gap-3">
                        <div className="bg-emerald-500/10 p-3 rounded-full">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-emerald-300 font-medium">Sistema Saludable</p>
                          <p className="text-emerald-400/60 text-xs mt-1">No se detectaron contradicciones lógicas graves.</p>
                        </div>
                      </div>
                    ) : (
                      auditData.issues.map((issue, i) => (
                        <div key={i} className={cn(
                          "group rounded-lg border p-4 transition-all hover:bg-zinc-900 shadow-sm",
                          issue.severity === 'crítico' ? "bg-rose-950/10 border-rose-900/30 hover:border-rose-800" :
                          issue.severity === 'advertencia' ? "bg-amber-950/10 border-amber-900/30 hover:border-amber-800" :
                          "bg-blue-950/10 border-blue-900/30 hover:border-blue-800"
                        )}>
                          {/* Header of Issue */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              {issue.severity === 'crítico' ? <AlertOctagon className="h-4 w-4 text-rose-500" /> :
                               issue.severity === 'advertencia' ? <AlertTriangle className="h-4 w-4 text-amber-500" /> :
                               <div className="h-2 w-2 rounded-full bg-blue-500" />
                              }
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider",
                                issue.severity === 'crítico' ? "text-rose-400" :
                                issue.severity === 'advertencia' ? "text-amber-400" :
                                "text-blue-400"
                              )}>
                                {issue.type}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-500 uppercase font-mono bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded">
                              {issue.location}
                            </span>
                          </div>
                          
                          {/* Description */}
                          <p className="text-zinc-200 text-sm font-medium mb-2">
                            {issue.description}
                          </p>
                          
                          {/* Specific Quote Evidence */}
                          {issue.quote && (
                            <div className="bg-zinc-950/80 rounded border-l-2 border-zinc-700 p-2 pl-3 mb-3 my-2">
                              <p className="text-zinc-400 text-xs font-mono italic flex gap-2">
                                <Quote className="h-3 w-3 text-zinc-600 shrink-0 transform scale-x-[-1]" />
                                "{issue.quote}"
                              </p>
                            </div>
                          )}
                          
                          {/* Action Link */}
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="w-full h-7 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                            onClick={() => setActiveTab(issue.location)}
                          >
                            Corregir en {issue.location} <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <CardFooter className="bg-zinc-900 border-t border-zinc-800 p-4">
              <Button 
                onClick={handleAnalyze} 
                disabled={analyzing}
                className={cn(
                  "w-full h-10 font-medium shadow-lg transition-all border",
                  analyzing 
                    ? "bg-zinc-800 text-zinc-500 border-zinc-700" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-indigo-900/20 hover:scale-[1.01] active:scale-[0.99]"
                )}
              >
                {analyzing ? 'Analizando...' : (
                  <>
                    <Zap className="h-4 w-4 mr-2 fill-current" /> 
                    {auditData ? 'Re-auditar Sistema' : 'Ejecutar Auditoría'}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
