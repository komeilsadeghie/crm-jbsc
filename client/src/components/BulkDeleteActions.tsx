import { CheckSquare, Square, Trash2 } from 'lucide-react';

interface BulkDeleteActionsProps {
  selectedIds: number[];
  onSelectAll: (checked: boolean) => void;
  onBulkDelete: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  isLoading?: boolean;
  totalItems: number;
  itemName?: string;
}

export const BulkDeleteActions = ({
  selectedIds,
  onSelectAll,
  onBulkDelete,
  isAllSelected,
  isIndeterminate,
  isLoading = false,
  totalItems,
  itemName = 'مورد',
}: BulkDeleteActionsProps) => {
  return (
    <>
      {selectedIds.length > 0 && (
        <button
          onClick={onBulkDelete}
          className="btn btn-danger flex items-center gap-2"
          disabled={isLoading}
        >
          <Trash2 size={20} />
          حذف {selectedIds.length} {itemName}
        </button>
      )}
    </>
  );
};

export const SelectAllCheckbox = ({
  isAllSelected,
  isIndeterminate,
  onSelectAll,
}: {
  isAllSelected: boolean;
  isIndeterminate: boolean;
  onSelectAll: (checked: boolean) => void;
}) => {
  return (
    <th>
      <button
        onClick={() => onSelectAll(!isAllSelected)}
        className="flex items-center justify-center"
        title={isAllSelected ? 'لغو انتخاب همه' : 'انتخاب همه'}
      >
        {isAllSelected ? (
          <CheckSquare size={20} className="text-primary-600" />
        ) : isIndeterminate ? (
          <div className="w-5 h-5 border-2 border-primary-600 bg-primary-100 rounded"></div>
        ) : (
          <Square size={20} className="text-gray-400" />
        )}
      </button>
    </th>
  );
};

export const RowCheckbox = ({
  id,
  selectedIds,
  onSelect,
}: {
  id: number;
  selectedIds: number[];
  onSelect: (id: number, checked: boolean) => void;
}) => {
  return (
    <td>
      <input
        type="checkbox"
        checked={selectedIds.includes(id)}
        onChange={(e) => onSelect(id, e.target.checked)}
        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
      />
    </td>
  );
};

