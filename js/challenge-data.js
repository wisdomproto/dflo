// 챌린지 데이터
const challengeData = {
    exercise: {
        posture: [
            {
                id: 'neck-stretch',
                title: '목 스트레칭',
                description: '일자목과 거북목을 예방하고 개선하는 스트레칭',
                icon: '🦒',
                videoUrl: 'https://www.youtube.com/watch?v=-DULXNYk3Sg&t=42s',
                category: 'posture'
            },
            {
                id: 'back-stretch',
                title: '등 스트레칭',
                description: '굽은 등을 펴고 상체 자세를 바로잡는 스트레칭',
                icon: '🧘',
                videoUrl: 'https://www.youtube.com/watch?v=-DULXNYk3Sg&t=117s',
                category: 'posture'
            },
            {
                id: 'abs-stretch',
                title: '복부 스트레칭',
                description: '복부 근육을 이완하고 유연성을 높이는 스트레칭',
                icon: '💪',
                videoUrl: 'https://www.youtube.com/watch?v=RzuXWJJf7bY&t=52s',
                category: 'posture'
            },
            {
                id: 'side-stretch',
                title: '옆구리 스트레칭',
                description: '옆구리 근육을 풀어주고 척추 유연성을 높이는 스트레칭',
                icon: '🤸',
                videoUrl: 'https://www.youtube.com/watch?v=cBYdbmVwB0E&t=135s',
                category: 'posture'
            },
            {
                id: 'back-muscle',
                title: '등 근육 운동',
                description: '등 근육을 강화하여 바른 자세를 유지하는 운동',
                icon: '🏋️',
                videoUrl: 'https://www.youtube.com/watch?v=U62yLjlBSE8&t=219s',
                category: 'posture'
            },
            {
                id: 'hamstring-stretch',
                title: '허벅지 뒤 스트레칭',
                description: '허벅지 뒤쪽 근육을 이완하는 스트레칭',
                icon: '🦵',
                videoUrl: 'https://www.youtube.com/watch?v=RzuXWJJf7bY&t=128s',
                category: 'posture'
            },
            {
                id: 'hip-stretch',
                title: '엉덩이 스트레칭',
                description: '엉덩이 근육을 풀어주고 골반 정렬을 돕는 스트레칭',
                icon: '🍑',
                videoUrl: 'https://www.youtube.com/watch?v=kcgO4-ifJqE&t=47s',
                category: 'posture'
            },
            {
                id: 'quad-stretch',
                title: '허벅지 앞 스트레칭',
                description: '허벅지 앞쪽 근육을 이완하는 스트레칭',
                icon: '🦴',
                videoUrl: 'https://www.youtube.com/watch?v=cBYdbmVwB0E&t=48s',
                category: 'posture'
            },
            {
                id: 'glute-exercise',
                title: '엉덩이 근육 운동',
                description: '엉덩이 근육을 강화하여 하체를 안정화하는 운동',
                icon: '💪',
                videoUrl: 'https://www.youtube.com/watch?v=bqjB7pRbIfw&t=230s',
                category: 'posture'
            }
        ],
        growth: [
            {
                id: 'jump-rope',
                title: '줄넘기',
                description: '성장판을 자극하고 심폐 지구력을 향상시키는 운동',
                icon: '🪢',
                category: 'growth'
            },
            {
                id: 'spot-jump',
                title: '제자리 뛰기',
                description: '간단하지만 효과적인 성장판 자극 운동',
                icon: '🏃',
                category: 'growth'
            },
            {
                id: 'step-jump',
                title: '계단 점프',
                description: '계단이나 스텝박스를 이용한 점프 운동',
                icon: '📦',
                category: 'growth'
            },
            {
                id: 'jumping-jack',
                title: '제자리 팔벌려뛰기',
                description: '전신 운동과 성장판 자극을 동시에 하는 운동',
                icon: '🤸',
                category: 'growth'
            }
        ]
    },
    diet: [
        {
            id: 'calcium',
            title: '칼슘 섭취',
            description: '우유, 치즈, 요구르트 등 칼슘이 풍부한 음식 섭취',
            icon: '🥛'
        },
        {
            id: 'vegetables',
            title: '채소 먹기',
            description: '다양한 색깔의 채소를 골고루 섭취',
            icon: '🥗'
        },
        {
            id: 'protein',
            title: '단백질 섭취',
            description: '고기, 생선, 달걀, 콩류 등 단백질 음식 섭취',
            icon: '🍗'
        },
        {
            id: 'fruits',
            title: '과일 먹기',
            description: '비타민이 풍부한 신선한 과일 섭취',
            icon: '🍎'
        },
        {
            id: 'water',
            title: '물 마시기',
            description: '하루 6-8잔의 물을 충분히 마시기',
            icon: '💧'
        },
        {
            id: 'breakfast',
            title: '아침식사',
            description: '건강한 하루를 위한 영양가 있는 아침식사',
            icon: '🍳'
        }
    ],
    sleep: [
        {
            id: 'sleep-time',
            title: '일정한 수면시간',
            description: '매일 같은 시간에 자고 일어나기',
            icon: '⏰'
        },
        {
            id: 'enough-sleep',
            title: '충분한 수면',
            description: '9-10시간 이상 충분히 자기',
            icon: '😴'
        },
        {
            id: 'no-phone',
            title: '자기 전 스마트폰 그만하기',
            description: '잠들기 1시간 전부터 스마트폰, 게임 안하기',
            icon: '📱'
        },
        {
            id: 'dark-room',
            title: '어두운 환경',
            description: '불을 끄고 어두운 환경에서 자기',
            icon: '🌙'
        },
        {
            id: 'comfortable',
            title: '편안한 침구',
            description: '편안한 베개와 이불로 숙면 환경 만들기',
            icon: '🛏️'
        }
    ]
};
