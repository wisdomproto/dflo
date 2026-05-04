// ================================================
// YouTubeModal - 운동 동영상 팝업
// YouTube iframe embed + 자동재생
// ================================================

import Modal from '@/shared/components/Modal';
import { parseYouTubeUrl } from '@/features/exercise/services/exerciseService';
import type { Exercise } from '@/shared/types';

interface YouTubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise | null;
}

export function YouTubeModal({ isOpen, onClose, exercise }: YouTubeModalProps) {
  if (!exercise) return null;
  const parsed = parseYouTubeUrl(exercise.youtube_url);
  if (!parsed) return null;

  const embedUrl = `https://www.youtube.com/embed/${parsed.videoId}?start=${parsed.startSeconds}&autoplay=1`;

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
