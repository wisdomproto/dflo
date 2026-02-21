// Firebase Functions를 사용한 Gemini API 프록시
// functions/index.js

const functions = require('firebase-functions');
const fetch = require('node-fetch');

const GEMINI_API_KEY = functions.config().gemini.key; // Firebase 환경 변수

exports.geminiProxy = functions.https.onRequest(async (req, res) => {
    // CORS 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    // POST만 허용
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }

    try {
        const { message } = req.body;

        // Gemini API 호출
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: message }]
                    }]
                })
            }
        );

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Gemini API 오류:', error);
        res.status(500).json({ error: error.message });
    }
});

// Firebase Functions 설정 명령어:
// firebase functions:config:set gemini.key="YOUR_GEMINI_API_KEY"
// firebase deploy --only functions
