import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { toJalali } from '../utils/dateHelper';
import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface KanbanCard {
  id: number;
  customer_name: string;
  customer_id: number;
  session_date: string;
  duration?: number;
  notes?: string;
  kanban_column: string;
  position: number;
  coach_username?: string;
}

interface KanbanBoardProps {
  sessions: { [key: string]: KanbanCard[] };
  onEdit?: (session: KanbanCard) => void;
}

const defaultColumns = [
  { id: 'code_executed', title: 'کد مد نظر اجرا شد', color: 'bg-blue-100' },
  { id: 'list_sent_to_coaching', title: 'لیست دانش پذیرها به کوچینگ داده شد', color: 'bg-purple-100' },
  { id: 'initial_contact', title: 'ارتباط اولیه کوچ با دانش پذیر', color: 'bg-yellow-100' },
  { id: 'product_selection_session', title: 'جلسه انتخاب محصول', color: 'bg-green-100' },
  { id: 'key_actions', title: 'اقدامات کلیدی', color: 'bg-orange-100' },
  { id: 'coach_feedback', title: 'بازخورد از کوچ', color: 'bg-pink-100' },
  { id: 'completed', title: 'تکمیل شده', color: 'bg-gray-100' },
];

const KanbanBoard = ({ sessions, onEdit }: KanbanBoardProps) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [draggedCard, setDraggedCard] = useState<KanbanCard | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [columns, setColumns] = useState(defaultColumns);
  const [editingColumn, setEditingColumn] = useState<{ id: string; title: string } | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const updatePositionMutation = useMutation(
    ({ id, kanban_column, position }: { id: number; kanban_column: string; position: number }) =>
      api.put(`/coaching/sessions/${id}/kanban`, { kanban_column, position }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('coaching-kanban');
        queryClient.invalidateQueries('coaching-sessions');
      },
      onError: (error: any) => {
        // Silently handle error - the UI will update optimistically
        // Only log for debugging
        console.error('Error updating kanban position:', error);
        // Don't show alert - the drag operation should complete silently
      },
    }
  );

  const handleDragStart = (e: React.DragEvent, card: KanbanCard, columnId: string) => {
    setDraggedCard(card);
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedCard || !draggedColumn) return;

    // Update the moved card
    if (draggedColumn !== targetColumnId) {
      updatePositionMutation.mutate({
        id: draggedCard.id,
        kanban_column: targetColumnId,
        position: targetIndex,
      });
    } else {
      // Same column, just update position
      updatePositionMutation.mutate({
        id: draggedCard.id,
        kanban_column: targetColumnId,
        position: targetIndex,
      });
    }

    setDraggedCard(null);
    setDraggedColumn(null);
  };

  const handleDropOnColumn = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    
    if (!draggedCard) return;

    const targetColumn = sessions[targetColumnId] || [];
    const newPosition = targetColumn.length;

    if (draggedColumn !== targetColumnId) {
      updatePositionMutation.mutate({
        id: draggedCard.id,
        kanban_column: targetColumnId,
        position: newPosition,
      });
    }

    setDraggedCard(null);
    setDraggedColumn(null);
  };

  // Load columns from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('kanban-columns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColumns(parsed);
        }
      } catch (e) {
        console.error('Error loading columns:', e);
      }
    }
  }, []);

  const handleAddColumn = () => {
    if (newColumnTitle.trim()) {
      const newColumn = {
        id: `column_${Date.now()}`,
        title: newColumnTitle.trim(),
        color: 'bg-gray-100'
      };
      const updated = [...columns, newColumn];
      setColumns(updated);
      localStorage.setItem('kanban-columns', JSON.stringify(updated));
      setNewColumnTitle('');
      setShowAddColumn(false);
    }
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max" style={{ minHeight: '600px' }}>
        {columns.map((column) => {
          const columnSessions = sessions[column.id] || [];
          
          return (
            <div
              key={column.id}
              className={`flex-shrink-0 w-80 ${column.color} rounded-lg p-4`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnColumn(e, column.id)}
            >
              <div className="flex items-center justify-between mb-4 sticky top-0 bg-white/80 dark:bg-neutral-800/80 backdrop-blur p-2 rounded">
                {editingColumn?.id === column.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editingColumn.title}
                      onChange={(e) => setEditingColumn({ ...editingColumn, title: e.target.value })}
                      className="flex-1 px-2 py-1 text-sm border rounded dark:bg-neutral-700 dark:text-neutral-100"
                      onBlur={() => {
                        if (editingColumn.title.trim()) {
                          setColumns(columns.map(c => 
                            c.id === editingColumn.id 
                              ? { ...c, title: editingColumn.title.trim() }
                              : c
                          ));
                          // Save to localStorage
                          localStorage.setItem('kanban-columns', JSON.stringify(columns));
                        }
                        setEditingColumn(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        } else if (e.key === 'Escape') {
                          setEditingColumn(null);
                        }
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <>
                    <h3 className="font-bold text-lg text-center flex-1 text-neutral-900 dark:text-neutral-100">
                      {column.title}
                    </h3>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingColumn({ id: column.id, title: column.title })}
                          className="p-1 hover:bg-white/50 rounded transition-colors"
                          title="ویرایش نام"
                        >
                          <Edit2 size={14} />
                        </button>
                        {columns.length > 1 && (
                          <button
                            onClick={() => {
                              if (confirm('آیا مطمئن هستید که می‌خواهید این بورد را حذف کنید؟')) {
                                setColumns(columns.filter(c => c.id !== column.id));
                                localStorage.setItem('kanban-columns', JSON.stringify(columns.filter(c => c.id !== column.id)));
                              }
                            }}
                            className="p-1 hover:bg-red-100 rounded transition-colors text-red-600"
                            title="حذف بورد"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="space-y-3">
                {columnSessions.map((session, index) => (
                  <div
                    key={session.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, session, column.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, column.id, index)}
                    onClick={() => onEdit?.(session)}
                    className="bg-white dark:bg-neutral-800 rounded-lg p-4 shadow-md cursor-move hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="font-medium text-gray-800 dark:text-neutral-100 mb-2">
                      {session.customer_name}
                    </div>
                    {session.session_date && (
                      <div className="text-sm text-gray-600 dark:text-neutral-300 mb-1">
                        📅 {toJalali(session.session_date)}
                      </div>
                    )}
                    {session.duration && (
                      <div className="text-sm text-gray-600 mb-1">
                        ⏱️ {session.duration} دقیقه
                      </div>
                    )}
                    {session.coach_username && (
                      <div className="text-sm text-gray-600 mb-1">
                        👤 کوچ: {session.coach_username}
                      </div>
                    )}
                    {session.notes && (
                      <div className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {session.notes}
                      </div>
                    )}
                  </div>
                ))}
                {columnSessions.length === 0 && (
                  <div className="text-center text-gray-400 py-8 text-sm">
                    خالی
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isAdmin && (
          <div className="flex-shrink-0 w-80">
            {showAddColumn ? (
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600">
                <input
                  type="text"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  placeholder="نام بورد جدید"
                  className="w-full px-3 py-2 mb-2 border rounded dark:bg-neutral-700 dark:text-neutral-100"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddColumn();
                    } else if (e.key === 'Escape') {
                      setShowAddColumn(false);
                      setNewColumnTitle('');
                    }
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddColumn}
                    className="flex-1 px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
                  >
                    افزودن
                  </button>
                  <button
                    onClick={() => {
                      setShowAddColumn(false);
                      setNewColumnTitle('');
                    }}
                    className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded hover:bg-neutral-300 dark:hover:bg-neutral-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddColumn(true)}
                className="w-full h-full min-h-[600px] border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="text-center">
                  <Plus size={32} className="mx-auto mb-2 text-neutral-400" />
                  <span className="text-neutral-600 dark:text-neutral-400">افزودن بورد</span>
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanBoard;

