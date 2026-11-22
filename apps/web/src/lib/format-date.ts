export const formatDate = (at: string | null) =>
  at ? new Date(at).toLocaleDateString("ko-KR") : null;
