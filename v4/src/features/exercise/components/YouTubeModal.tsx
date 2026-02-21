// ================================================
// YouTubeModal - 운동 동영상 팝업
// YouTube iframe embed + 자동재생
// ================================================

import Modal from '@/shared/components/Modal';
import type { ExerciseItem } from '../data/exercises';

interface YouTubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: ExerciseItem | null;
}

export function YouTubeModal({ isOpen, onClose, exercise }: YouTubeModalProps) {
  if (!exercise) return null;

  const embedUrl = `https://www.youtube.com/embed/${exercise.videoId}?start=${exercise.startSeconds}&autoplay=1`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={exercise.name} size="lg">
      <div className="relative w-full aspect-video">
        {isOpen && (
          <iframe
            className="absolute inset-0 w-full h-full rounded-xl"
            src={embedUrl}
            title={exercise.name}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
        )}
      </div>
    </Modal>
  );
}
