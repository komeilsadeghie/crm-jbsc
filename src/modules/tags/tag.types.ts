export type EntityType = 'CUSTOMER' | 'DEAL' | 'COACHING_PROGRAM' | 'CONTENT_ITEM';

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TagPayload {
  name: string;
  color?: string;
}

export interface AssignTagPayload {
  entityType: EntityType;
  entityId: string;
  tagIds: string[];
}

export type TagWithUsage = Tag & {
  usageCount: number;
};


