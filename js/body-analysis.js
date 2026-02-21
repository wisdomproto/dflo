// ================================================
// 체형 분석 JavaScript
// ================================================

// 전역 변수
let videoElement, canvasElement, resultCanvas;
let pose, camera;
let currentDirection = null; // 'front' or 'side'
let capturedImageData = null;
let analysisResult = null;
let currentFacingMode = 'environment'; // 'user' (전면) 또는 'environment' (후면) - 기본: 후면

// Supabase 클라이언트 (config.js에서 로드) - 현재는 테스트 모드
// DB 연동은 추후 구현 예정
const USE_DB = false; // 테스트용: false로 설정
let supabaseClient = null;

if (USE_DB && typeof CONFIG !== 'undefined') {
    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    console.log('✅ Supabase 연결됨');
} else {
    console.log('ℹ️ 테스트 모드 - DB 저장 비활성화');
}

// ================================================
// 초기화
// ================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ 체형 분석 페이지 로드');
    
    videoElement = document.getElementById('videoElement');
    canvasElement = document.getElementById('canvasElement');
    resultCanvas = document.getElementById('resultCanvas');
    
    // 브라우저 환경 체크
    checkBrowserCompatibility();
    
    // 이전 분석 기록 로드
    loadHistory();
});

// ================================================
// 브라우저 호환성 체크
// ================================================
function checkBrowserCompatibility() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // getUserMedia 지원 체크
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ getUserMedia를 지원하지 않는 브라우저입니다.');
        alert('⚠️ 이 브라우저는 카메라 기능을 지원하지 않습니다.\n\n크롬(Chrome) 또는 사파리(Safari) 브라우저를 사용해주세요.');
        return;
    }
    
    // 삼성 인터넷 브라우저 감지
    if (userAgent.includes('samsungbrowser')) {
        console.log('📱 삼성 인터넷 브라우저 감지됨');
        console.log('ℹ️ 삼성 인터넷에서는 간단한 카메라 설정을 사용합니다.');
    }
    
    // HTTPS 체크
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        console.warn('⚠️ HTTPS가 아닌 환경입니다. 카메라가 작동하지 않을 수 있습니다.');
    }
    
    console.log('✅ 브라우저 호환성 체크 완료');
    console.log('User Agent:', navigator.userAgent);
    console.log('Protocol:', location.protocol);
}

// ================================================
// 방향 선택
// ================================================
function selectDirection(direction) {
    currentDirection = direction;
    console.log('📍 선택된 방향:', direction);
    
    // 버튼 활성화
    document.querySelectorAll('.btn-direction').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.btn-direction').classList.add('active');
    
    // 카메라 섹션 표시
    document.getElementById('cameraSection').style.display = 'block';
    
    // 가이드 라인 업데이트
    updateGuideLines(direction);
    
    // 카메라 시작
    startCamera();
}

// ================================================
// 가이드 라인 업데이트
// ================================================
function updateGuideLines(direction) {
    const guideText = document.querySelector('.guide-text');
    
    if (direction === 'front') {
        guideText.textContent = '정면을 보고 가이드 라인에 맞춰 서주세요';
    } else {
        guideText.textContent = '옆모습이 보이도록 서주세요 (귀와 어깨가 보여야 합니다)';
    }
}

// ================================================
// 카메라 시작
// ================================================
async function startCamera() {
    try {
        console.log('📷 카메라 시작...');
        
        // 기존 스트림 정리
        if (videoElement.srcObject) {
            const tracks = videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoElement.srcObject = null;
        }
        
        // HTTPS 체크
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            alert('⚠️ 카메라는 보안 연결(HTTPS)에서만 사용할 수 있습니다.\n\n현재 주소: ' + location.protocol + '//' + location.hostname);
            return;
        }
        
        // 단계별 폴백 전략: facingMode를 우선 시도
        const constraintsList = [
            // 1단계: facingMode를 ideal로 지정 (후면 카메라 우선)
            {
                video: { 
                    facingMode: { ideal: currentFacingMode }
                },
                audio: false
            },
            // 2단계: facingMode를 문자열로 지정
            {
                video: { 
                    facingMode: currentFacingMode 
                },
                audio: false
            },
            // 3단계: facingMode + 낮은 해상도
            {
                video: {
                    facingMode: { ideal: currentFacingMode },
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            },
            // 4단계: 가장 간단한 설정
            {
                video: true,
                audio: false
            },
            // 5단계: 최소 해상도
            {
                video: {
                    width: { ideal: 320 },
                    height: { ideal: 240 }
                },
                audio: false
            }
        ];
        
        let stream = null;
        let lastError = null;
        
        // 각 설정을 순차적으로 시도
        for (let i = 0; i < constraintsList.length; i++) {
            try {
                console.log(`📱 카메라 권한 요청 중... (시도 ${i + 1}/${constraintsList.length})`);
                console.log('Constraints:', constraintsList[i]);
                
                stream = await navigator.mediaDevices.getUserMedia(constraintsList[i]);
                console.log(`✅ 카메라 스트림 획득 성공! (시도 ${i + 1})`);
                break; // 성공하면 루프 탈출
                
            } catch (err) {
                console.warn(`⚠️ 시도 ${i + 1} 실패:`, err.name, err.message);
                lastError = err;
                
                // 마지막 시도가 아니면 계속
                if (i < constraintsList.length - 1) {
                    console.log('다음 설정으로 재시도...');
                    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms 대기
                }
            }
        }
        
        // 모든 시도 실패
        if (!stream) {
            throw lastError || new Error('카메라 스트림을 가져올 수 없습니다.');
        }
        
        videoElement.srcObject = stream;
        
        // 비디오 속성 설정
        videoElement.muted = true; // 자동 재생을 위해 음소거 필수
        
        // 비디오 재생 대기
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('비디오 로딩 타임아웃'));
            }, 10000); // 10초 타임아웃
            
            videoElement.onloadedmetadata = async () => {
                clearTimeout(timeout);
                console.log('📹 비디오 메타데이터 로드 완료');
                console.log('비디오 크기:', videoElement.videoWidth, 'x', videoElement.videoHeight);
                
                try {
                    // 명시적으로 재생
                    await videoElement.play();
                    console.log('▶️ 비디오 재생 시작');
                    resolve();
                } catch (playError) {
                    console.error('❌ 비디오 재생 실패:', playError);
                    reject(playError);
                }
            };
            
            // 에러 핸들링
            videoElement.onerror = (error) => {
                clearTimeout(timeout);
                console.error('❌ 비디오 로드 에러:', error);
                reject(new Error('비디오를 로드할 수 없습니다.'));
            };
        });
        
        console.log('✅ 카메라 스트림 연결 완료');
        
        // MediaPipe Pose 초기화
        await initMediaPipe();
        
        console.log('✅ 카메라 시작 완료');
        
    } catch (error) {
        console.error('❌ 카메라 시작 실패:', error);
        
        let errorMessage = '카메라를 사용할 수 없습니다.\n\n';
        
        if (error.name === 'NotAllowedError') {
            errorMessage += '🚫 카메라 권한이 거부되었습니다.\n\n해결 방법:\n';
            errorMessage += '1. 브라우저 주소창 옆의 자물쇠 아이콘을 클릭\n';
            errorMessage += '2. "카메라" 권한을 "허용"으로 변경\n';
            errorMessage += '3. 페이지를 새로고침하세요';
        } else if (error.name === 'NotFoundError') {
            errorMessage += '📷 카메라를 찾을 수 없습니다.\n\n';
            errorMessage += '기기에 카메라가 있는지 확인해주세요.';
        } else if (error.name === 'NotReadableError') {
            errorMessage += '⚠️ 카메라를 사용할 수 없습니다.\n\n';
            errorMessage += '주요 원인:\n';
            errorMessage += '• 다른 앱/탭에서 카메라 사용 중\n';
            errorMessage += '• 하드웨어 충돌\n\n';
            errorMessage += '해결 방법:\n';
            errorMessage += '1. 모든 브라우저 탭 닫기\n';
            errorMessage += '2. Zoom, 카톡 영상통화 등 종료\n';
            errorMessage += '3. 크롬(Chrome) 브라우저에서 시도\n';
            errorMessage += '4. 기기 재시작';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage += '⚙️ 카메라 설정을 지원하지 않습니다.\n\n';
            errorMessage += '다른 브라우저(크롬)에서 시도해보세요.';
        } else if (error.name === 'TypeError') {
            errorMessage += '🌐 getUserMedia API를 지원하지 않습니다.\n\n';
            errorMessage += '최신 브라우저(크롬, 사파리)를 사용해주세요.';
        } else {
            errorMessage += `오류: ${error.name || 'Unknown'}\n${error.message}`;
        }
        
        alert(errorMessage);
    }
}

// ================================================
// MediaPipe 초기화 (Legacy API - 안정적)
// ================================================
async function initMediaPipe() {
    console.log('🤖 MediaPipe 초기화 중...');
    
    try {
        // Pose API 확인
        if (typeof Pose === 'undefined') {
            throw new Error('MediaPipe Pose API가 로드되지 않았습니다.');
        }
        
        console.log('✅ Pose API 로드 확인');
        
        // Pose 생성
        pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });
        
        // 옵션 설정
        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        // 결과 콜백 설정
        pose.onResults(onPoseResults);
        
        console.log('✅ MediaPipe Pose 설정 완료');
        
        // Camera 사용하지 않고 직접 비디오 처리
        startVideoProcessing();
        
        console.log('✅ MediaPipe 초기화 완료');
        
    } catch (error) {
        console.error('❌ MediaPipe 초기화 실패:', error);
        console.error('에러 상세:', error.stack);
        
        let errorMsg = 'MediaPipe 초기화에 실패했습니다.\n\n';
        errorMsg += '오류: ' + error.message + '\n\n';
        errorMsg += '해결 방법:\n';
        errorMsg += '1. 페이지를 새로고침하세요\n';
        errorMsg += '2. 네트워크 연결을 확인하세요\n';
        errorMsg += '3. 크롬 브라우저에서 시도하세요';
        
        alert(errorMsg);
    }
}

// ================================================
// 비디오 프레임 처리 (Camera Utils 사용 안 함)
// ================================================
let animationId = null;

async function startVideoProcessing() {
    console.log('🎬 비디오 프레임 처리 시작');
    
    async function processFrame() {
        // 비디오가 준비되지 않았으면 대기
        if (!videoElement || videoElement.readyState !== 4) {
            animationId = requestAnimationFrame(processFrame);
            return;
        }
        
        try {
            // Pose 감지 (Camera Utils 없이 직접 처리)
            await pose.send({image: videoElement});
        } catch (error) {
            console.error('프레임 처리 오류:', error);
        }
        
        // 다음 프레임 요청
        animationId = requestAnimationFrame(processFrame);
    }
    
    // 시작
    processFrame();
}

// ================================================
// Pose 결과 처리
// ================================================
function onPoseResults(results) {
    // Canvas 설정
    const ctx = canvasElement.getContext('2d');
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // 랜드마크 그리기
    if (results.poseLandmarks) {
        drawLandmarks(ctx, results.poseLandmarks, canvasElement.width, canvasElement.height);
    }
}

// ================================================
// 카메라 전환 (전면/후면)
// ================================================
async function switchCamera() {
    try {
        console.log('🔄 카메라 전환 중...');
        
        // 비디오 프레임 처리 중지
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
            console.log('⏸️ 비디오 처리 중지');
        }
        
        // 기존 스트림 완전히 중지
        if (videoElement.srcObject) {
            const tracks = videoElement.srcObject.getTracks();
            tracks.forEach(track => {
                track.stop();
                console.log('🛑 트랙 중지:', track.kind, track.label);
            });
            videoElement.srcObject = null;
        }
        
        // facingMode 토글
        const oldMode = currentFacingMode;
        currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        console.log(`📱 ${oldMode} → ${currentFacingMode}`);
        
        // 잠시 대기 (카메라 리소스 해제 대기)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 카메라 재시작
        await startCamera();
        
        const cameraName = currentFacingMode === 'user' ? '전면' : '후면';
        console.log(`✅ ${cameraName} 카메라로 전환 완료`);
        
    } catch (error) {
        console.error('❌ 카메라 전환 실패:', error);
        alert('카메라 전환에 실패했습니다.\n\n다시 시도하거나 페이지를 새로고침해주세요.');
    }
}

// ================================================
// 랜드마크 그리기
// ================================================
function drawLandmarks(ctx, landmarks, width, height) {
    // 주요 연결선 그리기
    const connections = [
        [11, 12], // 어깨
        [23, 24], // 골반
        [11, 23], // 왼쪽 몸통
        [12, 24], // 오른쪽 몸통
        [11, 13], // 왼쪽 팔
        [12, 14], // 오른쪽 팔
        [23, 25], // 왼쪽 다리
        [24, 26]  // 오른쪽 다리
    ];
    
    // 선 그리기
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    
    connections.forEach(([start, end]) => {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];
        
        if (startPoint && endPoint) {
            ctx.beginPath();
            ctx.moveTo(startPoint.x * width, startPoint.y * height);
            ctx.lineTo(endPoint.x * width, endPoint.y * height);
            ctx.stroke();
        }
    });
    
    // 점 그리기
    ctx.fillStyle = '#667eea';
    landmarks.forEach((landmark) => {
        const x = landmark.x * width;
        const y = landmark.y * height;
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
    });
}

// ================================================
// 사진 촬영
// ================================================
async function capturePhoto() {
    console.log('📸 사진 촬영');
    
    // 로딩 표시
    document.getElementById('loadingOverlay').style.display = 'flex';
    
    try {
        // Canvas에 현재 프레임 캡처
        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = videoElement.videoWidth;
        captureCanvas.height = videoElement.videoHeight;
        const ctx = captureCanvas.getContext('2d');
        
        // 비디오 프레임 그리기
        ctx.drawImage(videoElement, 0, 0);
        
        // 이미지 데이터 저장
        capturedImageData = captureCanvas.toDataURL('image/jpeg', 0.9);
        
        // MediaPipe로 분석
        await analyzePhoto(captureCanvas);
        
        // 카메라 중지
        stopCamera();
        
        // 결과 표시
        showResult();
        
    } catch (error) {
        console.error('❌ 사진 촬영 실패:', error);
        alert('사진 촬영에 실패했습니다. 다시 시도해주세요.');
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

// ================================================
// 사진 분석
// ================================================
async function analyzePhoto(canvas) {
    console.log('🔍 사진 분석 중...');
    
    // MediaPipe로 랜드마크 추출
    const results = await pose.send({ image: canvas });
    
    if (!results || !results.poseLandmarks) {
        throw new Error('자세를 감지할 수 없습니다. 전신이 보이도록 다시 촬영해주세요.');
    }
    
    const landmarks = results.poseLandmarks;
    
    // 방향별 분석
    if (currentDirection === 'front') {
        analysisResult = analyzeFrontPose(landmarks);
    } else {
        analysisResult = analyzeSidePose(landmarks);
    }
    
    console.log('✅ 분석 완료:', analysisResult);
}

// ================================================
// 정면 자세 분석
// ================================================
function analyzeFrontPose(landmarks) {
    const result = {
        direction: 'front',
        items: []
    };
    
    // 1. 어깨 기울기
    const shoulderAnalysis = calculateShoulderTilt(landmarks);
    result.items.push({
        title: '어깨 기울기',
        value: `${Math.abs(shoulderAnalysis.angle).toFixed(1)}°`,
        status: shoulderAnalysis.status,
        description: getShoulderDescription(shoulderAnalysis.status)
    });
    
    // 2. 골반 기울기
    const hipAnalysis = calculateHipTilt(landmarks);
    result.items.push({
        title: '골반 기울기',
        value: `${Math.abs(hipAnalysis.angle).toFixed(1)}°`,
        status: hipAnalysis.status,
        description: getHipDescription(hipAnalysis.status)
    });
    
    // 3. 종합 평가
    result.summary = generateFrontSummary(shoulderAnalysis, hipAnalysis);
    
    return result;
}

// ================================================
// 측면 자세 분석
// ================================================
function analyzeSidePose(landmarks) {
    const result = {
        direction: 'side',
        items: []
    };
    
    // 1. 거북목 분석
    const neckAnalysis = calculateForwardHeadPosture(landmarks);
    result.items.push({
        title: '거북목 정도',
        value: `${Math.abs(neckAnalysis.angle).toFixed(1)}°`,
        status: neckAnalysis.status,
        description: getNeckDescription(neckAnalysis.status)
    });
    
    // 2. 어깨 전방 돌출
    const shoulderForwardAnalysis = calculateShoulderForward(landmarks);
    result.items.push({
        title: '어깨 자세',
        value: shoulderForwardAnalysis.distance.toFixed(2),
        status: shoulderForwardAnalysis.status,
        description: getShoulderForwardDescription(shoulderForwardAnalysis.status)
    });
    
    // 3. 종합 평가
    result.summary = generateSideSummary(neckAnalysis, shoulderForwardAnalysis);
    
    return result;
}

// ================================================
// 어깨 기울기 계산
// ================================================
function calculateShoulderTilt(landmarks) {
    const leftShoulder = landmarks[11];  // LEFT_SHOULDER
    const rightShoulder = landmarks[12]; // RIGHT_SHOULDER
    
    const deltaY = rightShoulder.y - leftShoulder.y;
    const deltaX = rightShoulder.x - leftShoulder.x;
    
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    
    return {
        angle: angle,
        heightDiff: Math.abs(deltaY),
        status: getShoulderStatus(Math.abs(angle))
    };
}

function getShoulderStatus(absAngle) {
    if (absAngle < 2) return 'normal';
    if (absAngle < 5) return 'mild';
    if (absAngle < 10) return 'moderate';
    return 'severe';
}

function getShoulderDescription(status) {
    const descriptions = {
        'normal': '어깨가 수평을 유지하고 있습니다. 좋은 자세입니다! 👍',
        'mild': '어깨가 약간 기울어져 있습니다. 평소 자세를 주의해주세요.',
        'moderate': '어깨 기울기가 다소 심합니다. 스트레칭과 자세 교정이 필요합니다.',
        'severe': '어깨 기울기가 심각합니다. 전문가의 상담을 권장합니다.'
    };
    return descriptions[status] || '';
}

// ================================================
// 골반 기울기 계산
// ================================================
function calculateHipTilt(landmarks) {
    const leftHip = landmarks[23];  // LEFT_HIP
    const rightHip = landmarks[24]; // RIGHT_HIP
    
    const deltaY = rightHip.y - leftHip.y;
    const deltaX = rightHip.x - leftHip.x;
    
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    
    return {
        angle: angle,
        heightDiff: Math.abs(deltaY),
        status: getHipStatus(Math.abs(angle))
    };
}

function getHipStatus(absAngle) {
    if (absAngle < 2) return 'normal';
    if (absAngle < 5) return 'mild';
    if (absAngle < 10) return 'moderate';
    return 'severe';
}

function getHipDescription(status) {
    const descriptions = {
        'normal': '골반이 수평을 유지하고 있습니다. 좋은 자세입니다! 👍',
        'mild': '골반이 약간 기울어져 있습니다. 평소 자세를 주의해주세요.',
        'moderate': '골반 기울기가 다소 심합니다. 운동과 자세 교정이 필요합니다.',
        'severe': '골반 기울기가 심각합니다. 전문가의 상담을 권장합니다.'
    };
    return descriptions[status] || '';
}

// ================================================
// 거북목 분석
// ================================================
function calculateForwardHeadPosture(landmarks) {
    const ear = landmarks[7]; // LEFT_EAR (측면)
    const shoulder = landmarks[11]; // LEFT_SHOULDER
    
    const horizontalDist = Math.abs(ear.x - shoulder.x);
    const verticalDist = Math.abs(ear.y - shoulder.y);
    
    const angle = Math.atan2(horizontalDist, verticalDist) * (180 / Math.PI);
    
    return {
        distance: horizontalDist,
        angle: angle,
        status: getForwardHeadStatus(angle)
    };
}

function getForwardHeadStatus(angle) {
    if (angle < 10) return 'normal';
    if (angle < 15) return 'mild';
    if (angle < 20) return 'moderate';
    return 'severe';
}

function getNeckDescription(status) {
    const descriptions = {
        'normal': '목 자세가 정상입니다. 좋은 자세를 유지하세요! 👍',
        'mild': '약간의 거북목이 보입니다. 스마트폰 사용 시 자세를 주의하세요.',
        'moderate': '거북목이 다소 진행되었습니다. 목 스트레칭을 권장합니다.',
        'severe': '거북목이 심각합니다. 전문가의 상담을 권장합니다.'
    };
    return descriptions[status] || '';
}

// ================================================
// 어깨 전방 돌출 분석
// ================================================
function calculateShoulderForward(landmarks) {
    const shoulder = landmarks[11]; // LEFT_SHOULDER
    const hip = landmarks[23]; // LEFT_HIP
    
    const distance = Math.abs(shoulder.x - hip.x);
    
    return {
        distance: distance,
        status: getShoulderForwardStatus(distance)
    };
}

function getShoulderForwardStatus(distance) {
    if (distance < 0.05) return 'normal';
    if (distance < 0.1) return 'mild';
    if (distance < 0.15) return 'moderate';
    return 'severe';
}

function getShoulderForwardDescription(status) {
    const descriptions = {
        'normal': '어깨 자세가 정상입니다. 좋습니다! 👍',
        'mild': '어깨가 약간 앞으로 말려 있습니다. 가슴 펴기 운동을 권장합니다.',
        'moderate': '어깨가 많이 앞으로 말려 있습니다. 자세 교정이 필요합니다.',
        'severe': '라운드 숄더가 심각합니다. 전문가의 상담을 권장합니다.'
    };
    return descriptions[status] || '';
}

// ================================================
// 종합 평가 생성
// ================================================
function generateFrontSummary(shoulder, hip) {
    const issues = [];
    
    if (shoulder.status !== 'normal') {
        issues.push('어깨 기울기');
    }
    if (hip.status !== 'normal') {
        issues.push('골반 기울기');
    }
    
    if (issues.length === 0) {
        return {
            title: '✅ 정상',
            text: '체형이 균형을 잘 유지하고 있습니다. 현재의 좋은 자세를 계속 유지하세요!'
        };
    } else {
        return {
            title: '⚠️ 주의 필요',
            text: `${issues.join(', ')}에서 불균형이 발견되었습니다. 평소 자세를 주의하고, 필요시 전문가의 상담을 받으세요.`
        };
    }
}

function generateSideSummary(neck, shoulder) {
    const issues = [];
    
    if (neck.status !== 'normal') {
        issues.push('거북목');
    }
    if (shoulder.status !== 'normal') {
        issues.push('라운드 숄더');
    }
    
    if (issues.length === 0) {
        return {
            title: '✅ 정상',
            text: '측면 자세가 좋습니다. 현재의 바른 자세를 계속 유지하세요!'
        };
    } else {
        return {
            title: '⚠️ 주의 필요',
            text: `${issues.join(', ')} 증상이 보입니다. 스마트폰 사용 시간을 줄이고, 목과 어깨 스트레칭을 권장합니다.`
        };
    }
}

// ================================================
// 결과 표시
// ================================================
function showResult() {
    // 카메라 섹션 숨김
    document.getElementById('cameraSection').style.display = 'none';
    
    // 결과 섹션 표시
    const resultSection = document.getElementById('resultSection');
    resultSection.style.display = 'block';
    
    // 캡처된 이미지 표시
    document.getElementById('capturedImage').src = capturedImageData;
    
    // 결과 카드 생성
    const resultCards = document.getElementById('resultCards');
    resultCards.innerHTML = '';
    
    analysisResult.items.forEach(item => {
        const card = document.createElement('div');
        card.className = `result-card ${item.status}`;
        card.innerHTML = `
            <div class="result-card-title">${item.title}</div>
            <div class="result-card-value">${item.value}</div>
            <div class="result-card-status">${getStatusLabel(item.status)}</div>
            <div class="result-card-desc">${item.description}</div>
        `;
        resultCards.appendChild(card);
    });
    
    // 종합 의견
    const summaryBox = document.getElementById('summaryBox');
    summaryBox.innerHTML = `
        <h3>${analysisResult.summary.title}</h3>
        <p>${analysisResult.summary.text}</p>
    `;
    
    // 스크롤 이동
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

function getStatusLabel(status) {
    const labels = {
        'normal': '정상 ✅',
        'mild': '경미 ⚠️',
        'moderate': '주의 ⚠️⚠️',
        'severe': '심각 🚨'
    };
    return labels[status] || status;
}

// ================================================
// 카메라 중지
// ================================================
function stopCamera() {
    if (camera) {
        camera.stop();
    }
    
    if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
    }
}

// ================================================
// 다시 찍기
// ================================================
function retakePhoto() {
    location.reload();
}

// ================================================
// 새로 분석
// ================================================
function newAnalysis() {
    location.reload();
}

// ================================================
// 결과 저장
// ================================================
async function saveResult() {
    if (!USE_DB) {
        // 테스트 모드: localStorage에 저장
        console.log('💾 테스트 모드: localStorage에 저장');
        
        try {
            // 기존 데이터 가져오기
            const historyData = JSON.parse(localStorage.getItem('body_analysis_history') || '[]');
            
            // 새 데이터 추가
            const newData = {
                id: Date.now(),
                direction: analysisResult.direction,
                analysis_data: analysisResult,
                image_data: capturedImageData,
                created_at: new Date().toISOString()
            };
            
            historyData.unshift(newData);
            
            // 최대 10개까지만 저장
            if (historyData.length > 10) {
                historyData.pop();
            }
            
            localStorage.setItem('body_analysis_history', JSON.stringify(historyData));
            
            alert('✅ 분석 결과가 로컬에 저장되었습니다! (테스트 모드)');
            
            // 히스토리 새로고침
            loadHistory();
            
        } catch (error) {
            console.error('❌ 저장 실패:', error);
            alert('저장에 실패했습니다.');
        }
        return;
    }
    
    // DB 모드 (추후 구현)
    try {
        console.log('💾 결과 저장 중...');
        
        // 로그인 확인
        const userJson = sessionStorage.getItem(window.SESSION_KEY);
        if (!userJson) {
            alert('로그인이 필요합니다.');
            return;
        }
        
        const user = JSON.parse(userJson);
        
        // 선택된 아이 확인
        const selectedChildId = localStorage.getItem('selectedChildId');
        if (!selectedChildId) {
            alert('아이를 선택해주세요.');
            return;
        }
        
        // 데이터 준비
        const data = {
            user_id: user.id,
            child_id: selectedChildId,
            direction: analysisResult.direction,
            analysis_data: JSON.stringify(analysisResult),
            image_data: capturedImageData,
            created_at: new Date().toISOString()
        };
        
        // Supabase에 저장
        const { error } = await supabase
            .from('body_analysis')
            .insert([data]);
        
        if (error) throw error;
        
        alert('✅ 분석 결과가 저장되었습니다!');
        
        // 히스토리 새로고침
        loadHistory();
        
    } catch (error) {
        console.error('❌ 저장 실패:', error);
        alert('저장에 실패했습니다. 다시 시도해주세요.');
    }
}

// ================================================
// 결과 공유
// ================================================
function shareResult() {
    if (navigator.share) {
        navigator.share({
            title: 'LPCare 체형 분석 결과',
            text: analysisResult.summary.text,
        }).catch(err => console.log('공유 취소:', err));
    } else {
        alert('이 기기에서는 공유 기능을 사용할 수 없습니다.');
    }
}

// ================================================
// 히스토리 로드
// ================================================
async function loadHistory() {
    const historyList = document.getElementById('historyList');
    
    if (!USE_DB) {
        // 테스트 모드: localStorage에서 로드
        try {
            const historyData = JSON.parse(localStorage.getItem('body_analysis_history') || '[]');
            
            historyList.innerHTML = '';
            
            if (historyData.length === 0) {
                historyList.innerHTML = '<p style="text-align: center; color: #999;">아직 분석 기록이 없습니다.</p>';
                return;
            }
            
            historyData.forEach(item => {
                const div = document.createElement('div');
                div.className = 'history-item';
                div.onclick = () => viewHistoryItem(item);
                
                const date = new Date(item.created_at).toLocaleDateString('ko-KR');
                const direction = item.direction === 'front' ? '정면' : '측면';
                
                div.innerHTML = `
                    <div class="history-date">${date} - ${direction} 분석</div>
                    <div class="history-summary">분석 결과 보기 →</div>
                `;
                
                historyList.appendChild(div);
            });
            
        } catch (error) {
            console.error('❌ 히스토리 로드 실패:', error);
            historyList.innerHTML = '<p style="text-align: center; color: #999;">기록을 불러올 수 없습니다.</p>';
        }
        return;
    }
    
    // DB 모드 (추후 구현)
    try {
        const selectedChildId = localStorage.getItem('selectedChildId');
        if (!selectedChildId) return;
        
        const { data, error } = await supabase
            .from('body_analysis')
            .select('*')
            .eq('child_id', selectedChildId)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        historyList.innerHTML = '';
        
        if (!data || data.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: #999;">아직 분석 기록이 없습니다.</p>';
            return;
        }
        
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.onclick = () => viewHistoryItem(item);
            
            const date = new Date(item.created_at).toLocaleDateString('ko-KR');
            const direction = item.direction === 'front' ? '정면' : '측면';
            
            div.innerHTML = `
                <div class="history-date">${date} - ${direction} 분석</div>
                <div class="history-summary">분석 결과 보기 →</div>
            `;
            
            historyList.appendChild(div);
        });
        
    } catch (error) {
        console.error('❌ 히스토리 로드 실패:', error);
    }
}

// ================================================
// 히스토리 항목 보기
// ================================================
function viewHistoryItem(item) {
    // 저장된 분석 결과 복원
    capturedImageData = item.image_data;
    
    if (USE_DB) {
        analysisResult = JSON.parse(item.analysis_data);
    } else {
        analysisResult = item.analysis_data;
    }
    
    // 결과 표시
    showResult();
}

// ================================================
// 히스토리 모달 표시
// ================================================
function showHistory() {
    // 히스토리 모달이 있다면 표시
    const historySection = document.getElementById('historySection');
    if (historySection) {
        historySection.scrollIntoView({ behavior: 'smooth' });
    }
}

// ================================================
// 기록 삭제
// ================================================
function deleteRecord(recordId) {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;
    
    if (!USE_DB) {
        // localStorage에서 삭제
        try {
            const historyData = JSON.parse(localStorage.getItem('body_analysis_history') || '[]');
            const filtered = historyData.filter(item => item.id !== recordId);
            localStorage.setItem('body_analysis_history', JSON.stringify(filtered));
            loadHistory();
        } catch (error) {
            console.error('❌ 기록 삭제 실패:', error);
        }
    } else {
        // DB에서 삭제 (추후 구현)
        console.log('DB 삭제 기능은 추후 구현 예정');
    }
}

// ================================================
// 기록 보기
// ================================================
function viewRecord(recordId) {
    if (!USE_DB) {
        // localStorage에서 찾기
        try {
            const historyData = JSON.parse(localStorage.getItem('body_analysis_history') || '[]');
            const record = historyData.find(item => item.id === recordId);
            if (record) {
                viewHistoryItem(record);
            }
        } catch (error) {
            console.error('❌ 기록 로드 실패:', error);
        }
    } else {
        // DB에서 로드 (추후 구현)
        console.log('DB 로드 기능은 추후 구현 예정');
    }
}

// ================================================
// 뒤로 가기
// ================================================
function goBack() {
    window.history.back();
}

// ================================================
// 전역 함수 등록 (HTML onclick에서 접근 가능하도록)
// ================================================
window.selectDirection = selectDirection;
window.switchCamera = switchCamera;
window.capturePhoto = capturePhoto;
window.retakePhoto = retakePhoto;
window.saveResult = saveResult;
window.showHistory = showHistory;
window.deleteRecord = deleteRecord;
window.viewRecord = viewRecord;
window.goBack = goBack;

console.log('✅ body-analysis.js 로드 완료');
