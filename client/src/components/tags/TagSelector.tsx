import { useQuery } from 'react-query';
import api from '../../services/api';

export interface TagOption {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  allowCreate?: boolean;
}

const TagSelector = ({ selected, onChange }: TagSelectorProps) => {
  const { data: tags } = useQuery<TagOption[]>('tags', async () => {
    const response = await api.get('/tags');
    return response.data;
  });

  const toggleTag = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((tagId) => tagId !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags?.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className={`px-3 py-1 rounded-full border transition ${
              selected.includes(tag.id)
                ? 'bg-primary-600 text-white border-primary-600'
                : 'border-gray-300 text-gray-700 hover:border-primary-400'
            }`}
            style={{ backgroundColor: selected.includes(tag.id) ? tag.color : undefined }}
          >
            {tag.name}
          </button>
        ))}
      </div>
      {(!tags || tags.length === 0) && (
        <p className="text-sm text-gray-500">هنوز برچسبی ایجاد نشده است.</p>
      )}
    </div>
  );
};

export default TagSelector;


