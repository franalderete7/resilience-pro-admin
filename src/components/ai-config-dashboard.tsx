'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  RefreshCcw,
  Heart,
  PersonStanding,
  Check,
  ChevronRight,
  BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Metodología (base prompt - editable by trainer)
const METHODOLOGY_TAB = {
  id: 'methodology',
  dbKey: 'methodology',
  label: 'Metodología',
  shortLabel: 'Metodología',
  icon: BookOpen,
  color: 'slate',
  description: 'Reglas universales, fases, nomenclatura. Aplica a todos los objetivos.'
} as const

// All 9 goals matching the database user_goal enum
const GOAL_TABS = [
  {
    id: 'musclePower',
    dbKey: 'improve_muscle_power',
    label: 'Potencia Muscular',
    shortLabel: 'Potencia',
    icon: Zap,
    color: 'amber',
    description: 'Ejercicios explosivos y desarrollo de potencia'
  },
  {
    id: 'muscleMass',
    dbKey: 'increase_muscle_mass',
    label: 'Masa Muscular',
    shortLabel: 'Masa',
    icon: Dumbbell,
    color: 'blue',
    description: 'Hipertrofia y alto volumen de entrenamiento'
  },
  {
    id: 'speed',
    dbKey: 'improve_speed',
    label: 'Velocidad',
    shortLabel: 'Velocidad',
    icon: Gauge,
    color: 'emerald',
    description: 'Movimientos balísticos y velocidad reactiva'
  },
  {
    id: 'endurance',
    dbKey: 'improve_endurance',
    label: 'Resistencia',
    shortLabel: 'Resistencia',
    icon: Heart,
    color: 'red',
    description: 'Resistencia cardiovascular y muscular'
  },
  {
    id: 'flexibility',
    dbKey: 'increase_flexibility',
    label: 'Flexibilidad',
    shortLabel: 'Flexibilidad',
    icon: PersonStanding,
    color: 'teal',
    description: 'Movilidad articular y rango de movimiento'
  },
  {
    id: 'maintenance',
    dbKey: 'maintenance',
    label: 'Mantenimiento',
    shortLabel: 'Mantenimiento',
    icon: RefreshCw,
    color: 'purple',
    description: 'Full body equilibrado y sostenible'
  },
  {
    id: 'preMatch',
    dbKey: 'pre_match',
    label: 'Pre Match',
    shortLabel: 'Pre Match',
    icon: Activity,
    color: 'orange',
    description: 'Activación y preparación física pre-competencia'
  },
  {
    id: 'fuerzaSuperior',
    dbKey: 'fuerza_general_miembro_superior',
    label: 'Fuerza - Miembros Superiores',
    shortLabel: 'Fuerza Superior',
    icon: Dumbbell,
    color: 'cyan',
    description: 'Desarrollo de fuerza general en tren superior'
  },
  {
    id: 'fuerzaInferior',
    dbKey: 'fuerza_general_miembro_inferior',
    label: 'Fuerza - Miembros Inferiores',
    shortLabel: 'Fuerza Inferior',
    icon: Activity,
    color: 'orange',
    description: 'Desarrollo de fuerza general en tren inferior'
  },
] as const

const ALL_TABS = [METHODOLOGY_TAB, ...GOAL_TABS] as const
type TabId = typeof ALL_TABS[number]['id']

const COLOR_CLASSES: Record<string, { 
  active: string
  icon: string
  bg: string
  border: string
  dot: string
  ring: string
  selection: string
}> = {
  amber: {
    active: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    icon: 'text-amber-400',
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
    ring: 'ring-amber-500/30',
    selection: 'selection:bg-amber-500/30',
  },
  blue: {
    active: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    icon: 'text-blue-400',
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/20',
    dot: 'bg-blue-400',
    ring: 'ring-blue-500/30',
    selection: 'selection:bg-blue-500/30',
  },
  emerald: {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    icon: 'text-emerald-400',
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
    ring: 'ring-emerald-500/30',
    selection: 'selection:bg-emerald-500/30',
  },
  red: {
    active: 'bg-red-500/10 text-red-400 border-red-500/30',
    icon: 'text-red-400',
    bg: 'bg-red-500/5',
    border: 'border-red-500/20',
    dot: 'bg-red-400',
    ring: 'ring-red-500/30',
    selection: 'selection:bg-red-500/30',
  },
  teal: {
    active: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    icon: 'text-teal-400',
    bg: 'bg-teal-500/5',
    border: 'border-teal-500/20',
    dot: 'bg-teal-400',
    ring: 'ring-teal-500/30',
    selection: 'selection:bg-teal-500/30',
  },
  purple: {
    active: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    icon: 'text-purple-400',
    bg: 'bg-purple-500/5',
    border: 'border-purple-500/20',
    dot: 'bg-purple-400',
    ring: 'ring-purple-500/30',
    selection: 'selection:bg-purple-500/30',
  },
  orange: {
    active: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    icon: 'text-orange-400',
    bg: 'bg-orange-500/5',
    border: 'border-orange-500/20',
    dot: 'bg-orange-400',
    ring: 'ring-orange-500/30',
    selection: 'selection:bg-orange-500/30',
  },
  cyan: {
    active: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    icon: 'text-cyan-400',
    bg: 'bg-cyan-500/5',
    border: 'border-cyan-500/20',
    dot: 'bg-cyan-400',
    ring: 'ring-cyan-500/30',
    selection: 'selection:bg-cyan-500/30',
  },
  slate: {
    active: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    icon: 'text-slate-300',
    bg: 'bg-slate-500/5',
    border: 'border-slate-500/20',
    dot: 'bg-slate-400',
    ring: 'ring-slate-500/30',
    selection: 'selection:bg-slate-500/30',
  },
  lime: {
    active: 'bg-lime-500/10 text-lime-400 border-lime-500/30',
    icon: 'text-lime-400',
    bg: 'bg-lime-500/5',
    border: 'border-lime-500/20',
    dot: 'bg-lime-400',
    ring: 'ring-lime-500/30',
    selection: 'selection:bg-lime-500/30',
  },
}

const emptyPrompts: Record<TabId, string> = {
  methodology: '',
  musclePower: '',
  muscleMass: '',
  speed: '',
  maintenance: '',
  endurance: '',
  flexibility: '',
  preMatch: '',
  fuerzaSuperior: '',
  fuerzaInferior: '',
}

export function AiConfigDashboard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('methodology')
  
  const [label, setLabel] = useState('')
  const [prompts, setPrompts] = useState<Record<TabId, string>>({ ...emptyPrompts })
  const [initialState, setInitialState] = useState<Record<TabId, string>>({ ...emptyPrompts })
  const [defaults, setDefaults] = useState<Record<string, string>>({})
  
  useEffect(() => {
    loadData()
  }, [])

  // Track which tabs have been edited
  const editedTabs = ALL_TABS.filter(t => prompts[t.id] !== initialState[t.id]).map(t => t.id)
  const hasUnsavedChanges = editedTabs.length > 0

  async function loadData() {
    setLoading(true)
    try {
      const [data, defaultData] = await Promise.all([
        fetchActivePrompt(),
        fetchDefaultPrompts()
      ])
      
      if (data) {
        const loaded: Record<TabId, string> = {
          methodology: data.methodology || '',
          musclePower: data.musclePower || '',
          muscleMass: data.muscleMass || '',
          speed: data.speed || '',
          maintenance: data.maintenance || '',
          endurance: data.endurance || '',
          flexibility: data.flexibility || '',
          preMatch: data.preMatch || '',
          fuerzaSuperior: data.fuerzaSuperior || '',
          fuerzaInferior: data.fuerzaInferior || '',
        }
        setPrompts(loaded)
        setInitialState(loaded)
        setLabel(`v${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.${new Date().getHours()}`)
      }

      if (defaultData) {
        setDefaults({
          methodology: defaultData.methodology || '',
          musclePower: defaultData.improve_muscle_power || '',
          muscleMass: defaultData.increase_muscle_mass || '',
          speed: defaultData.improve_speed || '',
          maintenance: defaultData.maintenance || '',
          endurance: defaultData.improve_endurance || '',
          flexibility: defaultData.increase_flexibility || '',
          preMatch: defaultData.pre_match || '',
          fuerzaSuperior: defaultData.fuerza_general_miembro_superior || '',
          fuerzaInferior: defaultData.fuerza_general_miembro_inferior || '',
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
    setSaveSuccess(false)
    try {
      await saveNewPromptVersion({
        label,
        methodology: prompts.methodology,
        musclePower: prompts.musclePower,
        muscleMass: prompts.muscleMass,
        speed: prompts.speed,
        maintenance: prompts.maintenance,
        endurance: prompts.endurance,
        flexibility: prompts.flexibility,
        preMatch: prompts.preMatch,
        fuerzaSuperior: prompts.fuerzaSuperior,
        fuerzaInferior: prompts.fuerzaInferior,
        isActive: true
      })
      
      setInitialState({ ...prompts })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error(err)
      alert('Error al guardar los prompts.')
    } finally {
      setSaving(false)
    }
  }

  function handleResetTab(tabId: TabId) {
    const tab = ALL_TABS.find(t => t.id === tabId)
    if (!confirm(`¿Restablecer "${tab?.label}" al valor por defecto?`)) {
      return
    }
    if (defaults[tabId]) {
      setPrompts(prev => ({ ...prev, [tabId]: defaults[tabId] }))
    }
  }

  function handleResetAll() {
    if (!confirm('¿Restablecer TODOS los prompts a los valores por defecto? Los cambios no guardados se perderán.')) {
      return
    }
    setPrompts({
      methodology: defaults.methodology || '',
      musclePower: defaults.musclePower || '',
      muscleMass: defaults.muscleMass || '',
      speed: defaults.speed || '',
      maintenance: defaults.maintenance || '',
      endurance: defaults.endurance || '',
      flexibility: defaults.flexibility || '',
      preMatch: defaults.preMatch || '',
      fuerzaSuperior: defaults.fuerzaSuperior || '',
      fuerzaInferior: defaults.fuerzaInferior || '',
    })
  }

  const updatePrompt = useCallback((tabId: TabId, value: string) => {
    setPrompts(prev => ({ ...prev, [tabId]: value }))
  }, [])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-zinc-400 gap-3">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span>Cargando configuración del sistema...</span>
      </div>
    )
  }

  const currentTab = ALL_TABS.find(t => t.id === activeTab)!
  const colors = COLOR_CLASSES[currentTab.color] ?? COLOR_CLASSES.slate
  const currentIsEdited = editedTabs.includes(activeTab)
  const lineCount = prompts[activeTab].split('\n').length
  const charCount = prompts[activeTab].length

  return (
    <div className="flex flex-col gap-4 w-full">
      
      {/* ── Header Bar ── */}
      <div className={cn(
        "flex items-center justify-between p-4 rounded-xl border backdrop-blur-sm sticky top-0 z-20 transition-all duration-300",
        hasUnsavedChanges 
          ? "bg-amber-950/20 border-amber-500/30 shadow-lg shadow-amber-900/10" 
          : saveSuccess
            ? "bg-emerald-950/20 border-emerald-500/30 shadow-lg shadow-emerald-900/10"
            : "bg-zinc-900/50 border-zinc-800"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg transition-colors",
            hasUnsavedChanges ? "bg-amber-500/10" : saveSuccess ? "bg-emerald-500/10" : "bg-indigo-500/10"
          )}>
            {hasUnsavedChanges 
              ? <AlertTriangle className="h-5 w-5 text-amber-500" /> 
              : saveSuccess 
                ? <Check className="h-5 w-5 text-emerald-400" />
                : <Activity className="h-5 w-5 text-indigo-400" />
            }
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">Prompts por Objetivo</h2>
            <p className="text-xs text-zinc-400">
              {hasUnsavedChanges 
                ? <span className="text-amber-400 font-medium">
                    {editedTabs.length === 1 
                      ? `1 sección modificada` 
                      : `${editedTabs.length} secciones modificadas`
                    }
                  </span> 
                : saveSuccess
                  ? <span className="text-emerald-400 font-medium">Guardado correctamente</span>
                  : "Personaliza los prompts para cada tipo de programa"
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Input 
              value={label} 
              onChange={(e) => setLabel(e.target.value)} 
              placeholder="Etiqueta de versión" 
              className="w-44 bg-zinc-950 border-zinc-800 text-zinc-300 h-9 text-sm focus-visible:ring-indigo-500/50"
            />
          </div>
          
          {hasUnsavedChanges && (
            <Button
              onClick={handleResetAll}
              variant="ghost"
              className="h-9 px-3 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Descartar todo</span>
            </Button>
          )}
          
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasUnsavedChanges} 
            className={cn(
              "h-9 px-4 shadow-lg transition-all border cursor-pointer",
              hasUnsavedChanges 
                ? "bg-amber-600 hover:bg-amber-500 text-white border-amber-500 shadow-amber-900/20" 
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            )}
          >
            {saving 
              ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> 
              : <Save className="h-4 w-4 mr-2" />
            }
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      {/* ── Main Layout: Sidebar + Editor ── */}
      <div className="flex gap-3 h-[calc(100vh-180px)]">
        
        {/* ── Tab Sidebar ── */}
        <div className="w-56 shrink-0 flex flex-col gap-1.5 overflow-y-auto">
          {ALL_TABS.map((tab) => {
            const Icon = tab.icon
            const tabColors = COLOR_CLASSES[tab.color] ?? COLOR_CLASSES.slate
            const isActive = activeTab === tab.id
            const isEdited = editedTabs.includes(tab.id)
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group w-full",
                  isActive
                    ? `${tabColors.active} border`
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-md transition-colors shrink-0",
                  isActive ? tabColors.bg : "bg-zinc-800/50 group-hover:bg-zinc-800"
                )}>
                  <Icon className={cn("h-4 w-4", isActive ? tabColors.icon : "text-zinc-500 group-hover:text-zinc-400")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-sm font-medium truncate", isActive && "text-white")}>
                      {tab.shortLabel}
                    </span>
                    {isEdited && (
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", tabColors.dot)} />
                    )}
                  </div>
                </div>
                {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />}
              </button>
            )
          })}
          
          {/* Info Card */}
          <div className="mt-auto pt-3 border-t border-zinc-800/50">
            <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
              <h4 className="text-xs font-medium text-zinc-300 mb-1">Cómo funciona</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                <strong>Metodología:</strong> Reglas universales (duración, fases, nomenclatura). Aplica a todos los programas.
                <br /><br />
                <strong>Objetivos:</strong> Cada uno define la estructura de bloques y ejercicios específicos.
              </p>
            </div>
          </div>
        </div>

        {/* ── Editor Panel ── */}
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col min-w-0">
          
          {/* Editor Header */}
          <div className={cn(
            "px-4 py-3 border-b flex items-center justify-between shrink-0 transition-colors",
            colors.bg, colors.border
          )}>
            <div className="flex items-center gap-2.5">
              {(() => {
                const Icon = currentTab.icon
                return <Icon className={cn("h-4.5 w-4.5", colors.icon)} />
              })()}
              <div>
                <h3 className="text-sm font-semibold text-white">{currentTab.label}</h3>
                <p className="text-xs text-zinc-500">{currentTab.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentIsEdited && (
                <span className="text-[11px] text-amber-400 font-medium px-2 py-0.5 bg-amber-500/10 rounded-full">
                  Editado
                </span>
              )}
              <Button
                onClick={() => handleResetTab(activeTab)}
                variant="ghost"
                size="sm"
                className="text-zinc-500 hover:text-zinc-300 h-7 text-xs cursor-pointer"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Por defecto
              </Button>
            </div>
          </div>

          {/* Textarea Editor */}
          <div className="flex-1 overflow-hidden relative">
            <Textarea 
              value={prompts[activeTab]} 
              onChange={(e) => updatePrompt(activeTab, e.target.value)} 
              className={cn(
                "h-full resize-none rounded-none border-0 bg-zinc-950/50 p-6 font-mono text-sm leading-relaxed focus-visible:ring-0 text-zinc-300",
                colors.selection
              )}
              placeholder={activeTab === 'methodology' 
                ? 'Define las reglas universales, fases y nomenclatura...' 
                : `Define las reglas específicas para programas de ${currentTab.label}...`}
            />
          </div>
          
          {/* Status Bar */}
          <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-1.5 text-xs text-zinc-500 flex justify-between items-center shrink-0">
            <div className="flex gap-4">
              <span>Líneas: {lineCount}</span>
              <span>Caracteres: {charCount.toLocaleString()}</span>
              {currentIsEdited && <span className="text-amber-500 font-medium">Modificado</span>}
            </div>
            <span className={cn("font-mono text-[11px] uppercase px-2 py-0.5 rounded", colors.bg, colors.icon)}>
              {currentTab.shortLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
