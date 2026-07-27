export interface TimelineItem {
  id: string;
  start: number;
  duration: number;
}

/** Какой элемент (если есть) активен в момент `t`, плюс смещение внутри его
 * собственного источника — используется, чтобы выбрать активный
 * <video>/<audio> и выставить ему нужный currentTime. И для видео-лейна
 * (последовательного), и для аудио-лейнов (независимо позиционированных). */
export function activeItemAt(items: TimelineItem[], t: number): { item: TimelineItem; offset: number } | null {
  for (const item of items) {
    if (t >= item.start && t < item.start + item.duration) {
      return { item, offset: t - item.start };
    }
  }
  return null;
}

/** Раскладывает клипы видео-лейна ПОДРЯД (start каждого = сумма длительностей
 * предыдущих) — в отличие от аудио-лейнов, где `start` независим и хранится
 * как есть (см. ReelTimeline.tsx). */
export function layoutSequential(items: { id: string; duration: number }[]): TimelineItem[] {
  let t = 0;
  return items.map((it) => {
    const withStart = { ...it, start: t };
    t += it.duration;
    return withStart;
  });
}

/** Общая длительность таймлайна — максимум "хвоста" среди видео-лейна
 * (последовательного) и всех аудио-элементов (независимо позиционированных). */
export function totalDuration(video: TimelineItem[], audioLanes: TimelineItem[][]): number {
  const videoEnd = video.reduce((m, it) => Math.max(m, it.start + it.duration), 0);
  const audioEnd = audioLanes.flat().reduce((m, it) => Math.max(m, it.start + it.duration), 0);
  return Math.max(videoEnd, audioEnd);
}
