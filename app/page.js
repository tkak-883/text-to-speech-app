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

  // 言語オプション
  const languageOptions = [
    { code: 'ja-JP', name: '日本語' },
    { code: 'en-US', name: '英語 (アメリカ)' },
    { code: 'en-GB', name: '英語 (イギリス)' },
    { code: 'zh-CN', name: '中国語 (簡体字)' },
    { code: 'ko-KR', name: '韓国語' }
  ];

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
        
        console.log('リクエストデータ:', reqData);
        
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
          console.error('API エラーレスポンス:', errorData);
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
    } else if (apiMode === 'google') {
      const audioElement = document.getElementById('audio-player');
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
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
    <div className="min-h-screen bg-gray-100">
      <main className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-center mb-8">テキスト読み上げアプリ</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
          {/* API選択タブ */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex">
              <button
                className={`py-2 px-4 font-medium ${apiMode === 'browser' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                onClick={() => setApiMode('browser')}
              >
                ブラウザAPI
              </button>
              <button
                className={`py-2 px-4 font-medium ${apiMode === 'google' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                onClick={() => setApiMode('google')}
              >
                Google Cloud API
              </button>
            </div>
          </div>
          
          {/* エラーメッセージ表示エリア */}
          {errorMessage && (
            <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
              <p>{errorMessage}</p>
            </div>
          )}
          
          {/* 言語選択 - 共通 */}
          <div className="mb-6">
            <label htmlFor="language-select" className="block text-gray-700 font-medium mb-2">
              言語
            </label>
            <select
              id="language-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {languageOptions.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* テキスト入力エリア - 共通 */}
          <div className="mb-6">
            <label htmlFor="text-input" className="block text-gray-700 font-medium mb-2">
              読み上げるテキスト
            </label>
            <textarea
              id="text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ここにテキストを入力してください"
              className="w-full h-40 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* ブラウザAPIの設定 */}
          {apiMode === 'browser' && (
            <>
              {!isSpeechSupported && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
                  <p>お使いのブラウザはWeb Speech APIをサポートしていません。</p>
                </div>
              )}
              
              <div className="mb-6">
                <label htmlFor="voice-select" className="block text-gray-700 font-medium mb-2">
                  音声
                </label>
                <select
                  id="voice-select"
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!isSpeechSupported}
                >
                  {getFilteredVoices().map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          
          {/* Google APIの設定 */}
          {apiMode === 'google' && (
            <>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="google-voice-select" className="block text-gray-700 font-medium">
                    Google音声
                  </label>
                  <button
                    onClick={fetchGoogleVoices}
                    className="text-sm text-blue-500 hover:text-blue-600"
                    disabled={isLoading}
                  >
                    音声リストを更新
                  </button>
                </div>
                
                {isLoading ? (
                  <div className="text-center py-3">
                    <p>読み込み中...</p>
                  </div>
                ) : (
                  <select
                    id="google-voice-select"
                    value={selectedGoogleVoice}
                    onChange={(e) => setSelectedGoogleVoice(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {getFilteredVoices().map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.languageCodes[0]})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              {/* 音声プレーヤー（Google APIのみ） */}
              {audioUrl && (
                <div className="mb-6">
                  <audio id="audio-player" controls className="w-full">
                    <source src={audioUrl} type="audio/mp3" />
                    お使いのブラウザはオーディオ要素をサポートしていません。
                  </audio>
                </div>
              )}
            </>
          )}
          
          {/* 操作ボタン - 共通 */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={speakText}
              disabled={(apiMode === 'browser' && (!isSpeechSupported || !text)) || 
                      (apiMode === 'google' && (!text || isLoading))}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? '処理中...' : '読み上げ'}
            </button>
            
            {apiMode === 'browser' && utterance && (
              <>
                <button
                  onClick={togglePause}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  {isPaused ? '再開' : '一時停止'}
                </button>
              </>
            )}
            
            {((apiMode === 'browser' && utterance) || (apiMode === 'google' && audioUrl)) && (
              <button
                onClick={stopSpeaking}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                停止
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}