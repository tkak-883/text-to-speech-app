'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [utterance, setUtterance] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [apiMode, setApiMode] = useState('browser'); // 'browser' または 'google'
  const [isLoading, setIsLoading] = useState(false);
  const [googleVoices, setGoogleVoices] = useState([]);
  const [selectedGoogleVoice, setSelectedGoogleVoice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('ja-JP'); // デフォルト言語
  const [textCount, setTextCount] = useState({ chars: 0, words: 0 });
  const [showControls, setShowControls] = useState(false); // コントロールの表示状態

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

  // Web Speech APIが利用可能かチェック
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setIsSpeechSupported(true);
      
      // 利用可能な音声を取得
      const synth = window.speechSynthesis;
      const updateVoices = () => {
        const availableVoices = synth.getVoices();
        setVoices(availableVoices);
        
        // 選択中の言語に合った音声があれば初期値として設定
        const langVoice = availableVoices.find(voice => voice.lang.includes(selectedLanguage));
        if (langVoice) {
          setSelectedVoice(langVoice.name);
        } else if (availableVoices.length > 0) {
          setSelectedVoice(availableVoices[0].name);
        }
      };
      
      updateVoices();
      
      // Chromeでは非同期で音声が読み込まれるため、イベントリスナーを追加
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

  // Google Cloud Text-to-Speech APIから音声リストを取得
  useEffect(() => {
    if (apiMode === 'google') {
      fetchGoogleVoices();
    } else {
      // APIモードが変わったらエラーメッセージをクリア
      setErrorMessage('');
    }
  }, [apiMode]);

  // 言語が変更されたら、その言語に合った音声を選択
  useEffect(() => {
    if (googleVoices.length > 0) {
      const langVoices = googleVoices.filter(v => v.languageCodes.includes(selectedLanguage));
      if (langVoices.length > 0) {
        setSelectedGoogleVoice(langVoices[0].name);
      }
    }
  }, [selectedLanguage, googleVoices]);

  const fetchGoogleVoices = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      // サーバーサイドAPIを呼び出して音声リストを取得
      const response = await fetch('/api/voices');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '音声リストの取得に失敗しました');
      }
      
      const data = await response.json();
      
      if (data.voices) {
        setGoogleVoices(data.voices);
        
        // 選択中の言語に合った音声を選択
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

  // サンプルテキストを設定
  const setSampleText = () => {
    setText(sampleTexts[selectedLanguage] || sampleTexts['en-US']);
  };

  // テキストを音声に変換する関数
  const speakText = async () => {
    if (!text) return;
    
    // エラーメッセージをクリア
    setErrorMessage('');
    
    if (apiMode === 'browser') {
      // ブラウザのWeb Speech APIを使用
      if (!isSpeechSupported) return;
      
      // 現在再生中のものを停止
      window.speechSynthesis.cancel();
      
      // 新しい発話オブジェクトを作成
      const newUtterance = new SpeechSynthesisUtterance(text);
      
      // 言語を設定
      newUtterance.lang = selectedLanguage;
      
      // 選択された音声を設定
      if (selectedVoice) {
        const voice = voices.find(v => v.name === selectedVoice);
        if (voice) {
          newUtterance.voice = voice;
        }
      }
      
      // 発話開始
      window.speechSynthesis.speak(newUtterance);
      setUtterance(newUtterance);
      setIsPaused(false);
      setShowControls(true);
    } else if (apiMode === 'google') {
      try {
        setIsLoading(true);
        
        // 音声ファイルのURLを設定している場合はクリア
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          setAudioUrl('');
        }
        
        // 選択された音声の言語コードを確認
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
        
        // サーバーサイドAPIを呼び出して音声生成
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(reqData)
        });
        
        // エラーレスポンスの詳細を取得
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.message || '音声生成に失敗しました');
        }
        
        const data = await response.json();
        
        if (data.audioContent) {
          // Base64エンコードされた音声データをデコード
          const binaryString = atob(data.audioContent);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Blobを作成してオーディオ要素のソースとして設定
          const blob = new Blob([bytes], { type: 'audio/mp3' });
          const url = URL.createObjectURL(blob);
          
          setAudioUrl(url);
          setShowControls(true);
          
          // オーディオ要素を取得して再生
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

  // 一時停止/再開 (ブラウザAPIのみ)
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

  // 言語フィルタリングされた音声リストを取得
  const getFilteredVoices = () => {
    if (apiMode === 'browser') {
      return voices.filter(voice => voice.lang.includes(selectedLanguage));
    } else {
      return googleVoices.filter(voice => voice.languageCodes && voice.languageCodes.includes(selectedLanguage));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-700 transform -skew-y-1"></div>
        <div className="absolute inset-0 opacity-30 max-w-full max-h-full overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSI2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjEiIGN5PSIxIiByPSIxIiBmaWxsPSIjZmZmIi8+PC9zdmc+')] bg-repeat bg-[length:6px_6px]"></div>
        </div>
        <div className="relative container mx-auto px-4 py-10 md:py-16">
          <div className="flex flex-col items-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tighter">
              テキスト読み上げアプリ
            </h1>
            <div className="h-1 w-20 bg-white/30 rounded-full mb-4"></div>
            <p className="text-lg text-indigo-100 max-w-md text-center">
              テキストを美しい音声に変換する、シンプルでエレガントなソリューション
            </p>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto py-12 px-4">
        <div className="bg-white backdrop-blur-sm bg-opacity-80 rounded-2xl shadow-2xl overflow-hidden max-w-3xl mx-auto border border-indigo-50 transform transition-all duration-300 hover:shadow-indigo-100">
          {/* API選択タブ */}
          <div className="flex border-b border-gray-100">
            <button
              className={`flex-1 py-4 px-6 font-medium transition-all duration-200 relative ${
                apiMode === 'browser' 
                ? 'text-indigo-700' 
                : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setApiMode('browser')}
            >
              <div className="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                ブラウザAPI
              </div>
              {apiMode === 'browser' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 transform transition-transform"></div>
              )}
            </button>
            <button
              className={`flex-1 py-4 px-6 font-medium transition-all duration-200 relative ${
                apiMode === 'google' 
                ? 'text-indigo-700' 
                : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setApiMode('google')}
            >
              <div className="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-4.5-8.599.75.75 0 011.5.049A3.5 3.5 0 1115 15" />
                </svg>
                Google Cloud API
              </div>
              {apiMode === 'google' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 transform transition-transform"></div>
              )}
            </button>
          </div>
          
          <div className="p-8">
            {/* エラーメッセージ表示エリア */}
            {errorMessage && (
              <div className="mb-8 bg-red-50 border-l-4 border-red-500 text-red-700 p-5 rounded-lg animate-fade-in">
                <div className="flex">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-red-500 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}
            
            {/* 言語選択 - 共通 */}
            <div className="mb-8 group">
              <label htmlFor="language-select" className="block text-gray-700 font-medium mb-2 flex items-center group-hover:text-indigo-700 transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-400 group-hover:text-indigo-600 transition-colors duration-200" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                言語を選択
              </label>
              <div className="relative">
                <select
                  id="language-select"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full p-4 pl-5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none bg-white shadow-sm hover:border-indigo-300"
                >
                  {languageOptions.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                  <svg className="h-4 w-4" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* テキスト入力エリア - 共通 */}
            <div className="mb-8 group">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="text-input" className="block text-gray-700 font-medium flex items-center group-hover:text-indigo-700 transition-colors duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-400 group-hover:text-indigo-600 transition-colors duration-200" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  読み上げるテキスト
                </label>
                <button 
                  onClick={setSampleText} 
                  className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors flex items-center group"
                >
                  <span className="relative overflow-hidden">
                    <span className="relative z-10">サンプル文を入力</span>
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-200 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 transform group-hover:translate-x-0.5 transition-transform" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
              <div className="relative">
                <textarea
                  id="text-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="ここにテキストを入力してください..."
                  className="w-full h-56 p-5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none text-gray-800 shadow-sm hover:border-indigo-300"
                ></textarea>
                <div className="absolute bottom-3 right-3 text-xs font-medium text-gray-400 px-2 py-1 bg-gray-50 rounded-md">
                  {textCount.chars}文字 / {textCount.words}単語
                </div>
              </div>
            </div>
            
            {/* ブラウザAPIの設定 */}
            {apiMode === 'browser' && (
              <>
                {!isSpeechSupported && (
                  <div className="mb-8 bg-amber-50 border-l-4 border-amber-500 text-amber-700 p-5 rounded-lg">
                    <div className="flex">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-amber-500 flex-shrink-0" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="leading-relaxed">お使いのブラウザはWeb Speech APIをサポートしていません。Google Cloud APIをお試しください。</p>
                    </div>
                  </div>
                )}
                
                <div className="mb-8 group">
                  <label htmlFor="voice-select" className="block text-gray-700 font-medium mb-2 flex items-center group-hover:text-indigo-700 transition-colors duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-400 group-hover:text-indigo-600 transition-colors duration-200" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    音声を選択
                  </label>
                  <div className="relative">
                    <select
                      id="voice-select"
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className="w-full p-4 pl-5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none bg-white shadow-sm hover:border-indigo-300"
                      disabled={!isSpeechSupported}
                    >
                      {getFilteredVoices().length === 0 ? (
                        <option value="">選択した言語の音声が見つかりません</option>
                      ) : (
                        getFilteredVoices().map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </option>
                        ))
                      )}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                      <svg className="h-4 w-4" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Google APIの設定 */}
            {apiMode === 'google' && (
              <>
                <div className="mb-8 group">
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="google-voice-select" className="block text-gray-700 font-medium flex items-center group-hover:text-indigo-700 transition-colors duration-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-400 group-hover:text-indigo-600 transition-colors duration-200" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      Google音声を選択
                    </label>
                    <button
                      onClick={fetchGoogleVoices}
                      className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors flex items-center group"
                      disabled={isLoading}
                    >
                      <span className="relative overflow-hidden">
                        <span className="relative z-10">音声リストを更新</span>
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-200 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ml-1 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  
                  {isLoading ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-8 flex justify-center items-center shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="relative w-8 h-8">
                          <div className="w-8 h-8 border-4 border-indigo-200 border-b-indigo-500 rounded-full animate-spin"></div>
                        </div>
                        <p className="text-gray-600 font-medium">音声リストを読み込んでいます...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        id="google-voice-select"
                        value={selectedGoogleVoice}
                        onChange={(e) => setSelectedGoogleVoice(e.target.value)}
                        className="w-full p-4 pl-5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none bg-white shadow-sm hover:border-indigo-300"
                      >
                        {getFilteredVoices().length === 0 ? (
                          <option value="">選択した言語の音声が見つかりません</option>
                        ) : (
                          getFilteredVoices().map((voice) => (
                            <option key={voice.name} value={voice.name}>
                              {voice.name} ({voice.languageCodes[0]})
                            </option>
                          ))
                        )}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                        <svg className="h-4 w-4" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 音声プレーヤー（Google APIのみ） */}
                {audioUrl && (
                  <div className="mb-8 bg-indigo-50 p-5 rounded-xl border border-indigo-100 shadow-inner transition-all duration-300">
                    <h3 className="text-sm font-medium text-indigo-700 mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-500" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      生成された音声
                    </h3>
                    <audio id="audio-player" controls className="w-full h-10 focus:outline-none">
                      <source src={audioUrl} type="audio/mp3" />
                      お使いのブラウザはオーディオ要素をサポートしていません。
                    </audio>
                  </div>
                )}
              </>
            )}
            
            {/* 操作ボタン - 共通 */}
            <div className={`flex flex-wrap gap-4 transition-all duration-500 ${!showControls ? 'flex-col sm:flex-row' : ''}`}>
              <button
                onClick={speakText}
                disabled={(apiMode === 'browser' && (!isSpeechSupported || !text)) || 
                        (apiMode === 'google' && (!text || isLoading))}
                className={`flex-1 flex items-center justify-center px-8 py-4 rounded-xl font-medium text-white transition-all ${
                  (apiMode === 'browser' && (!isSpeechSupported || !text)) || 
                  (apiMode === 'google' && (!text || isLoading))
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-indigo-200/50 transform hover:-translate-y-0.5'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="relative mr-2 w-5 h-5">
                      <div className="w-5 h-5 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
                    </div>
                    処理中...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    読み上げ
                  </>
                )}
              </button>
              
              {showControls && (
                <>
                  {apiMode === 'browser' && utterance && (
                    <button
                      onClick={togglePause}
                      className="flex-1 flex items-center justify-center px-8 py-4 bg-gray-700 hover:bg-gray-800 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-gray-300/30 transform hover:-translate-y-0.5"
                    >
                      {isPaused ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          再開
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          一時停止
                        </>
                      )}
                    </button>
                  )}
                  
                  {((apiMode === 'browser' && utterance) || (apiMode === 'google' && audioUrl)) && (
                    <button
                      onClick={stopSpeaking}
                      className="flex-1 flex items-center justify-center px-8 py-4 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-red-200/50 transform hover:-translate-y-0.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                      停止
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* 使い方ガイド */}
        <div className="mt-16 bg-white backdrop-blur-sm bg-opacity-80 rounded-2xl shadow-xl overflow-hidden max-w-3xl mx-auto border border-indigo-50 transform transition-all duration-300 hover:shadow-indigo-100">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              使い方ガイド
            </h2>
            <div className="space-y-5">
              <div className="flex items-start hover:bg-indigo-50 p-3 rounded-xl transition-colors duration-200 transform -translate-x-2 hover:translate-x-0">
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold mr-4">1</div>
                <div>
                  <p className="text-gray-800 font-medium">言語を選択します</p>
                  <p className="text-sm text-gray-600 mt-1">読み上げるテキストの言語を選択してください。各言語に対応した音声が自動的にフィルタリングされます。</p>
                </div>
              </div>
              <div className="flex items-start hover:bg-indigo-50 p-3 rounded-xl transition-colors duration-200 transform -translate-x-2 hover:translate-x-0">
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold mr-4">2</div>
                <div>
                  <p className="text-gray-800 font-medium">テキストを入力します</p>
                  <p className="text-sm text-gray-600 mt-1">読み上げたいテキストを入力するか、「サンプル文を入力」ボタンをクリックして言語に合ったサンプルテキストを使用してください。</p>
                </div>
              </div>
              <div className="flex items-start hover:bg-indigo-50 p-3 rounded-xl transition-colors duration-200 transform -translate-x-2 hover:translate-x-0">
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold mr-4">3</div>
                <div>
                  <p className="text-gray-800 font-medium">音声を選択します</p>
                  <p className="text-sm text-gray-600 mt-1">使用したい音声を選択してください。選択した言語に対応する音声のみが表示されます。音声によって発音や自然さが異なる場合があります。</p>
                </div>
              </div>
              <div className="flex items-start hover:bg-indigo-50 p-3 rounded-xl transition-colors duration-200 transform -translate-x-2 hover:translate-x-0">
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold mr-4">4</div>
                <div>
                  <p className="text-gray-800 font-medium">「読み上げ」ボタンをクリックします</p>
                  <p className="text-sm text-gray-600 mt-1">テキストが音声に変換され、再生されます。Google APIモードでは生成された音声をダウンロードすることもできます。一時停止や停止のコントロールが表示されます。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-10 mt-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 max-w-full max-h-full overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSI2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjEiIGN5PSIxIiByPSIxIiBmaWxsPSIjZmZmIi8+PC9zdmc+')] bg-repeat bg-[length:6px_6px]"></div>
        </div>
        <div className="container mx-auto px-6 relative">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h3 className="text-xl font-bold mb-2">テキスト読み上げアプリ</h3>
              <p className="text-gray-400 text-sm max-w-md">このアプリはブラウザのWeb Speech APIとGoogle Cloud Text-to-Speech APIを使用しています。複数の言語とさまざまな音声に対応しています。</p>
            </div>
            <div className="flex flex-col items-center md:items-end">
              <div className="flex space-x-4 mb-4">
                <a href="#" className="text-white hover:text-indigo-300 transition-colors">
                  <svg className="h-4 w-4" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a href="#" className="text-white hover:text-indigo-300 transition-colors">
                  <svg className="h-4 w-4" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.028 10.028 0 01-3.127 1.184 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.83 4.996 4.996 0 01-2.212.085 4.937 4.937 0 004.604 3.417 9.868 9.868 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.054 0 13.999-7.496 13.999-13.986 0-.209 0-.42-.015-.63a9.936 9.936 0 002.46-2.548l-.047-.02z"/></svg>
                </a>
              </div>
              <p className="text-gray-400 text-sm">© 2025 テキスト読み上げアプリ</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}