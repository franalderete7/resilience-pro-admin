'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetchActivePrompt, saveNewPromptVersion, fetchDefaultPrompts } from '@/app/actions/prompt-actions'
import { 
  AlertTriangle, 
  Save, 
  Zap,
  RefreshCw,
  RotateCcw,
  Dumbbell,
  Gauge,
  Activity,
  RefreshCcw
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Goal tabs configuration
const GOAL_TABS = [
  { 
    id: 'musclePower', 
    label: 'Potencia Muscular', 
    icon: Zap, 
    color: 'amber',
    description: 'Ejercicios explosivos y desarrollo de potencia'
  },
  { 
    id: 'muscleMass', 
    label: 'Masa Muscular', 
    icon: Dumbbell, 
    color: 'blue',
    description: 'Hipertrofia y alto volumen de entrenamiento'
  },
  { 
    id: 'speed', 
    label: 'Velocidad', 
    icon: Gauge, 
    color: 'emerald',
    description: 'Movimientos balísticos y velocidad reactiva'
  },
  { 
    id: 'maintenance', 
    label: 'Mantenimiento', 
    icon: RefreshCcw, 
    color: 'purple',
    description: 'Full body equilibrado y sostenible'
  },
] as const

type GoalId = typeof GOAL_TABS[number]['id']

export function AiConfigDashboard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [activeTab, setActiveTab] = useState<GoalId>('musclePower')
  
  // Form State - one prompt per goal
  const [label, setLabel] = useState('')
  const [prompts, setPrompts] = useState<Record<GoalId, string>>({
    musclePower: '',
    muscleMass: '',
    speed: '',
    maintenance: ''
  })

  // Initial State for Dirty Checking
  const [initialState, setInitialState] = useState<Record<GoalId, string>>({
    musclePower: '',
    muscleMass: '',
    speed: '',
    maintenance: ''
  })

  // Default prompts for reset
  const [defaults, setDefaults] = useState<Record<string, string>>({})
  
  useEffect(() => {
    loadData()
  }, [])

  const hasUnsavedChanges = 
    prompts.musclePower !== initialState.musclePower ||
    prompts.muscleMass !== initialState.muscleMass ||
    prompts.speed !== initialState.speed ||
    prompts.maintenance !== initialState.maintenance

  async function loadData() {
    setLoading(true)
    try {
      const [data, defaultData] = await Promise.all([
        fetchActivePrompt(),
        fetchDefaultPrompts()
      ])
      
      if (data) {
        const loaded = {
          musclePower: data.musclePower || '',
          muscleMass: data.muscleMass || '',
          speed: data.speed || '',
          maintenance: data.maintenance || ''
        }
        
        setPrompts(loaded)
        setInitialState(loaded)
        setLabel(`v${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.${new Date().getHours()}`)
      }

      if (defaultData) {
        setDefaults({
          musclePower: defaultData.improve_muscle_power || '',
          muscleMass: defaultData.increase_muscle_mass || '',
          speed: defaultData.improve_speed || '',
          maintenance: defaultData.maintenance || ''
        })
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
        musclePower: prompts.musclePower,
        muscleMass: prompts.muscleMass,
        speed: prompts.speed,
        maintenance: prompts.maintenance,
        isActive: true
      })
      
      setInitialState({ ...prompts })
      alert('¡Prompts de objetivos actualizados correctamente!')
    } catch (err) {
      console.error(err)
      alert('Error al guardar los prompts.')
    } finally {
      setSaving(false)
    }
  }

  function handleResetToDefault() {
    if (!confirm(`¿Restablecer "${GOAL_TABS.find(t => t.id === activeTab)?.label}" a los valores por defecto?`)) {
      return
    }
    
    setResetting(true)
    const defaultKey = activeTab
    if (defaults[defaultKey]) {
      setPrompts(prev => ({
        ...prev,
        [activeTab]: defaults[defaultKey]
      }))
    }
    setTimeout(() => setResetting(false), 300)
  }

  function updatePrompt(goalId: GoalId, value: string) {
    setPrompts(prev => ({
      ...prev,
      [goalId]: value
    }))
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-zinc-400 gap-3 animate-pulse">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span>Cargando configuración del sistema...</span>
      </div>
    )
  }

  const currentTabConfig = GOAL_TABS.find(t => t.id === activeTab)!

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
              {hasUnsavedChanges ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : <Activity className="h-5 w-5 text-indigo-400" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Configuración de Objetivos</h2>
              <p className="text-xs text-zinc-400">
                {hasUnsavedChanges ? <span className="text-amber-400 font-medium">⚠️ Tienes cambios sin guardar</span> : "Personaliza los prompts para cada tipo de programa"}
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
                "h-9 px-4 shadow-lg transition-all hover:scale-105 active:scale-95 border cursor-pointer",
                hasUnsavedChanges 
                  ? "bg-amber-600 hover:bg-amber-500 text-white border-amber-500 shadow-amber-900/20 animate-pulse" 
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
              )}
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? 'Guardando...' : hasUnsavedChanges ? 'Guardar Cambios' : 'Guardado'}
            </Button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-180px)]">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GoalId)} className="w-full flex-1 flex flex-col">
            <div className="border-b border-zinc-800 px-2 bg-zinc-950/50">
              <TabsList className="bg-transparent h-12 gap-2">
                {GOAL_TABS.map((tab) => {
                  const Icon = tab.icon
                  const colorClasses = {
                    amber: 'data-[state=active]:text-amber-400',
                    blue: 'data-[state=active]:text-blue-400',
                    emerald: 'data-[state=active]:text-emerald-400',
                    purple: 'data-[state=active]:text-purple-400',
                  }
                  return (
                    <TabsTrigger 
                      key={tab.id}
                      value={tab.id}
                      className={cn(
                        "data-[state=active]:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors",
                        colorClasses[tab.color]
                      )}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      <span className="hidden md:inline">{tab.label}</span>
                      <span className="md:hidden">{tab.label.split(' ')[0]}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>

            {/* Tab Description + Reset Button */}
            <div className="bg-zinc-950/30 border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = currentTabConfig.icon
                  return <Icon className={cn("h-4 w-4", {
                    'text-amber-400': currentTabConfig.color === 'amber',
                    'text-blue-400': currentTabConfig.color === 'blue',
                    'text-emerald-400': currentTabConfig.color === 'emerald',
                    'text-purple-400': currentTabConfig.color === 'purple',
                  })} />
                })()}
                <span className="text-sm text-zinc-400">{currentTabConfig.description}</span>
              </div>
              <Button
                onClick={handleResetToDefault}
                variant="ghost"
                size="sm"
                disabled={resetting}
                className="text-zinc-500 hover:text-zinc-300 h-7 text-xs cursor-pointer"
              >
                <RotateCcw className={cn("h-3 w-3 mr-1", resetting && "animate-spin")} />
                Restablecer
              </Button>
            </div>

            {/* Content Areas */}
            <div className="flex-1 overflow-hidden relative">
              {GOAL_TABS.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="h-full mt-0 p-0">
                  <Textarea 
                    value={prompts[tab.id]} 
                    onChange={(e) => updatePrompt(tab.id, e.target.value)} 
                    className={cn(
                      "h-full resize-none rounded-none border-0 bg-zinc-950/50 p-6 font-mono text-sm leading-relaxed focus-visible:ring-0 text-zinc-300",
                      {
                        'selection:bg-amber-500/30': tab.color === 'amber',
                        'selection:bg-blue-500/30': tab.color === 'blue',
                        'selection:bg-emerald-500/30': tab.color === 'emerald',
                        'selection:bg-purple-500/30': tab.color === 'purple',
                      }
                    )}
                    placeholder={`Define las reglas específicas para programas de ${tab.label}...`}
                  />
                </TabsContent>
              ))}
            </div>
            
            <div className="bg-zinc-900 border-t border-zinc-800 p-2 text-xs text-zinc-500 flex justify-between items-center">
              <div className="flex gap-4">
                <span>Líneas: {prompts[activeTab].split('\n').length}</span>
                {hasUnsavedChanges && <span className="text-amber-500 font-bold animate-pulse">• Editado</span>}
              </div>
              <span className="font-mono uppercase">{currentTabConfig.label}</span>
            </div>
          </Tabs>
        </div>

        {/* Help Section */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-medium text-white mb-2">💡 Cómo funciona</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Cada pestaña contiene las reglas específicas para un tipo de programa. Cuando un usuario crea un programa, 
            el sistema selecciona automáticamente el prompt correspondiente según su objetivo principal. 
            Las reglas base (duración, estructura de bloques, formato JSON) son compartidas y no se muestran aquí.
          </p>
        </div>
      </div>
    </div>
  )
}
