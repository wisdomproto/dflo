/** 성장 운동 프로그램 - 운동 목록 + YouTube 링크 */

export interface ExerciseItem {
  id: string;
  name: string;
  category: '스트레칭' | '근육운동';
  videoId: string;
  startSeconds: number;
}

export const EXERCISES: ExerciseItem[] = [
  { id: 'neck-stretch',      name: '목 스트레칭',        category: '스트레칭', videoId: '-DULXNYk3Sg', startSeconds: 42 },
  { id: 'back-stretch',      name: '등 스트레칭',        category: '스트레칭', videoId: '-DULXNYk3Sg', startSeconds: 117 },
  { id: 'abdomen-stretch',   name: '복부 스트레칭',      category: '스트레칭', videoId: 'RzuXWJJf7bY', startSeconds: 52 },
  { id: 'side-stretch',      name: '옆구리 스트레칭',    category: '스트레칭', videoId: 'cBYdbmVwB0E', startSeconds: 135 },
  { id: 'back-muscle',       name: '등 근육운동',        category: '근육운동', videoId: 'U62yLjlBSE8', startSeconds: 219 },
  { id: 'hamstring-stretch', name: '허벅지 뒤 스트레칭', category: '스트레칭', videoId: 'RzuXWJJf7bY', startSeconds: 128 },
  { id: 'hip-stretch',       name: '엉덩이 스트레칭',    category: '스트레칭', videoId: 'kcgO4-ifJqE', startSeconds: 47 },
  { id: 'quad-stretch',      name: '허벅지 앞 스트레칭', category: '스트레칭', videoId: 'cBYdbmVwB0E', startSeconds: 48 },
  { id: 'glute-muscle',      name: '엉덩이 근육 운동',   category: '근육운동', videoId: 'bqjB7pRbIfw', startSeconds: 230 },
];
