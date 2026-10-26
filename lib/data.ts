import { Asset, LightingPreset, CodeSnippet } from '@/types';

export const ASSETS_DATA: Asset[] = [];

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
