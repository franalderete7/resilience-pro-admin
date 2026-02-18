'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchUsers, getUserFilterOptions, toggleUserActive, toggleUserPremium, type User, type FetchUsersResult } from '@/app/actions/user-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Simple date formatter
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
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
  { key: 'username', label: 'Usuario', sortable: true, width: 'w-40' },
  { key: 'email', label: 'Email', sortable: true, width: 'w-48' },
  { key: 'first_name', label: 'Nombre', sortable: true, width: 'w-32' },
  { key: 'last_name', label: 'Apellido', sortable: true, width: 'w-32' },
  { key: 'role', label: 'Rol', sortable: true, width: 'w-24' },
  { key: 'is_premium', label: 'Premium', sortable: true, width: 'w-24' },
  { key: 'goal', label: 'Objetivo', sortable: true, width: 'w-40' },
  { key: 'fitness_level', label: 'Nivel', sortable: true, width: 'w-28' },
  { key: 'is_active', label: 'Activo', sortable: true, width: 'w-24' },
  { key: 'created_at', label: 'Registro', sortable: true, width: 'w-36' },
]

// Goal labels
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
  const [premiumFilter, setPremiumFilter] = useState<boolean | null>(null)
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Sorting
  const [sortBy, setSortBy] = useState<keyof User>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filter options
  const [roles, setRoles] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>([])

  // Load filter options
  useEffect(() => {
    getUserFilterOptions().then(options => {
      setRoles(options.roles)
      setGoals(options.goals)
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
        isPremium: premiumFilter,
        isActive: activeFilter,
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
  }, [searchQuery, roleFilter, goalFilter, premiumFilter, activeFilter, sortBy, sortOrder, currentPage, pageSize])

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

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('')
    setRoleFilter('')
    setGoalFilter('')
    setPremiumFilter(null)
    setActiveFilter(null)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalCount / pageSize)
  const hasFilters = searchQuery || roleFilter || goalFilter || premiumFilter !== null || activeFilter !== null

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
                      "px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider",
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
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-24">
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
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3">
                      <span className="text-zinc-300 text-sm truncate max-w-[160px] block">
                        {user.email}
                      </span>
                    </td>

                    {/* First Name */}
                    <td className="px-4 py-3">
                      <span className="text-zinc-300 text-sm">
                        {user.first_name || '-'}
                      </span>
                    </td>

                    {/* Last Name */}
                    <td className="px-4 py-3">
                      <span className="text-zinc-300 text-sm">
                        {user.last_name || '-'}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Dumbbell className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="text-zinc-300 text-sm">
                          {GOAL_LABELS[user.goal || ''] || user.goal || '-'}
                        </span>
                      </div>
                    </td>

                    {/* Level */}
                    <td className="px-4 py-3">
                      {user.fitness_level ? (
                        <Badge variant="outline" className="border-zinc-600 text-zinc-300">
                          {LEVEL_LABELS[user.fitness_level] || user.fitness_level}
                        </Badge>
                      ) : (
                        <span className="text-zinc-500 text-sm">-</span>
                      )}
                    </td>

                    {/* Active */}
                    <td className="px-4 py-3">
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

                    {/* Created At */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(user.created_at)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
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
    </div>
  )
}
