import { Asset, LightingPreset, CodeSnippet } from '@/types';

export const ASSETS_DATA: Asset[] = [
  {
    id: 'cyber-light-pack',
    title: 'Cyberpunk Neon Streetlamp Pack',
    category: 'models',
    subcategory: 'Props & City',
    description: 'A modular set of 6 high-detail cyberpunk street lamps featuring custom neon emissive lighting, low polycount optimization, and collision presets.',
    thumbnail: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&auto=format&fit=crop&q=80',
    tags: ['cyberpunk', 'streetlamp', 'modular', 'lighting', 'optimized'],
    robloxAssetId: '13894729104',
    downloadUrl: 'https://github.com/devmap-tools/assets/releases/download/v1.0/cyber_lamps.rbxm',
    luauCode: `-- Cyberpunk Lamp Flicker Script
local light = script.Parent:FindFirstChildWhichIsA("PointLight")
while true do
    task.wait(math.random(1, 5) * 0.1)
    if light then
        light.Brightness = math.random(12, 18) / 10
    end
end`,
    fileSize: '1.4 MB',
    creator: {
      name: 'VoxelForge',
      verified: true,
    },
    stats: {
      downloads: 4820,
      favorites: 1240,
      views: 18900,
    },
    format: 'RBXM',
    license: 'CC0 - Public Domain',
    updatedAt: '2026-10-20',
  },
  {
    id: 'pine-foliage-kit',
    title: 'Realistic Low-Poly Pine & Forest Kit',
    category: 'models',
    subcategory: 'Nature & Terrain',
    description: 'Includes 12 stylized low-poly pine trees, 4 rock boulders, 6 grass clusters, and custom wind-sway vertex paint ready for large open-world maps.',
    thumbnail: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80',
    tags: ['nature', 'trees', 'foliage', 'lowpoly', 'openworld'],
    robloxAssetId: '14029381722',
    downloadUrl: 'https://github.com/devmap-tools/assets/releases/download/v1.0/pine_forest_pack.rbxm',
    fileSize: '3.8 MB',
    creator: {
      name: 'NordicDev',
      verified: true,
    },
    stats: {
      downloads: 8910,
      favorites: 3120,
      views: 32000,
    },
    format: 'RBXM',
    license: 'MIT License',
    updatedAt: '2026-10-18',
  },
  {
    id: 'pbr-wet-asphalt',
    title: '4K Wet Asphalt PBR Material',
    category: 'pbr',
    subcategory: 'Surfaces & Roads',
    description: 'Photorealistic seamless 4K PBR texture with Color, Normal, Roughness, and Metalness maps. Perfect for realistic rain & urban city streets.',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    tags: ['pbr', 'material', 'asphalt', 'road', 'rain', 'photorealistic'],
    robloxAssetId: '14109827364',
    downloadUrl: 'https://github.com/devmap-tools/assets/releases/download/v1.0/pbr_asphalt_4k.zip',
    fileSize: '18.2 MB',
    creator: {
      name: 'PBRStudio',
      verified: true,
    },
    stats: {
      downloads: 6240,
      favorites: 1840,
      views: 24100,
    },
    format: 'PNG / PBR',
    license: 'CC0 - Free for Commercial Use',
    updatedAt: '2026-10-15',
  },
  {
    id: 'pbr-cracked-concrete',
    title: 'Industrial Cracked Concrete PBR',
    category: 'pbr',
    subcategory: 'Walls & Floors',
    description: 'Heavy industrial grunge concrete with realistic micro-cracks and weathered dirt displacement. Fully tileable in Studio Material Manager.',
    thumbnail: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=600&auto=format&fit=crop&q=80',
    tags: ['pbr', 'concrete', 'grunge', 'industrial', 'cracked'],
    robloxAssetId: '13982710492',
    downloadUrl: 'https://github.com/devmap-tools/assets/releases/download/v1.0/pbr_concrete.zip',
    fileSize: '14.5 MB',
    creator: {
      name: 'VoxelForge',
      verified: true,
    },
    stats: {
      downloads: 4120,
      favorites: 970,
      views: 15400,
    },
    format: 'PNG / PBR',
    license: 'CC0 - Public Domain',
    updatedAt: '2026-10-12',
  },
  {
    id: 'script-smooth-door',
    title: 'TweenService Sliding & Hinge Door Engine',
    category: 'scripts',
    subcategory: 'Mechanics & Utilities',
    description: 'Production-ready door system with ProximityPrompt, auto-close timer, audio sync, debounce security, and keycard permission support.',
    thumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80',
    tags: ['luau', 'script', 'door', 'tweenservice', 'proximityprompt'],
    luauCode: `-- [[ TWEENSERVICE SMOOTH SLIDING DOOR SYSTEM ]]
local TweenService = game:GetService("TweenService")
local doorPart = script.Parent.Door
local prompt = script.Parent.ProximityPrompt

local isOpen = false
local isBusy = false

local closedCFrame = doorPart.CFrame
local openCFrame = closedCFrame * CFrame.new(0, 0, 4)

local tweenInfo = TweenInfo.new(0.8, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)

prompt.Triggered:Connect(function(player)
    if isBusy then return end
    isBusy = true
    
    local targetCFrame = isOpen and closedCFrame or openCFrame
    local tween = TweenService:Create(doorPart, tweenInfo, {CFrame = targetCFrame})
    
    tween:Play()
    tween.Completed:Wait()
    
    isOpen = not isOpen
    prompt.ActionText = isOpen and "Close Door" or "Open Door"
    isBusy = false
end)`,
    fileSize: '4 KB',
    creator: {
      name: 'DevMapHQ',
      verified: true,
    },
    stats: {
      downloads: 12500,
      favorites: 4300,
      views: 45000,
    },
    format: 'LUAU',
    license: 'MIT License',
    updatedAt: '2026-10-22',
  },
  {
    id: 'script-day-night',
    title: 'Ultra Smooth Day / Night Cycle with Sun/Moon Sync',
    category: 'scripts',
    subcategory: 'World & Environment',
    description: 'Smooth Lighting ClockTime transition with dynamic outdoor ambient color shift, star opacity blending, and customizable cycle duration.',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
    tags: ['luau', 'lighting', 'daynight', 'environment', 'clocktime'],
    luauCode: `-- [[ DAY / NIGHT CYCLE WITH AMBIENT SHIFT ]]
local Lighting = game:GetService("Lighting")
local RunService = game:GetService("RunService")

local DAY_LENGTH_MINUTES = 12 -- 1 full game day = 12 real minutes
local SECONDS_PER_MINUTE = 60
local CYCLE_SPEED = 24 / (DAY_LENGTH_MINUTES * SECONDS_PER_MINUTE)

RunService.Heartbeat:Connect(function(dt)
    Lighting.ClockTime = (Lighting.ClockTime + (dt * CYCLE_SPEED)) % 24
end)`,
    fileSize: '3 KB',
    creator: {
      name: 'AstroLua',
      verified: true,
    },
    stats: {
      downloads: 9800,
      favorites: 2980,
      views: 31200,
    },
    format: 'LUAU',
    license: 'MIT License',
    updatedAt: '2026-10-19',
  },
  {
    id: 'lighting-cyberpunk-noir',
    title: 'Cyberpunk Noir Atmosphere & ColorCorrection',
    category: 'lighting',
    subcategory: 'Atmosphere Presets',
    description: 'Dark moody aesthetic with sharp contrast, purple-cyan ambient tint, dense atmospheric haze, and controlled neon bloom.',
    thumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
    tags: ['lighting', 'cyberpunk', 'noir', 'bloom', 'atmosphere'],
    luauCode: `-- [[ APPLY CYBERPUNK NOIR LIGHTING ]]
local Lighting = game:GetService("Lighting")

Lighting.ClockTime = 0.5
Lighting.Brightness = 1.2
Lighting.OutdoorAmbient = Color3.fromRGB(35, 25, 55)
Lighting.Ambient = Color3.fromRGB(20, 20, 30)
Lighting.FogEnd = 350
Lighting.FogColor = Color3.fromRGB(15, 12, 28)
Lighting.ExposureCompensation = -0.2

local bloom = Lighting:FindFirstChildOfClass("BloomEffect") or Instance.new("BloomEffect", Lighting)
bloom.Intensity = 1.4
bloom.Size = 28
bloom.Threshold = 0.85`,
    fileSize: '5 KB',
    creator: {
      name: 'NeonShade',
      verified: true,
    },
    stats: {
      downloads: 7100,
      favorites: 2450,
      views: 29100,
    },
    format: 'PRESET',
    license: 'CC0 - Public Domain',
    updatedAt: '2026-10-21',
  },
  {
    id: 'skybox-cosmic-nebula',
    title: 'Deep Cosmic Nebula 8K Skybox',
    category: 'skyboxes',
    subcategory: 'Skyboxes',
    description: 'High-resolution space nebula skybox with glittering distant stars, purple and cyan stardust gas clouds, and seamless cubic borders.',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    tags: ['skybox', 'space', 'nebula', 'cosmic', 'stars'],
    robloxAssetId: '13912048591',
    downloadUrl: 'https://github.com/devmap-tools/assets/releases/download/v1.0/skybox_nebula.rbxm',
    fileSize: '12.0 MB',
    creator: {
      name: 'AstroLua',
      verified: true,
    },
    stats: {
      downloads: 5390,
      favorites: 1890,
      views: 21300,
    },
    format: 'RBXM',
    license: 'CC0 - Public Domain',
    updatedAt: '2026-10-14',
  },
  {
    id: 'sfx-map-ambience-pack',
    title: 'Map Soundscape: Wind, Rain & Cyber Hum',
    category: 'sfx',
    subcategory: 'Audio & Ambience',
    description: '10 seamlessly looping high-quality ambient sound effects for map developers. Includes gentle rain, heavy storm, eerie wind, and city neon hum.',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    tags: ['audio', 'sfx', 'ambience', 'rain', 'wind', 'loop'],
    robloxAssetId: '9114228941',
    downloadUrl: 'https://github.com/devmap-tools/assets/releases/download/v1.0/ambience_soundpack.zip',
    fileSize: '8.4 MB',
    creator: {
      name: 'SoundWave Studio',
      verified: true,
    },
    stats: {
      downloads: 3890,
      favorites: 1100,
      views: 14200,
    },
    format: 'AUDIO',
    license: 'Royalty-Free Commercial',
    updatedAt: '2026-10-10',
  },
  {
    id: 'ui-cyber-hud-kit',
    title: 'Minimalist Clean Developer HUD & ScreenGui',
    category: 'ui',
    subcategory: 'User Interface',
    description: 'Modern black-and-white sleek UI kit including Health/Stamina bars, clean Minimap frame, custom inventory slot grid, and prompt dialogues.',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    tags: ['ui', 'hud', 'screengui', 'darkmode', 'sleek'],
    robloxAssetId: '14299104821',
    downloadUrl: 'https://github.com/devmap-tools/assets/releases/download/v1.0/cyber_hud_kit.rbxm',
    fileSize: '2.1 MB',
    creator: {
      name: 'DevMapHQ',
      verified: true,
    },
    stats: {
      downloads: 11400,
      favorites: 3950,
      views: 41800,
    },
    format: 'RBXM',
    license: 'MIT License',
    updatedAt: '2026-10-24',
  },
];

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon Noir',
    description: 'Moody dark night with vibrant purple-cyan reflections and haze.',
    clockTime: 0.5,
    brightness: 1.2,
    outdoorAmbient: [35, 25, 55],
    ambient: [20, 20, 30],
    fogEnd: 350,
    fogColor: [15, 12, 28],
    exposureCompensation: -0.2,
    bloom: {
      intensity: 1.4,
      size: 28,
      threshold: 0.85,
    },
  },
  {
    id: 'golden-sunset',
    name: 'Golden Hour Cinematic',
    description: 'Rich warm orange tones, long dramatic shadows, and soft ambient light.',
    clockTime: 17.6,
    brightness: 2.4,
    outdoorAmbient: [140, 95, 60],
    ambient: [90, 60, 50],
    fogEnd: 1200,
    fogColor: [180, 110, 70],
    exposureCompensation: 0.1,
    bloom: {
      intensity: 0.8,
      size: 24,
      threshold: 0.9,
    },
  },
  {
    id: 'clean-daylight',
    name: 'Clean Studio Noon',
    description: 'Crisp, high-visibility neutral daylight ideal for showcase & building maps.',
    clockTime: 13.5,
    brightness: 3.0,
    outdoorAmbient: [130, 130, 130],
    ambient: [70, 70, 70],
    fogEnd: 2500,
    fogColor: [190, 210, 230],
    exposureCompensation: 0,
    bloom: {
      intensity: 0.3,
      size: 15,
      threshold: 0.95,
    },
  },
  {
    id: 'spooky-horror',
    name: 'Silent Hill Horror Mist',
    description: 'Dense cold fog, desolate greenish gloom, and claustrophobic sightlines.',
    clockTime: 23.0,
    brightness: 0.4,
    outdoorAmbient: [20, 30, 25],
    ambient: [10, 15, 12],
    fogEnd: 95,
    fogColor: [18, 26, 22],
    exposureCompensation: -0.5,
    bloom: {
      intensity: 0.2,
      size: 10,
      threshold: 0.98,
    },
  },
];

export const CODE_SNIPPETS: CodeSnippet[] = [
  {
    id: 'teleport-pad',
    title: 'Teleport Pad with Cooldown',
    category: 'Mechanics',
    description: 'Touch-based teleporter with safety debounce and visual flash effect.',
    code: `local pad = script.Parent
local TARGET_POSITION = Vector3.new(0, 50, 0)
local COOLDOWN_SECONDS = 3

local debounceList = {}

pad.Touched:Connect(function(hit)
    local character = hit.Parent
    local humanoid = character:FindFirstChildOfClass("Humanoid")
    local rootPart = character:FindFirstChild("HumanoidRootPart")
    
    if humanoid and rootPart and not debounceList[character] then
        debounceList[character] = true
        rootPart.CFrame = CFrame.new(TARGET_POSITION) + Vector3.new(0, 3, 0)
        
        task.wait(COOLDOWN_SECONDS)
        debounceList[character] = nil
    end
end)`,
  },
  {
    id: 'kill-brick-safe',
    title: 'Optimized Kill Brick (Hazard)',
    category: 'Gameplay',
    description: 'Instant eliminate hazard part with sanity checks and sound trigger.',
    code: `local hazardPart = script.Parent

hazardPart.Touched:Connect(function(hit)
    local char = hit.Parent
    local humanoid = char:FindFirstChildOfClass("Humanoid")
    if humanoid and humanoid.Health > 0 then
        humanoid.Health = 0
    end
end)`,
  },
  {
    id: 'zone-ambience',
    title: 'Sound Zone Region Detector',
    category: 'Audio',
    description: 'Fades in ambient background music when player steps into a map region.',
    code: `local zonePart = script.Parent
local sound = zonePart:FindFirstChildOfClass("Sound")
local TweenService = game:GetService("TweenService")
local Players = game:GetService("Players")

local localPlayer = Players.LocalPlayer
local fadeIn = TweenService:Create(sound, TweenInfo.new(1.5), {Volume = 0.7})
local fadeOut = TweenService:Create(sound, TweenInfo.new(1.5), {Volume = 0})

zonePart.Touched:Connect(function(hit)
    if hit.Parent == localPlayer.Character then
        if not sound.IsPlaying then sound:Play() end
        fadeIn:Play()
    end
end)

zonePart.TouchEnded:Connect(function(hit)
    if hit.Parent == localPlayer.Character then
        fadeOut:Play()
    end
end)`,
  },
  {
    id: 'leaderstats-currency',
    title: 'Server Leaderstats Setup (Data-ready)',
    category: 'Economy',
    description: 'Standard server script to initialize Coins & Level leaderstats folder on player join.',
    code: `local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player

    local coins = Instance.new("IntValue")
    coins.Name = "Coins"
    coins.Value = 100
    coins.Parent = leaderstats

    local level = Instance.new("IntValue")
    level.Name = "Level"
    level.Value = 1
    level.Parent = leaderstats
end)`,
  },
];
