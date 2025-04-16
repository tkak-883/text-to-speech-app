'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  // 状態管理
  const [text, setText] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [utterance, setUtterance] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [apiMode, setApiMode] = useState('browser');
  const [isLoading, setIsLoading] = useState(false);
  const [googleVoices, setGoogleVoices] = useState([]);
  const [selectedGoogleVoice, setSelectedGoogleVoice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('ja-JP');
  const [textCount, setTextCount] = useState({ chars: 0, words: 0 });
  const [showControls, setShowControls] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);

  // 言語オプション
  const languageOptions = [
    { code: 'ja-JP', name: '日本語' },
    { code: 'en-US', name: '英語 (アメリカ)' },
    { code: 'en-GB', name: '英語 (イギリス)' },
    { code: 'zh-CN', name: '中国語 (簡体字)' },
    { code: 'ko-KR', name: '韓国語' }
  ];

  // サンプルテキスト
  const sampleTexts = {
    'ja-JP': 'こんにちは、素晴らしい一日ですね。このテキスト読み上げアプリを使えば、テキストを簡単に音声に変換できます。',
    'en-US': 'Hello, it\'s a wonderful day. With this text-to-speech app, you can easily convert text to speech.',
    'en-GB': 'Good day! This text-to-speech application allows you to transform written text into spoken words with ease.',
    'zh-CN': '你好，今天是美好的一天。使用这个文本转语音应用程序，您可以轻松地将文本转换为语音。',
    'ko-KR': '안녕하세요, 오늘은 멋진 날입니다. 이 텍스트 음성 변환 앱을 사용하면 텍스트를 쉽게 음성으로 변환할 수 있습니다.'
  };

  // Web Speech APIチェック
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setIsSpeechSupported(true);
      
      const synth = window.speechSynthesis;
      const updateVoices = () => {
        const availableVoices = synth.getVoices();
        setVoices(availableVoices);
        
        const langVoice = availableVoices.find(voice => voice.lang.includes(selectedLanguage));
        if (langVoice) {
          setSelectedVoice(langVoice.name);
        } else if (availableVoices.length > 0) {
          setSelectedVoice(availableVoices[0].name);
        }
      };
      
      updateVoices();
      
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = updateVoices;
      }
      
      return () => {
        if (speechSynthesis.onvoiceschanged !== undefined) {
          speechSynthesis.onvoiceschanged = null;
        }
      };
    }
  }, [selectedLanguage]);

  // テキスト文字数カウント
  useEffect(() => {
    const charCount = text.length;
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    setTextCount({ chars: charCount, words: wordCount });
  }, [text]);

  // Google音声リスト取得
  useEffect(() => {
    if (apiMode === 'google') {
      fetchGoogleVoices();
    } else {
      setErrorMessage('');
    }
  }, [apiMode]);

  // 言語変更時の音声更新
  useEffect(() => {
    if (googleVoices.length > 0) {
      const langVoices = googleVoices.filter(v => v.languageCodes.includes(selectedLanguage));
      if (langVoices.length > 0) {
        setSelectedGoogleVoice(langVoices[0].name);
      }
    }
  }, [selectedLanguage, googleVoices]);

  // Google音声リスト取得関数
  const fetchGoogleVoices = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await fetch('/api/voices');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '音声リストの取得に失敗しました');
      }
      
      const data = await response.json();
      
      if (data.voices) {
        setGoogleVoices(data.voices);
        
        const langVoices = data.voices.filter(v => v.languageCodes.includes(selectedLanguage));
        if (langVoices.length > 0) {
          setSelectedGoogleVoice(langVoices[0].name);
        } else if (data.voices.length > 0) {
          setSelectedGoogleVoice(data.voices[0].name);
        }
      } else {
        throw new Error('音声データが見つかりませんでした');
      }
    } catch (error) {
      console.error('Error fetching Google voices:', error);
      setErrorMessage(`Google音声の取得に失敗しました: ${error.message}。サーバー側のAPIキー設定を確認してください。`);
    } finally {
      setIsLoading(false);
    }
  };

  // サンプルテキスト設定
  const setSampleText = () => {
    setText(sampleTexts[selectedLanguage] || sampleTexts['en-US']);
  };

  // 音声変換
  const speakText = async () => {
    if (!text) return;
    
    setErrorMessage('');
    
    if (apiMode === 'browser') {
      if (!isSpeechSupported) return;
      
      window.speechSynthesis.cancel();
      
      const newUtterance = new SpeechSynthesisUtterance(text);
      
      newUtterance.lang = selectedLanguage;
      
      if (selectedVoice) {
        const voice = voices.find(v => v.name === selectedVoice);
        if (voice) {
          newUtterance.voice = voice;
        }
      }
      
      window.speechSynthesis.speak(newUtterance);
      setUtterance(newUtterance);
      setIsPaused(false);
      setShowControls(true);
    } else if (apiMode === 'google') {
      try {
        setIsLoading(true);
        
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          setAudioUrl('');
        }
        
        let voiceLangCode = selectedLanguage;
        if (selectedGoogleVoice) {
          const voice = googleVoices.find(v => v.name === selectedGoogleVoice);
          if (voice && voice.languageCodes && voice.languageCodes.length > 0) {
            voiceLangCode = voice.languageCodes[0];
          }
        }
        
        const reqData = {
          text: text,
          voiceName: selectedGoogleVoice,
          languageCode: voiceLangCode
        };
        
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(reqData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.message || '音声生成に失敗しました');
        }
        
        const data = await response.json();
        
        if (data.audioContent) {
          const binaryString = atob(data.audioContent);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const blob = new Blob([bytes], { type: 'audio/mp3' });
          const url = URL.createObjectURL(blob);
          
          setAudioUrl(url);
          setShowControls(true);
          
          const audioElement = document.getElementById('audio-player');
          if (audioElement) {
            audioElement.load();
            audioElement.play();
          }
        } else {
          throw new Error('音声データが返されませんでした');
        }
      } catch (error) {
        console.error('Error with Google TTS API:', error);
        setErrorMessage(`音声生成に失敗しました: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 一時停止/再開
  const togglePause = () => {
    if (!utterance) return;
    
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  // 停止
  const stopSpeaking = () => {
    if (apiMode === 'browser') {
      window.speechSynthesis.cancel();
      setUtterance(null);
      setIsPaused(false);
      setShowControls(false);
    } else if (apiMode === 'google') {
      const audioElement = document.getElementById('audio-player');
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      setShowControls(false);
    }
  };

  // 言語に合った音声の取得
  const getFilteredVoices = () => {
    if (apiMode === 'browser') {
      return voices.filter(voice => voice.lang.includes(selectedLanguage));
    } else {
      return googleVoices.filter(voice => voice.languageCodes && voice.languageCodes.includes(selectedLanguage));
    }
  };

  return (
    <div className="max-w-3xl mx-auto min-h-screen px-4 py-6 md:py-12 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* ヘッダー */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          テキスト読み上げアプリ
        </h1>
      </header>

      {/* メインコンテンツ */}
      <main className="space-y-6">
        {/* エラーメッセージ */}
        {errorMessage && (
          <div className="p-3 rounded-md bg-red-50 border-l-4 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* APIモード選択 */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="text-sm font-medium mb-3">APIの選択</h2>
          <div className="flex space-x-3">
            <button
              onClick={() => setApiMode('browser')}
              className={`px-3 py-2 text-sm rounded-md flex items-center ${
                apiMode === 'browser'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              ブラウザAPI
            </button>
            <button
              onClick={() => setApiMode('google')}
              className={`px-3 py-2 text-sm rounded-md flex items-center ${
                apiMode === 'google'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-4.5-8.599.75.75 0 011.5.049A3.5 3.5 0 1115 15" />
              </svg>
              Google Cloud API
            </button>
          </div>
        </div>

        {/* メインフォーム */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-5">
          {/* 言語選択 */}
          <div>
            <label htmlFor="language-select" className="block text-sm font-medium mb-1">
              言語
            </label>
            <select
              id="language-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 text-sm"
            >
              {languageOptions.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* テキスト入力 */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="text-input" className="block text-sm font-medium">
                テキスト
              </label>
              <button 
                onClick={setSampleText} 
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800"
              >
                サンプルを入力
              </button>
            </div>
            <div className="relative">
              <textarea
                id="text-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="ここにテキストを入力してください..."
                className="w-full h-32 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 text-sm"
              ></textarea>
              <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400">
                {textCount.chars}文字
              </div>
            </div>
          </div>

          {/* 音声選択 */}
          <div>
            {apiMode === 'browser' && !isSpeechSupported && (
              <div className="mb-2 p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300 text-xs">
                お使いのブラウザはWeb Speech APIをサポートしていません。Google Cloud APIをお試しください。
              </div>
            )}

            <div className="flex justify-between items-center mb-1">
              <label htmlFor="voice-select" className="block text-sm font-medium">
                音声
              </label>
              {apiMode === 'google' && (
                <button
                  onClick={fetchGoogleVoices}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  更新
                </button>
              )}
            </div>

            {isLoading && apiMode === 'google' ? (
              <div className="h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-md">
                <svg className="animate-spin h-4 w-4 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">読み込み中...</span>
              </div>
            ) : (
              <select
                id={apiMode === 'browser' ? "voice-select" : "google-voice-select"}
                value={apiMode === 'browser' ? selectedVoice : selectedGoogleVoice}
                onChange={(e) => apiMode === 'browser' ? setSelectedVoice(e.target.value) : setSelectedGoogleVoice(e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 text-sm"
                disabled={apiMode === 'browser' && !isSpeechSupported}
              >
                {getFilteredVoices().length === 0 ? (
                  <option value="">選択した言語の音声が見つかりません</option>
                ) : (
                  getFilteredVoices().map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang || voice.languageCodes?.[0]})
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* オーディオプレーヤー（Google APIのみ） */}
          {apiMode === 'google' && audioUrl && (
            <div className="mt-4">
              <audio id="audio-player" controls className="w-full h-8">
                <source src={audioUrl} type="audio/mp3" />
                お使いのブラウザはオーディオ要素をサポートしていません。
              </audio>
            </div>
          )}
        </div>

        {/* コントロール */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={speakText}
            disabled={(apiMode === 'browser' && (!isSpeechSupported || !text)) || 
                      (apiMode === 'google' && (!text || isLoading))}
            className={`flex-1 flex items-center justify-center px-4 py-3 rounded-md shadow-sm text-white font-medium ${
              (apiMode === 'browser' && (!isSpeechSupported || !text)) || 
              (apiMode === 'google' && (!text || isLoading))
                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
            }`}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            読み上げる
          </button>

          {showControls && (
            <>
              {apiMode === 'browser' && utterance && (
                <button
                  onClick={togglePause}
                  className="flex-1 flex items-center justify-center px-4 py-3 rounded-md shadow-sm text-white font-medium bg-gray-600 hover:bg-gray-700"
                >
                  {isPaused ? (
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {isPaused ? '再開' : '一時停止'}
                </button>
              )}
              
              {((apiMode === 'browser' && utterance) || (apiMode === 'google' && audioUrl)) && (
                <button
                  onClick={stopSpeaking}
                  className="flex-1 flex items-center justify-center px-4 py-3 rounded-md shadow-sm text-white font-medium bg-red-600 hover:bg-red-700"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  停止
                </button>
              )}
            </>
          )}
        </div>

        {/* シンプルな使い方ガイド */}
        <details className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <summary className="text-sm font-medium cursor-pointer focus:outline-none">
            使い方ガイド
          </summary>
          <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>① 言語を選択してください。</p>
            <p>② テキストを入力するか、サンプルを使用してください。</p>
            <p>③ 音声を選択してください。</p>
            <p>④ 「読み上げる」ボタンをクリックしてください。</p>
          </div>
        </details>
      </main>

      <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
        © 2025 テキスト読み上げアプリ
      </footer>
    </div>
  );
}