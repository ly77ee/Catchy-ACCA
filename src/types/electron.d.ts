export interface ElectronAPI {
  isDesktop: boolean;
  platform: string;
  getAppInfo: () => Promise<{
    name: string;
    version: string;
    platform: string;
    userDataPath: string;
  }>;
  openExternal: (url: string) => Promise<boolean>;
  getUserDataPath: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
