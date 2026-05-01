let isOpen = false;
const listeners = new Set<(open: boolean) => void>();

export function openAttendanceModal() {
  isOpen = true;
  listeners.forEach((l) => l(true));
}

export function closeAttendanceModal() {
  isOpen = false;
  listeners.forEach((l) => l(false));
}

export function subscribeAttendanceModal(listener: (open: boolean) => void) {
  listeners.add(listener);
  listener(isOpen);
  return () => {
    listeners.delete(listener);
  };
}
