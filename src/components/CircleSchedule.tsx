"use client";

import React, { useState, Fragment, useEffect } from 'react';

interface Event {
  start: number;
  end: number;
  event: string;
  color: string;
}

interface History {
  past: Event[][];
  future: Event[][];
}

// パステルカラーのリスト
const pastelColors = [
  '#FFB3BA', // パステルピンク
  '#BAFFC9', // パステルグリーン
  '#BAE1FF', // パステルブルー
  '#FFE4B5', // パステルオレンジ
  '#E0BBE4', // パステルパープル
  '#957DAD', // ラベンダー
  '#FEC8D8', // ライトピンク
  '#D4F0F0', // パステルターコイズ
  '#FFDFD3', // パステルピーチ
  '#B5EAD7'  // ミントグリーン
];

// テンプレートの色を配列のインデックス順に設定
const templates = {
  empty: [],
  workday: [
    { start: 22, end: 6, event: '就寝', color: pastelColors[0] },
    { start: 6, end: 7, event: '起床・準備', color: pastelColors[1] },
    { start: 7, end: 8, event: '朝食', color: pastelColors[2] },
    { start: 8, end: 9, event: '通勤', color: pastelColors[3] },
    { start: 9, end: 18, event: '仕事', color: pastelColors[4] },
    { start: 18, end: 19, event: '通勤', color: pastelColors[5] },
    { start: 19, end: 20, event: '夕食', color: pastelColors[6] },
    { start: 20, end: 22, event: '自由時間', color: pastelColors[7] },
  ],
  weekend: [
    { start: 22, end: 6, event: '就寝', color: pastelColors[0] },
    { start: 6, end: 8, event: '起床・準備', color: pastelColors[1] },
    { start: 8, end: 9, event: '朝食', color: pastelColors[2] },
    { start: 9, end: 10, event: '自由時間', color: pastelColors[3] },
    { start: 10, end: 12, event: '趣味', color: pastelColors[4] },
    { start: 12, end: 13, event: '昼食', color: pastelColors[5] },
    { start: 13, end: 18, event: '自由時間', color: pastelColors[6] },
    { start: 18, end: 19, event: '夕食', color: pastelColors[7] },
    { start: 19, end: 22, event: '趣味', color: pastelColors[8] },
  ]
};

// 新しい色を取得する関数を追加
const getNextColor = (events: Event[]) => {
  if (events.length === 0) return pastelColors[0];
  const lastColorIndex = pastelColors.indexOf(events[events.length - 1].color);
  const nextIndex = (lastColorIndex + 1) % pastelColors.length;
  return pastelColors[nextIndex];
};

// 色を再割り当てする関数を追加
const reassignColors = (eventList: Event[]) => {
  return eventList.map((event, index) => ({
    ...event,
    color: pastelColors[index % pastelColors.length]
  }));
};

const CircleSchedule = () => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  const [events, setEvents] = useState<Event[]>(() => {
    const saved = localStorage.getItem('schedule');
    return saved ? JSON.parse(saved) : templates.workday;  // デフォルトで平日テンプレートを使用
  });
  const [history, setHistory] = useState<History>({
    past: [],
    future: []
  });
  const [leftWidth, setLeftWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);

  // ウィンドウサイズの変更を監視
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // リサイズハンドラーを追加
  const handleResizeStart = () => {
    setIsResizing(true);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // 最小幅は400px、最大幅は画面の80%に変更
      const minWidth = 400;
      const maxWidth = Math.min(window.innerWidth * 0.8, 1200);  // 最大値を1200pxに拡大
      
      const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX));
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // 時間選択肢の生成を修正
  const timeOptions = [
    // 最初の0:00を追加
    { label: '00:00', value: 0 },
    // 0:30から23:30までを生成
    ...Array.from({ length: 47 }, (_, i) => {
      const hour = Math.floor((i + 1) / 2);
      const minute = (i + 1) % 2 === 0 ? '00' : '30';
      const value = hour + ((i + 1) % 2 === 0 ? 0 : 0.5);
      return { 
        label: `${hour.toString().padStart(2, '0')}:${minute}`,
        value
      };
    }),
    // 最後に24:00（0:00）を追加
    { label: '24:00', value: 24 }
  ];

  const calculateArc = (startHour: number, endHour: number, radius: number) => {
    // 開始時刻と終了時刻が同じ場合は24時間として扱う
    if (startHour === endHour) {
      return `M ${center} ${center}
              m ${-radius} 0
              a ${radius} ${radius} 0 1 1 ${radius * 2} 0
              a ${radius} ${radius} 0 1 1 ${-radius * 2} 0`;
    }

    // 角度の計算（12時を0度として時計回り）
    const getAngle = (hour: number) => {
      // 12時を0度として時計回りに角度を計算（0時は90度）
      const angle = ((hour * 360) / 24 + 270) % 360;
      return (angle * Math.PI) / 180;
    };

    // 24時をまたぐ場合の処理
    const isOvernight = endHour < startHour;
    const adjustedEndHour = isOvernight ? endHour + 24 : endHour;

    const startAngle = getAngle(startHour);
    const endAngle = getAngle(endHour);

    // SVGのパスを計算
    const start = {
      x: center + radius * Math.cos(startAngle),
      y: center + radius * Math.sin(startAngle)
    };

    const end = {
      x: center + radius * Math.cos(endAngle),
      y: center + radius * Math.sin(endAngle)
    };

    // 弧の方向を決定
    const largeArcFlag = (adjustedEndHour - startHour > 12) ? 1 : 0;
    const sweepFlag = 1;  // 時計回り

    return `M ${center} ${center}
            L ${start.x} ${start.y}
            A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}
            L ${center} ${center}`;
  };

  const calculatePosition = (hour: number, radius: number) => {
    // 24時以降の時間を0-24の範囲に変換
    if (hour > 24) hour = hour - 24;
    const angle = ((hour - 6) * 360 / 24) * Math.PI / 180;
    return {
      x: Number((radius * Math.cos(angle)).toFixed(2)),
      y: Number((radius * Math.sin(angle)).toFixed(2))
    };
  };

  const radius = 320;
  const center = 400;

  const getTextPosition = (start: number, end: number, text: string) => {
    // 24時をまたぐ場合の中間点計算
    const calculateMidpoint = (start: number, end: number) => {
      if (end < start) {
        const totalHours = (24 - start) + end;
        let midpoint = start + (totalHours / 2);
        if (midpoint >= 24) midpoint -= 24;
        return midpoint;
      } else {
        return start + (end - start) / 2;
      }
    };

    const midHour = calculateMidpoint(start, end);
    const baseRadius = radius * 0.65;  // 基準半径を0.5から0.65に変更
    let textRadius = baseRadius;
    
    // 文字列の長さと時間の長さに基づいて半径を調整
    const textLength = text.length;
    const duration = end > start ? end - start : (24 - start) + end;
    
    // 基本調整値を計算（調整値を小さく）
    const baseAdjustment = Math.min(Math.max(textLength - 4, 0) * 4, 40);
    
    // 時間帯に応じて位置を調整（調整量を抑える）
    if (midHour >= 22 || midHour <= 2) {
      // 深夜帯は内側に
      textRadius -= baseAdjustment * 0.3;
    } 
    else if (midHour > 2 && midHour < 6) {
      // 早朝は少し外側に
      textRadius += baseAdjustment * 0.2;
    }
    else if (midHour >= 6 && midHour < 10) {
      // 朝は適度に
      textRadius += baseAdjustment * 0.15;
    }
    else if (midHour >= 10 && midHour < 14) {
      // 昼は少し外側に
      textRadius += baseAdjustment * 0.25;
    }
    else if (midHour >= 14 && midHour < 18) {
      // 午後は適度に
      textRadius += baseAdjustment * 0.15;
    }
    else if (midHour >= 18 && midHour < 22) {
      // 夜は内側に
      textRadius -= baseAdjustment * 0.2;
    }

    // 短い時間枠は少し内側に（調整量を減らす）
    if (duration <= 2) {
      textRadius -= 10;
    }

    // 6時を0度として角度を計算
    const angle = ((midHour - 6) * 360 / 24) * Math.PI / 180;
    return {
      x: Number((textRadius * Math.cos(angle)).toFixed(2)),
      y: Number((textRadius * Math.sin(angle)).toFixed(2))
    };
  };

  // テンプレート選択UI
  const selectTemplate = (templateName: keyof typeof templates) => {
    const newEvents = [...templates[templateName]];
    setHistory(prev => ({
      past: [...prev.past, events],
      future: []
    }));
    setEvents(newEvents);
    localStorage.setItem('schedule', JSON.stringify(newEvents));
  };

  // イベント更新時にローカルストレージも更新
  const updateEvents = (newEvents: Event[]) => {
    setHistory(prev => ({
      past: [...prev.past, events],
      future: []
    }));
    setEvents(newEvents);
    localStorage.setItem('schedule', JSON.stringify(newEvents));
  };

  // 元に戻す
  const undo = () => {
    if (history.past.length === 0) return;
    
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    
    setHistory({
      past: newPast,
      future: [events, ...history.future]
    });
    setEvents(previous);
  };

  // やり直し
  const redo = () => {
    if (history.future.length === 0) return;
    
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    
    setHistory({
      past: [...history.past, events],
      future: newFuture
    });
    setEvents(next);
  };

  const handleEventChange = (index: number, field: keyof Event, value: string | number) => {
    const newEvents = [...events];
    newEvents[index] = {
      ...newEvents[index],
      [field]: value
    };
    updateEvents(newEvents);
  };

  const addEvent = () => {
    const newEvent = { 
      start: 0, 
      end: 1, 
      event: '', 
      color: getNextColor(events)  // 新しい色を設定
    };
    const newEvents = [...events, newEvent];
    updateEvents(newEvents);
  };

  const removeEvent = (index: number) => {
    const eventToRemove = events[index];
    const nextEvent = index < events.length - 1 ? events[index + 1] : null;
    
    const updatedEvents = events.filter((_, i) => i !== index).map(event => {
      if (nextEvent && event === nextEvent) {
        // 次のイベントを前に伸ばす
        return {
          ...event,
          start: eventToRemove.start
        };
      }
      return event;
    });

    updateEvents(updatedEvents);
  };

  // 時間の重複をチェック
  const checkTimeOverlap = (event: Event, index: number): boolean => {
    // 24時をまたぐ場合は時間を24時間表記に変換
    const normalizeTime = (start: number, end: number) => {
      // 終了時刻が開始時刻より小さい場合は24時をまたぐ
      if (end < start) {
        return { start, end: end + 24 };
      }
      // 深夜帯（0-6時）のイベントは24時間表記に変換
      if (start < 6) {
        return { start: start + 24, end: end + 24 };
      }
      return { start, end };
    };

    const currentEvent = normalizeTime(event.start, event.end);

    return events.some((e, i) => {
      if (i === index) return false;
      
      const otherEvent = normalizeTime(e.start, e.end);

      // 両方のイベントを24時間表記で比較
      return (
        (currentEvent.start >= otherEvent.start && currentEvent.start < otherEvent.end) ||
        (currentEvent.end > otherEvent.start && currentEvent.end <= otherEvent.end) ||
        (currentEvent.start <= otherEvent.start && currentEvent.end >= otherEvent.end)
      );
    });
  };

  // addEventBetween関数を修正
  const addEventBetween = (currentEvent: Event, nextEvent: Event) => {
    const startTime = currentEvent.end;
    const endTime = Math.min(startTime + 0.5, nextEvent.end);
    
    const newEvent: Event = {
      start: startTime,
      end: endTime,
      event: '',
      color: getNextColor(events)
    };

    // 新しいイベントを含む更新後のイベント配列を作成
    const updatedEvents = [...events];
    const insertIndex = events.findIndex(e => e === nextEvent);
    
    // 次のイベントの開始時間を調整
    if (endTime < nextEvent.end) {
      updatedEvents[insertIndex] = {
        ...nextEvent,
        start: endTime
      };
    } else {
      // 次のイベントを完全に置き換える場合は削除
      updatedEvents.splice(insertIndex, 1);
    }
    
    // 新しいイベントを挿入
    updatedEvents.splice(insertIndex, 0, newEvent);

    // 24時を超えるイベントがないかチェック
    const hasOverflow = updatedEvents.some(event => event.end > 30);
    
    if (hasOverflow) {
      alert('24時を超えるため、予定を追加できません');
      return;
    }

    // 色を再割り当て
    const recoloredEvents = reassignColors(updatedEvents);
    updateEvents(recoloredEvents);
  };

  // イベントのクリックハンドラーを追加
  const focusEventInput = (startTime: number) => {
    // イベントのインデックスを探す
    const eventIndex = events.findIndex(event => event.start === startTime);
    if (eventIndex === -1) return;

    // イベント入力要素のIDを生成
    const inputId = `event-input-${eventIndex}`;
    const element = document.getElementById(inputId);
    
    if (element) {
      // 要素が見えるようにスクロール
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // フォーカスを設定
      element.focus();
    }
  };

  // スケジュール編集エリアのレンダリングを修正
  const renderScheduleList = () => (
    events.map((event, index) => {
      const hasOverlap = checkTimeOverlap(event, index);
      return (
        <div key={`event-${index}`}>
          <div 
            className={`
              rounded-lg border p-4 transition-all hover:shadow-md
              ${hasOverlap ? 'border-red-300 bg-red-50' : 'border-gray-200'}
            `}
            style={{
              backgroundColor: `${event.color}20`,
              borderLeftColor: event.color,
              borderLeftWidth: '4px'
            }}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1 flex items-center gap-2">
                <select
                  value={event.start}
                  onChange={(e) => handleEventChange(index, 'start', Number(e.target.value))}
                  className="p-2 bg-white border rounded-md flex-1" // 背景を白に
                >
                  {timeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="text-gray-500">→</span>
                <select
                  value={event.end}
                  onChange={(e) => handleEventChange(index, 'end', Number(e.target.value))}
                  className="p-2 bg-white border rounded-md flex-1" // 背景を白に
                >
                  {timeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => removeEvent(index)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="削除"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <input
                id={`event-input-${index}`}
                type="text"
                value={event.event}
                onChange={(e) => handleEventChange(index, 'event', e.target.value)}
                className="flex-1 p-2 bg-white border rounded-md" // 背景を白に
                placeholder="イベント名"
              />
            </div>
            
            {hasOverlap && (
              <div className="mt-2 text-red-500 text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                時間が重複しています
              </div>
            )}
          </div>

          {/* 次のイベントとの間に＋ボタンを表示（次のイベントが30分より長い場合のみ） */}
          {index < events.length - 1 && (
            // 次のイベントとの間に空き時間があるかチェック
            (() => {
              const currentEnd = event.end;
              const nextStart = events[index + 1].start;
              
              // 24時をまたぐ場合の処理
              if (nextStart < currentEnd) {
                return (nextStart + 24 - currentEnd) >= 0.5;
              }
              
              // 通常の場合
              return (nextStart - currentEnd) >= 0.5;
            })()
          ) && (
            <button
              onClick={() => addEventBetween(event, events[index + 1])}
              className="w-full py-2 my-2 flex items-center justify-center gap-2 text-gray-500 hover:text-blue-500 hover:bg-gray-50 rounded-md transition-colors group"
            >
              <svg 
                className="w-5 h-5 transform group-hover:scale-110 transition-transform" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 4v16m8-8H4" 
                />
              </svg>
              <span className="text-sm">
                {`${formatTime(event.end)} に30分の予定を追加`}
              </span>
            </button>
          )}
        </div>
      );
    })
  );

  // 時刻フォーマット用のヘルパー関数
  const formatTime = (time: number) => {
    const hour = Math.floor(time);
    const minute = Math.round((time % 1) * 60);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const getAvailableTime = (start: number, nextEvent: Event | undefined) => {
    // 24時をまたぐイベントを探す
    const overnightEvent = events.find(event => event.end < event.start);
    
    if (overnightEvent) {
      // 24時をまたぐイベントが存在する場合
      if (
        // 新しい開始時刻が24時をまたぐイベントの範囲内にある場合
        (start >= overnightEvent.start && start <= 24) || 
        (start >= 0 && start < overnightEvent.end)
      ) {
        return 0; // 追加不可
      }
    }

    if (!nextEvent) {
      // 次のイベントがない場合は24時までの時間を計算
      return 24 - start;
    }

    // 24時をまたぐ場合
    if (nextEvent.start < start) {
      return nextEvent.start + 24 - start;
    }

    // 通常の場合
    return nextEvent.start - start;
  };

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row">
      {/* 左側：円形スケジュール */}
      <div 
        className="md:shrink-0 md:flex-none flex flex-col p-4 md:h-full h-auto"
        style={{ width: windowWidth < 768 ? '100%' : `${leftWidth}px` }}
      >
        {/* グラフコンテナ - md:justify-center を追加 */}
        <div className="flex items-center justify-center md:h-full">
          <div className="w-full max-w-[calc(100vh-120px)] aspect-square">
            <svg 
              width="100%" 
              height="100%" 
              viewBox="-20 -20 840 840"
              className="border rounded-lg shadow-lg"
              preserveAspectRatio="xMidYMid meet"
            >
              {events.map(event => (
                <path
                  key={event.start}
                  d={calculateArc(event.start, event.end, radius)}
                  fill={event.color}
                  stroke="#fff"
                  strokeWidth="1"
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => focusEventInput(event.start)}
                />
              ))}
              
              {Array.from({ length: 24 }, (_, i) => {
                const hour = (i + 6) % 24;
                const pos = calculatePosition(hour, radius);
                return (
                  <g key={`time-${hour}`}>
                    <line
                      x1={center + pos.x * 0.95}
                      y1={center + pos.y * 0.95}
                      x2={center + pos.x}
                      y2={center + pos.y}
                      stroke="#666"
                      strokeWidth="1"
                    />
                    <text
                      x={center + pos.x * 1.15}
                      y={center + pos.y * 1.15}
                      textAnchor="middle"
                      className="text-lg font-semibold"
                      fill="#444"
                    >
                      {`${hour}`}
                    </text>
                  </g>
                );
              })}

              {events.map(event => {
                const pos = getTextPosition(event.start, event.end, event.event);
                return (
                  <text
                    key={`text-${event.start}`}
                    x={center + pos.x}
                    y={center + pos.y + 5}
                    textAnchor="middle"
                    className="text-lg font-bold"
                    fill="#333"
                    style={{
                      filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))',
                      paintOrder: 'stroke',
                      stroke: 'white',
                      strokeWidth: '3px',
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round'
                    }}
                  >
                    {event.event}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* リサイズバー */}
      <div
        className="hidden md:flex w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors relative group"
        onMouseDown={handleResizeStart}
      >
        {/* ドラッグハンドルの装飾 */}
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-blue-400/10" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-gray-300 group-hover:bg-blue-400" />
      </div>

      {/* 右側：スケジュール編集エリア */}
      <div className="flex-1 min-w-[300px] md:min-w-[400px] flex flex-col p-4 overflow-hidden h-[calc(100vh-400px)] md:h-full">
        <div className="bg-white rounded-lg shadow-lg flex flex-col h-full">
          {/* ヘッダー */}
          <div className="flex justify-between items-center p-4 shrink-0 border-b">
            <div className="flex items-center gap-2">
              <button
                onClick={undo}
                disabled={history.past.length === 0}
                className={`p-2 rounded-full ${
                  history.past.length === 0 
                    ? 'text-gray-300' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="元に戻す"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button
                onClick={redo}
                disabled={history.future.length === 0}
                className={`p-2 rounded-full ${
                  history.future.length === 0 
                    ? 'text-gray-300' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="やり直し"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => selectTemplate('empty')}
                className="px-3 py-1.5 text-gray-600 border rounded-md hover:bg-gray-50 transition-colors text-sm"
              >
                New
              </button>
              <button 
                onClick={() => selectTemplate('workday')}
                className="px-3 py-1.5 text-gray-600 border rounded-md hover:bg-gray-50 transition-colors text-sm"
              >
                平日
              </button>
              <button 
                onClick={() => selectTemplate('weekend')}
                className="px-3 py-1.5 text-gray-600 border rounded-md hover:bg-gray-50 transition-colors text-sm"
              >
                休日
              </button>
            </div>
          </div>

          {/* スクロールエリア */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {renderScheduleList()}
            </div>
          </div>

          {/* フッター */}
          <div className="p-4 border-t shrink-0">
            <button
              onClick={() => {
                if (events.length === 0) {
                  // イベントが0の場合は0:00から始まるイベントを追加
                  const newEvent = {
                    start: 0,
                    end: 1,
                    event: '',
                    color: getNextColor(events)
                  };
                  updateEvents([newEvent]);
                } else {
                  const lastEvent = events[events.length - 1];
                  const newStart = lastEvent.end === 24 ? 0 : lastEvent.end;

                  // 次のイベントを探す
                  const nextEvent = events.find(event => {
                    // 24時をまたぐイベントの場合
                    if (event.end < event.start) {
                      return newStart < event.end || newStart >= event.start;
                    }
                    // 通常のイベントの場合
                    return (
                      // 開始時刻がnewStartより後のイベント、または
                      // 開始時刻は前だが終了時刻がnewStartより後のイベント
                      (event.start > newStart) || 
                      (event.start <= newStart && event.end > newStart)
                    );
                  });

                  // 次のイベントまでの空き時間を計算
                  const availableTime = getAvailableTime(newStart, nextEvent);

                  // 利用可能な時間が30分未満の場合は追加しない
                  if (nextEvent && availableTime < 0.5) {
                    alert('この時間帯には予定を追加できません');
                    return;
                  }

                  // 利用可能な時間が1時間以上あれば1時間、そうでなければ30分を追加
                  const newEnd = nextEvent
                    ? Math.min(newStart + (availableTime >= 1 ? 1 : 0.5), nextEvent.start)
                    : Math.min(newStart + 1, 24);

                  const newEvent = {
                    start: newStart,
                    end: newEnd,
                    event: '',
                    color: getNextColor(events)
                  };
                  updateEvents([...events, newEvent]);
                }
              }}
              className="w-full py-2 flex items-center justify-center gap-2 text-gray-500 hover:text-blue-500 hover:bg-gray-50 rounded-md transition-colors group"
            >
              <svg 
                className="w-5 h-5 transform group-hover:scale-110 transition-transform" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 4v16m8-8H4" 
                />
              </svg>
              <span className="text-sm">
                {events.length === 0 
                  ? '0:00 に予定を追加'
                  : `${formatTime(events[events.length - 1].end)} に予定を追加`
                }
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* リサイズ中のオーバーレイ */}
      {isResizing && (
        <div className="fixed inset-0 bg-black/0 cursor-col-resize z-50" />
      )}
    </div>
  );
};

export default CircleSchedule;