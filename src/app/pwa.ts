import { registerSW } from 'virtual:pwa-register';
import { create } from 'zustand';

// registerType 'prompt': when a new version is installed it waits; the UpdateToast offers to switch now or later.
type UpdateState = { ready: boolean; apply: () => void; dismiss: () => void };
export const useUpdate = create<UpdateState>()((set) => ({ ready: false, apply: () => undefined, dismiss: () => set({ ready: false }) }));

export function registerPwa(): void {
  if (!('serviceWorker' in navigator)) return;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => useUpdate.setState({ ready: true, apply: () => void updateSW(true) }),
  });
}
