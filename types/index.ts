export type AssetCategory =
  | 'all'
  | 'models'
  | 'pbr'
  | 'scripts'
  | 'lighting'
  | 'skyboxes'
  | 'sfx'
  | 'ui';

export interface Asset {
  id: string;
  title: string;
  category: AssetCategory;
  subcategory: string;
  description: string;
  thumbnail: string;
  tags: string[];
  robloxAssetId?: string;
  downloadUrl?: string;
  luauCode?: string;
  fileSize?: string;
  creator: {
    name: string;
    avatar?: string;
    verified: boolean;
  };
  stats: {
    downloads: number;
    favorites: number;
    views: number;
  };
  format: 'RBXM' | 'OBJ' | 'PNG / PBR' | 'LUAU' | 'AUDIO' | 'PRESET';
  license: string;
  updatedAt: string;
}

export interface DevToolItem {
  id: string;
  name: string;
  description: string;
  category: 'generator' | 'converter' | 'calculator' | 'tester';
  badge: string;
  iconName: string;
}

export interface LightingPreset {
  id: string;
  name: string;
  description: string;
  clockTime: number;
  brightness: number;
  outdoorAmbient: [number, number, number];
  ambient: [number, number, number];
  fogEnd: number;
  fogColor: [number, number, number];
  exposureCompensation: number;
  bloom: {
    intensity: number;
    size: number;
    threshold: number;
  };
}

export interface CodeSnippet {
  id: string;
  title: string;
  category: string;
  description: string;
  code: string;
  variables?: { name: string; label: string; defaultValue: string }[];
}

export interface AssetSubmission {
  title: string;
  category: string;
  description: string;
  assetIdOrUrl: string;
  creatorName: string;
  contact?: string;
}
