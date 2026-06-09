import { RoomServiceClient, AgentDispatchClient } from 'livekit-server-sdk';

function getLiveKitUrl(): string {
  const url = process.env.LIVEKIT_URL;
  if (!url) throw new Error("Missing LIVEKIT_URL");
  return url.replace("wss://", "https://");
}

function getApiKey(): string {
  const key = process.env.LIVEKIT_API_KEY;
  if (!key) throw new Error("Missing LIVEKIT_API_KEY");
  return key;
}

function getApiSecret(): string {
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!secret) throw new Error("Missing LIVEKIT_API_SECRET");
  return secret;
}

// Lazy-initialized clients — only created at runtime when API routes are called,
// not at module evaluation during build.
let _roomService: RoomServiceClient | null = null;
let _agentDispatchClient: AgentDispatchClient | null = null;

export const roomService = {
  get listRooms() {
    if (!_roomService) {
      _roomService = new RoomServiceClient(getLiveKitUrl(), getApiKey(), getApiSecret());
    }
    return _roomService.listRooms.bind(_roomService);
  },
};

export const agentDispatchClient = {
  get createDispatch() {
    if (!_agentDispatchClient) {
      _agentDispatchClient = new AgentDispatchClient(getLiveKitUrl(), getApiKey(), getApiSecret());
    }
    return _agentDispatchClient.createDispatch.bind(_agentDispatchClient);
  },
};
