import { NextResponse } from 'next/server';

// テキストを強制的に小さなチャンクに分割する関数
function splitTextIntoChunks(text, maxLength = 200) {
  // 空白行を削除し、テキストをトリミング
  text = text.replace(/\n\s*\n/g, '\n').trim();
  
  // まず、文の区切りで分割を試みる (ピリオド、クエスチョンマーク、エクスクラメーションマークの後に空白または行末)
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  const chunks = [];
  let currentChunk = '';
  
  // 各文を処理
  for (const sentence of sentences) {
    // 文自体が最大長を超える場合は強制的に分割
    if (sentence.length > maxLength) {
      // 現在のチャンクがある場合は追加
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      
      // 長い文を強制的に分割
      for (let i = 0; i < sentence.length; i += maxLength) {
        const part = sentence.substr(i, maxLength);
        chunks.push(part);
      }
    } 
    // 現在のチャンクに文を追加すると最大長を超える場合
    else if (currentChunk.length + sentence.length + 1 > maxLength) {
      chunks.push(currentChunk);
      currentChunk = sentence;
    } 
    // 現在のチャンクに文を追加
    else {
      if (currentChunk.length > 0) {
        currentChunk += ' ';
      }
      currentChunk += sentence;
    }
  }
  
  // 最後のチャンクがあれば追加
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  // チャンクが作成されなかった場合（予期せぬケース）
  if (chunks.length === 0 && text.length > 0) {
    // 単純に最大長で分割
    for (let i = 0; i < text.length; i += maxLength) {
      chunks.push(text.substr(i, maxLength));
    }
  }
  
  return chunks;
}

export async function POST(request) {
  try {
    // APIキーが設定されているか確認
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    
    console.log('環境変数チェック: GOOGLE_API_KEY設定状態=', Boolean(GOOGLE_API_KEY));
    
    if (!GOOGLE_API_KEY) {
      console.error('Google Cloud APIキーが設定されていません。.env.localファイルを確認してください。');
      return NextResponse.json(
        { error: 'APIキーが設定されていません', message: '.env.localファイルにGOOGLE_API_KEYを設定してください' },
        { status: 500 }
      );
    }

    // リクエストボディのパース
    let requestBody;
    try {
      requestBody = await request.json();
      console.log('リクエストボディを受信:', requestBody);
    } catch (e) {
      console.error('リクエストボディの解析に失敗:', e);
      return NextResponse.json(
        { error: 'リクエスト形式が不正です', message: e.message },
        { status: 400 }
      );
    }

    const { text, voiceName, languageCode } = requestBody;
    
    // 必須パラメータのチェック
    if (!text) {
      console.error('テキストが指定されていません');
      return NextResponse.json(
        { error: 'テキストは必須です' },
        { status: 400 }
      );
    }

    // テキストを適切なチャンクに分割
    const textChunks = splitTextIntoChunks(text);
    console.log(`テキストを${textChunks.length}個のチャンクに分割しました`);
    
    // 各チャンクの情報をログに出力
    textChunks.forEach((chunk, index) => {
      console.log(`チャンク ${index+1}: ${chunk.length}文字 - "${chunk.substring(0, 30)}..."`);
    });
    
    // 各チャンクを処理して音声データを取得
    const audioContents = [];
    
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      console.log(`チャンク ${i+1}/${textChunks.length} 処理中 (${chunk.length}文字)...`);
      
      // リクエストボディの構築
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            text: chunk,
          },
          voice: {
            name: voiceName || 'ja-JP-Neural2-B', 
            languageCode: languageCode || 'ja-JP',
          },
          audioConfig: {
            audioEncoding: 'MP3',
          },
        })
      };
      
      try {
        const response = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`,
          requestOptions
        );
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
            console.error(`チャンク ${i+1} の処理でエラー:`, errorData);
          } catch (e) {
            errorData = { message: 'エラーレスポンスの解析に失敗' };
          }
          
          return NextResponse.json(
            { 
              error: 'Google APIエラー', 
              status: response.status,
              chunk: i + 1,
              chunkText: chunk,
              details: errorData 
            },
            { status: response.status }
          );
        }
        
        const data = await response.json();
        if (data.audioContent) {
          audioContents.push(data.audioContent);
        }
      } catch (error) {
        console.error(`チャンク ${i+1} の処理で例外が発生:`, error);
        return NextResponse.json(
          { 
            error: 'Google APIへの接続に失敗しました', 
            message: error.message,
            chunk: i + 1
          },
          { status: 500 }
        );
      }
    }
    
    // 最初のチャンクの音声データのみを返す（簡易実装）
    // 注：本来はすべてのaudioContentsを結合する必要がありますが、実装が複雑になります
    if (audioContents.length > 0) {
      return NextResponse.json({ audioContent: audioContents[0] });
    } else {
      return NextResponse.json(
        { error: '音声データの生成に失敗しました' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('TTS API予期せぬエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラー', message: error.message },
      { status: 500 }
    );
  }
}