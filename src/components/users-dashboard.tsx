'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchUsers, getUserFilterOptions, toggleUserActive, toggleUserPremium, fetchUserById, type User, type InjuryRecord } from '@/app/actions/user-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Crown,
  User as UserIcon,
  Dumbbell,
  Calendar,
  MoreHorizontal,
  Phone,
  Mail,
  Ruler,
  Weight,
  Target,
  Clock,
  MapPin,
  Activity,
  AlertCircle,
  Smartphone,
  Info,
  ExternalLink,
  ChevronRight as ChevronRightIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Simple date formatter
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Table column definition
type ColumnDef = {
  key: keyof User
  label: string
  sortable: boolean
  width?: string
}

const COLUMNS: ColumnDef[] = [
  { key: 'username', label: 'Usuario', sortable: true, width: 'w-36' },
  { key: 'email', label: 'Email', sortable: true, width: 'w-44' },
  { key: 'first_name', label: 'Nombre', sortable: true, width: 'w-28' },
  { key: 'last_name', label: 'Apellido', sortable: true, width: 'w-28' },
  { key: 'role', label: 'Rol', sortable: true, width: 'w-20' },
  { key: 'is_premium', label: 'Premium', sortable: true, width: 'w-20' },
  { key: 'goal', label: 'Objetivo', sortable: true, width: 'w-36' },
  { key: 'fitness_level', label: 'Nivel', sortable: true, width: 'w-24' },
  { key: 'age', label: 'Edad', sortable: true, width: 'w-16' },
  { key: 'phone_number', label: 'Teléfono', sortable: false, width: 'w-32' },
  { key: 'is_active', label: 'Activo', sortable: true, width: 'w-16' },
  { key: 'onboarding_completed', label: 'Onboarding', sortable: true, width: 'w-20' },
  { key: 'created_at', label: 'Registro', sortable: true, width: 'w-28' },
]

// Labels
const GOAL_LABELS: Record<string, string> = {
  improve_muscle_power: 'Potencia',
  increase_muscle_mass: 'Masa Muscular',
  improve_speed: 'Velocidad',
  improve_endurance: 'Resistencia',
  increase_flexibility: 'Flexibilidad',
  maintenance: 'Mantenimiento',
  pre_match: 'Pre Match',
  fuerza_general_miembro_superior: 'Fuerza Superior',
  fuerza_general_miembro_inferior: 'Fuerza Inferior',
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Masculino',
  female: 'Femenino',
  other: 'Otro',
}

const SPORT_LABELS: Record<string, string> = {
  none: 'Ninguno',
  soccer: 'Fútbol',
  basketball: 'Básquet',
  tennis: 'Tenis',
  rugby: 'Rugby',
  volleyball: 'Vóley',
  hockey: 'Hockey',
  swimming: 'Natación',
  running: 'Running',
  cycling: 'Ciclismo',
  crossfit: 'CrossFit',
  other: 'Otro',
}

const SPORT_LEVEL_LABELS: Record<string, string> = {
  amateur: 'Amateur',
  semi_professional: 'Semi-Pro',
  professional: 'Profesional',
}

const TRAINING_PLACE_LABELS: Record<string, string> = {
  gym: 'Gimnasio',
  home: 'Casa',
  outdoor: 'Exterior',
  mixed: 'Mixto',
}

const EQUIPMENT_LABELS: Record<string, string> = {
  barbells: 'Barras',
  dumbbells: 'Mancuernas',
  kettlebells: 'Kettlebells',
  machines: 'Máquinas',
  cables: 'Cables',
  resistance_bands: 'Bandas',
  bodyweight: 'P. Corporal',
  med_ball: 'Med Ball',
  bench: 'Banco',
  squat_rack: 'Rack',
  pull_up_bar: 'Barra Dominadas',
  cardio: 'Cardio',
}

export function UsersDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [goalFilter, setGoalFilter] = useState('')
  const [fitnessLevelFilter, setFitnessLevelFilter] = useState('')
  const [premiumFilter, setPremiumFilter] = useState<boolean | null>(null)
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null)
  const [onboardingFilter, setOnboardingFilter] = useState<boolean | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Sorting
  const [sortBy, setSortBy] = useState<keyof User>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filter options
  const [roles, setRoles] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>([])
  const [fitnessLevels, setFitnessLevels] = useState<string[]>([])

  // Detail view
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Load filter options
  useEffect(() => {
    getUserFilterOptions().then(options => {
      setRoles(options.roles)
      setGoals(options.goals)
      setFitnessLevels(options.fitnessLevels)
    })
  }, [])

  // Load users
  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetchUsers({
        search: searchQuery,
        role: roleFilter,
        goal: goalFilter,
        fitnessLevel: fitnessLevelFilter,
        isPremium: premiumFilter,
        isActive: activeFilter,
        onboardingCompleted: onboardingFilter,
        sortBy,
        sortOrder,
        page: currentPage,
        pageSize
      })

      setUsers(result.users)
      setTotalCount(result.totalCount)
    } catch (err) {
      setError('Error al cargar usuarios')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, roleFilter, goalFilter, fitnessLevelFilter, premiumFilter, activeFilter, onboardingFilter, sortBy, sortOrder, currentPage, pageSize])

  // Load on mount and when filters change
  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Handle sort
  const handleSort = (key: keyof User) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  // Handle toggle active
  const handleToggleActive = async (user: User) => {
    try {
      await toggleUserActive(user.id, !user.is_active)
      loadUsers()
    } catch (err) {
      console.error('Error toggling user:', err)
    }
  }

  // Handle toggle premium
  const handleTogglePremium = async (user: User) => {
    try {
      await toggleUserPremium(user.id, !user.is_premium)
      loadUsers()
    } catch (err) {
      console.error('Error toggling premium:', err)
    }
  }

  // Open user detail
  const openUserDetail = async (user: User) => {
    setDetailLoading(true)
    setSelectedUser(null)
    try {
      const fullUser = await fetchUserById(user.id)
      if (fullUser) {
        setSelectedUser(fullUser)
      }
    } catch (err) {
      console.error('Error fetching user details:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('')
    setRoleFilter('')
    setGoalFilter('')
    setFitnessLevelFilter('')
    setPremiumFilter(null)
    setActiveFilter(null)
    setOnboardingFilter(null)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalCount / pageSize)
  const hasFilters = searchQuery || roleFilter || goalFilter || fitnessLevelFilter || premiumFilter !== null || activeFilter !== null || onboardingFilter !== null

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Usuarios</h2>
          <p className="text-sm text-zinc-400">{totalCount} usuarios registrados</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Buscar usuario..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 w-full sm:w-64"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "border-zinc-700 text-white hover:bg-zinc-800",
              hasFilters && "border-amber-500/50 text-amber-400"
            )}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {hasFilters && <span className="ml-1.5 h-2 w-2 rounded-full bg-amber-500" />}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Rol</label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos</option>
                {roles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Objetivo</label>
              <select
                value={goalFilter}
                onChange={(e) => {
                  setGoalFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos</option>
                {goals.map(goal => (
                  <option key={goal} value={goal}>{GOAL_LABELS[goal] || goal}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Nivel Fitness</label>
              <select
                value={fitnessLevelFilter}
                onChange={(e) => {
                  setFitnessLevelFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos</option>
                {fitnessLevels.map(level => (
                  <option key={level} value={level}>{LEVEL_LABELS[level] || level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Premium</label>
              <select
                value={premiumFilter === null ? '' : premiumFilter.toString()}
                onChange={(e) => {
                  const val = e.target.value
                  setPremiumFilter(val === '' ? null : val === 'true')
                  setCurrentPage(1)
                }}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos</option>
                <option value="true">Premium</option>
                <option value="false">Gratuito</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Estado</label>
              <select
                value={activeFilter === null ? '' : activeFilter.toString()}
                onChange={(e) => {
                  const val = e.target.value
                  setActiveFilter(val === '' ? null : val === 'true')
                  setCurrentPage(1)
                }}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos</option>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Onboarding</label>
              <select
                value={onboardingFilter === null ? '' : onboardingFilter.toString()}
                onChange={(e) => {
                  const val = e.target.value
                  setOnboardingFilter(val === '' ? null : val === 'true')
                  setCurrentPage(1)
                }}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos</option>
                <option value="true">Completado</option>
                <option value="false">Pendiente</option>
              </select>
            </div>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="text-zinc-400 hover:text-white text-sm"
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-900 border-b border-zinc-700">
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col.key as string}
                    className={cn(
                      "px-3 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider",
                      col.sortable && "cursor-pointer hover:text-white select-none",
                      col.width
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortBy === col.key && (
                        sortOrder === 'asc' ?
                          <ChevronUp className="h-3 w-3" /> :
                          <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-20">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-700">
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      <span className="text-zinc-400">Cargando usuarios...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <UserIcon className="h-12 w-12 text-zinc-600" />
                      <p className="text-zinc-400">No se encontraron usuarios</p>
                      {hasFilters && (
                        <Button variant="outline" onClick={clearFilters} className="mt-2">
                          Limpiar filtros
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-zinc-700/50 transition-colors">
                    {/* Username */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate max-w-[120px]">
                          {user.username}
                        </span>
                        {user.is_premium && (
                          <Crown className="h-3.5 w-3.5 text-amber-400" />
                        )}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-3 py-3">
                      <span className="text-zinc-300 text-sm truncate max-w-[160px] block">
                        {user.email}
                      </span>
                    </td>

                    {/* First Name */}
                    <td className="px-3 py-3">
                      <span className="text-zinc-300 text-sm">
                        {user.first_name || '-'}
                      </span>
                    </td>

                    {/* Last Name */}
                    <td className="px-3 py-3">
                      <span className="text-zinc-300 text-sm">
                        {user.last_name || '-'}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="px-3 py-3">
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className={cn(
                          user.role === 'admin'
                            ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
                            : "bg-zinc-700 text-zinc-300"
                        )}
                      >
                        {user.role}
                      </Badge>
                    </td>

                    {/* Premium */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleTogglePremium(user)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                          user.is_premium
                            ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                            : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                        )}
                      >
                        {user.is_premium ? (
                          <><Crown className="h-3 w-3" /> Premium</>
                        ) : (
                          'Gratuito'
                        )}
                      </button>
                    </td>

                    {/* Goal */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <Dumbbell className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="text-zinc-300 text-sm">
                          {GOAL_LABELS[user.goal || ''] || user.goal || '-'}
                        </span>
                      </div>
                    </td>

                    {/* Level */}
                    <td className="px-3 py-3">
                      {user.fitness_level ? (
                        <Badge variant="outline" className="border-zinc-600 text-zinc-300">
                          {LEVEL_LABELS[user.fitness_level] || user.fitness_level}
                        </Badge>
                      ) : (
                        <span className="text-zinc-500 text-sm">-</span>
                      )}
                    </td>

                    {/* Age */}
                    <td className="px-3 py-3">
                      <span className="text-zinc-300 text-sm">
                        {user.age ? `${user.age} años` : '-'}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="px-3 py-3">
                      {user.phone_number ? (
                        <div className="flex items-center gap-1 text-zinc-300 text-sm">
                          <Phone className="h-3 w-3 text-zinc-500" />
                          <span className="truncate">
                            +{user.phone_country_code} {user.phone_number}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-sm">-</span>
                      )}
                    </td>

                    {/* Active */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
                          user.is_active
                            ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        )}
                      >
                        {user.is_active ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </button>
                    </td>

                    {/* Onboarding */}
                    <td className="px-3 py-3">
                      <Badge
                        variant={user.onboarding_completed ? 'default' : 'secondary'}
                        className={cn(
                          user.onboarding_completed
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/20 text-amber-300"
                        )}
                      >
                        {user.onboarding_completed ? 'Completo' : 'Pendiente'}
                      </Badge>
                    </td>

                    {/* Created At */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(user.created_at)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openUserDetail(user)}
                        className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {users.length > 0 && (
          <div className="border-t border-zinc-700 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span>Mostrando</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>de {totalCount} usuarios</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-zinc-700 text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm text-zinc-400 px-2">
                Página {currentPage} de {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-zinc-700 text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser || detailLoading} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-700 text-white">
          {detailLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
              <span className="text-zinc-400">Cargando detalles...</span>
            </div>
          ) : selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{selectedUser.username}</span>
                      {selectedUser.is_premium && <Crown className="h-4 w-4 text-amber-400" />}
                    </div>
                    <p className="text-sm text-zinc-400 font-normal">{selectedUser.email}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Basic Info */}
                <section>
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Información Básica
                  </h3>
                  <div className="grid grid-cols-2 gap-4 bg-zinc-800/50 rounded-lg p-4">
                    <div>
                      <span className="text-zinc-500 text-xs">Nombre completo</span>
                      <p className="text-white">
                        {selectedUser.first_name || '-'} {selectedUser.last_name || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Rol</span>
                      <p className="text-white capitalize">{selectedUser.role}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Edad</span>
                      <p className="text-white">{selectedUser.age ? `${selectedUser.age} años` : '-'}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Género</span>
                      <p className="text-white">{GENDER_LABELS[selectedUser.gender || ''] || selectedUser.gender || '-'}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Teléfono</span>
                      <div className="flex items-center gap-2">
                        {selectedUser.phone_number ? (
                          <>
                            <Smartphone className="h-3.5 w-3.5 text-zinc-500" />
                            <span className="text-white">
                              +{selectedUser.phone_country_code} {selectedUser.phone_number}
                            </span>
                          </>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Estado</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedUser.is_active ? 'default' : 'secondary'} className={selectedUser.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}>
                          {selectedUser.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                        <Badge variant={selectedUser.is_premium ? 'default' : 'secondary'} className={selectedUser.is_premium ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-700 text-zinc-400'}>
                          {selectedUser.is_premium ? 'Premium' : 'Gratuito'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Physical Metrics */}
                <section>
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Métricas Físicas
                  </h3>
                  <div className="grid grid-cols-3 gap-4 bg-zinc-800/50 rounded-lg p-4">
                    <div>
                      <span className="text-zinc-500 text-xs">Altura</span>
                      <p className="text-white flex items-center gap-1">
                        <Ruler className="h-3.5 w-3.5 text-zinc-500" />
                        {selectedUser.height ? `${selectedUser.height} cm` : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Peso</span>
                      <p className="text-white flex items-center gap-1">
                        <Weight className="h-3.5 w-3.5 text-zinc-500" />
                        {selectedUser.weight ? `${selectedUser.weight} kg` : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Objetivo de Peso</span>
                      <p className="text-white flex items-center gap-1">
                        <Target className="h-3.5 w-3.5 text-zinc-500" />
                        {selectedUser.weight_goal ? `${selectedUser.weight_goal} kg` : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Nivel de Fitness</span>
                      <p className="text-white">{LEVEL_LABELS[selectedUser.fitness_level || ''] || selectedUser.fitness_level || '-'}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Lateralidad</span>
                      <p className="text-white capitalize">{selectedUser.dominant_side || '-'}</p>
                    </div>
                  </div>
                </section>

                {/* Training Preferences */}
                <section>
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Dumbbell className="h-4 w-4" />
                    Preferencias de Entrenamiento
                  </h3>
                  <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-zinc-500 text-xs">Objetivo Principal</span>
                        <p className="text-white font-medium">{GOAL_LABELS[selectedUser.goal || ''] || selectedUser.goal || '-'}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-xs">Deporte</span>
                        <p className="text-white">
                          {SPORT_LABELS[selectedUser.sport || ''] || selectedUser.sport || '-'}
                          {selectedUser.sport === 'other' && selectedUser.sport_other && ` (${selectedUser.sport_other})`}
                        </p>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-xs">Nivel Deportivo</span>
                        <p className="text-white">{SPORT_LEVEL_LABELS[selectedUser.sport_level || ''] || selectedUser.sport_level || '-'}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-xs">Lugar de Entreno</span>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                          <span className="text-white">{TRAINING_PLACE_LABELS[selectedUser.training_place || ''] || selectedUser.training_place || '-'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-xs">Frecuencia</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-zinc-500" />
                          <span className="text-white">{selectedUser.preferred_days_per_week || '-'} días/semana</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-xs">Duración</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-zinc-500" />
                          <span className="text-white">{selectedUser.preferred_session_minutes || '-'} min/sesión</span>
                        </div>
                      </div>
                    </div>

                    {/* Equipment */}
                    <div>
                      <span className="text-zinc-500 text-xs">Equipamiento Disponible</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedUser.available_equipment && selectedUser.available_equipment.length > 0 ? (
                          selectedUser.available_equipment.map(item => (
                            <Badge key={item} variant="secondary" className="bg-zinc-700 text-zinc-300 text-xs">
                              {EQUIPMENT_LABELS[item] || item}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-zinc-500 text-sm">Sin equipamiento</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Injury History */}
                {selectedUser.injury_history && selectedUser.injury_history.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Historial de Lesiones
                    </h3>
                    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                      {selectedUser.injury_history.map((injury: InjuryRecord, idx: number) => (
                        <div key={injury.id || idx} className="flex items-start justify-between border-b border-zinc-700 last:border-0 pb-2 last:pb-0">
                          <div>
                            <p className="text-white font-medium">{injury.bodyPart}</p>
                            <p className="text-zinc-400 text-sm">{injury.injuryType} • {injury.severity}</p>
                            {injury.notes && <p className="text-zinc-500 text-xs mt-1">{injury.notes}</p>}
                          </div>
                          <div className="text-right">
                            <span className="text-zinc-500 text-xs">{formatDate(injury.dateOccurred)}</span>
                            {injury.isActive && (
                              <Badge variant="destructive" className="ml-2 text-xs">Activa</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Onboarding Info */}
                <section>
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Información de Registro
                  </h3>
                  <div className="grid grid-cols-2 gap-4 bg-zinc-800/50 rounded-lg p-4">
                    <div>
                      <span className="text-zinc-500 text-xs">Fecha de Registro</span>
                      <p className="text-white">{formatDateTime(selectedUser.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Última Actualización</span>
                      <p className="text-white">{formatDateTime(selectedUser.updated_at)}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Onboarding Completado</span>
                      <p className="text-white">
                        {selectedUser.onboarding_completed
                          ? formatDateTime(selectedUser.onboarding_completed_at || '')
                          : 'Pendiente'}
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Origen</span>
                      <p className="text-white capitalize">{selectedUser.referral_source || '-'}</p>
                    </div>
                    {selectedUser.onboarding_reason && (
                      <div className="col-span-2">
                        <span className="text-zinc-500 text-xs">Motivo de Registro</span>
                        <p className="text-white text-sm">{selectedUser.onboarding_reason}</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-zinc-700">
                  <Button
                    variant="outline"
                    onClick={() => handleToggleActive(selectedUser)}
                    className={cn(
                      "flex-1",
                      selectedUser.is_active
                        ? "border-red-500/50 text-red-400 hover:bg-red-500/20"
                        : "border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
                    )}
                  >
                    {selectedUser.is_active ? 'Desactivar Usuario' : 'Activar Usuario'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleTogglePremium(selectedUser)}
                    className={cn(
                      "flex-1",
                      selectedUser.is_premium
                        ? "border-zinc-500 text-zinc-400 hover:bg-zinc-700"
                        : "border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                    )}
                  >
                    {selectedUser.is_premium ? 'Quitar Premium' : 'Hacer Premium'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
