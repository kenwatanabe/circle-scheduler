"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface Event {
  name: string;
  color: string;
}

interface TimeSlot {
  start: number;  // 開始時刻
  end: number;    // 終了時刻
  event: Event;   // イベント
}

interface History {
  past: TimeSlot[][];
  future: TimeSlot[][];
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

// テンプレートの形式を修正
const templates = {
  empty: [
    { start: 6, end: 6, event: { name: '就寝', color: pastelColors[0] } }  // 6:00の就寝イベント
  ],
  workday: [
    { start: 22, end: 6, event: { name: '就寝', color: pastelColors[0] } },
    { start: 6, end: 7, event: { name: '起床・準備', color: pastelColors[1] } },
    { start: 7, end: 8, event: { name: '朝食', color: pastelColors[2] } },
    { start: 8, end: 9, event: { name: '通勤', color: pastelColors[3] } },
    { start: 9, end: 18, event: { name: '仕事', color: pastelColors[4] } },
    { start: 18, end: 19, event: { name: '通勤', color: pastelColors[5] } },
    { start: 19, end: 20, event: { name: '夕食', color: pastelColors[6] } },
    { start: 20, end: 22, event: { name: '自由時間', color: pastelColors[7] } },
  ],
  weekend: [
    { start: 22, end: 8, event: { name: '就寝', color: pastelColors[0] } },
    { start: 8, end: 9, event: { name: '起床・準備', color: pastelColors[1] } },
    { start: 9, end: 10, event: { name: '朝食', color: pastelColors[2] } },
    { start: 10, end: 12, event: { name: '自由時間', color: pastelColors[3] } },
    { start: 12, end: 13, event: { name: '昼食', color: pastelColors[4] } },
    { start: 13, end: 18, event: { name: '趣味', color: pastelColors[5] } },
    { start: 18, end: 20, event: { name: '夕食', color: pastelColors[6] } },
    { start: 20, end: 22, event: { name: '自由時間', color: pastelColors[7] } },
  ]
};

// 新しい色を取得する関数を追加
const getNextColor = (events: Event[]) => {
  if (events.length === 0) return pastelColors[0];
  const lastColorIndex = pastelColors.indexOf(events[events.length - 1].color);
  const nextIndex = (lastColorIndex + 1) % pastelColors.length;
  return pastelColors[nextIndex];
};

// 計算結果を固定の精度に丸める関数を追加
const roundTo = (num: number, precision: number = 8) => {
  return Number(num.toFixed(precision));
};

// 時刻フォーマット関数を追加
const formatTime = (time: number) => {
  const hour = Math.floor(time);
  const minute = time % 1 === 0.5 ? '30' : '00';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
};

// 時間の差を計算する関数を追加
const getTimeDifference = (start: number, end: number) => {
  if (end < start) {
    // 24時をまたぐ場合
    return (24 - start) + end;
  }
  // 通常の場合
  return end - start;
};

// 中間点を計算する関数をコンポーネントの外に移動
const calculateMidpoint = (start: number, end: number) => {
  if (end < start) {
    const totalHours = (24 - start) + end;
    let midpoint = start + (totalHours / 2);
    if (midpoint >= 24) midpoint -= 24;
    return midpoint;
  }
  return start + (end - start) / 2;
};

const CircleSchedule = () => {
  const [windowWidth, setWindowWidth] = useState(0);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(() => {
    const saved = localStorage.getItem('schedule');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.length > 0 ? parsed : templates.workday;
    }
    return templates.workday;
  });
  const [history, setHistory] = useState<History>({
    past: [],
    future: []
  });
  const [leftWidth, setLeftWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [textSize, setTextSize] = useState('text-3xl');  // デフォルトを大きめに
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // 初期レンダリング時の処理をuseEffectに移動
  useEffect(() => {
    // クライアントサイドでのみwindowWidthを設定
    setWindowWidth(window.innerWidth);

    // ウィンドウサイズの変更を監視
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // リサイズハンドラーを追加
  const handleResizeStart = () => {
    setIsResizing(true);
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

    // マウスを離した時の処理を追加
    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', handleMouseUp);  // mouseupイベントリスナーを追加
    }

    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', handleMouseUp);  // クリーンアップ時にも削除
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

  const calculateArc = (timeSlot: TimeSlot, radius: number) => {
    const startHour = timeSlot.start;
    const endHour = timeSlot.end;

    // 開始時刻と終了時刻が同じ場合は完全な円を描画
    if (startHour === endHour) {
      return `M ${center} ${center}
              m ${-radius} 0
              a ${radius} ${radius} 0 1 1 ${radius * 2} 0
              a ${radius} ${radius} 0 1 1 ${-radius * 2} 0`;
    }

    // 24時をまたぐ場合の処理
    let adjustedEndHour = endHour;
    if (endHour < startHour) {
      adjustedEndHour += 24;
    }

    // 角度の計算（6時を0度として時計回り）
    const getAngle = (hour: number) => {
      // 6時を0度として時計回りに角度を計算
      const angle = ((hour - 6) * 360 / 24) % 360;
      return (angle * Math.PI) / 180;
    };

    const startAngle = getAngle(startHour);
    const endAngle = getAngle(endHour);  // 24以上の値を24未満に正規化

    // SVGのパスを計算
    const start = {
      x: roundTo(center + radius * Math.cos(startAngle)),
      y: roundTo(center + radius * Math.sin(startAngle))
    };

    const end = {
      x: roundTo(center + radius * Math.cos(endAngle)),
      y: roundTo(center + radius * Math.sin(endAngle))
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
    if (hour > 24) hour = hour - 24;
    const angle = ((hour - 6) * 360 / 24) * Math.PI / 180;
    return {
      x: roundTo(radius * Math.cos(angle)),
      y: roundTo(radius * Math.sin(angle))
    };
  };

  const radius = 320;
  const center = 400;

  const getTextPosition = (timeSlot: TimeSlot) => {
    if (!timeSlot?.event?.name) return { x: 0, y: 0 };

    const midHour = calculateMidpoint(timeSlot.start, timeSlot.end);
    const angle = ((midHour - 6) * 360 / 24) * Math.PI / 180;

    // y座標の正負で上下、x座標の正負で左右を判定
    const normalizedY = Math.sin(angle);
    const normalizedX = Math.cos(angle);

    // y座標とx座標の絶対値の比率で配置を決定
    const ratio = Math.abs(normalizedY) / (Math.abs(normalizedY) + Math.abs(normalizedX));
    
    // 0時と12時の前後30分/1時間の特別処理
    const adjustedHour = (midHour + 24) % 24;
    const duration = getTimeDifference(timeSlot.start, timeSlot.end);

    const isBeforeCriticalPoint = 
      (duration <= 1) && (
        (adjustedHour >= 23.5 && adjustedHour <= 24) ||  // 23:30-24:00
        (adjustedHour >= 11.5 && adjustedHour < 12)      // 11:30-12:00
      );

    const isAfterCriticalPoint = 
      (duration <= 1) && (
        (adjustedHour >= 0 && adjustedHour <= 0.5) ||    // 00:00-00:30
        (adjustedHour >= 12 && adjustedHour <= 12.5)     // 12:00-12:30
      );

    // 重なりやすい時間帯は固定位置に配置
    let baseRadius;
    if (isBeforeCriticalPoint) {
      baseRadius = 0.5;  // 前の30分/1時間は内側に固定
    } else if (isAfterCriticalPoint) {
      baseRadius = 0.9;  // 後の30分/1時間は外側に固定
    } else {
      baseRadius = 0.45 + (ratio * 0.3);  // 0.45（内側）から0.75（外側）まで
    }
    
    const textRadius = radius * baseRadius;

    return {
      x: roundTo(textRadius * Math.cos(angle)),
      y: roundTo(textRadius * Math.sin(angle))
    };
  };

  // テンプレート選択UI
  const selectTemplate = (templateName: keyof typeof templates) => {
    const newEvents = [...templates[templateName]];
    setHistory(prev => ({
      past: [...prev.past, timeSlots],
      future: []
    }));
    setTimeSlots(newEvents);
    localStorage.setItem('schedule', JSON.stringify(newEvents));
  };

  // イベント更新時にローカルストレージも更新
  const updateEvents = (newEvents: TimeSlot[], preserveColors: boolean = false) => {
    // preserveColorsがtrueの場合は色を再割り当てしない
    const eventsWithNewColors = preserveColors 
      ? newEvents 
      : newEvents.map((slot, index) => ({
          ...slot,
          event: {
            ...slot.event,
            color: pastelColors[index % pastelColors.length]
          }
        }));

    setHistory(prev => ({
      past: [...prev.past, timeSlots],
      future: []
    }));
    setTimeSlots(eventsWithNewColors);
    localStorage.setItem('schedule', JSON.stringify(eventsWithNewColors));
  };

  // undo関数をuseCallbackでラップ
  const undo = useCallback(() => {
    if (history.past.length === 0) return;
    
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    
    setHistory({
      past: newPast,
      future: [timeSlots, ...history.future]
    });
    setTimeSlots(previous);
  }, [history.past, history.future, timeSlots]);

  // redo関数をuseCallbackでラップ
  const redo = useCallback(() => {
    if (history.future.length === 0) return;
    
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    
    setHistory({
      past: [...history.past, timeSlots],
      future: newFuture
    });
    setTimeSlots(next);
  }, [history.past, history.future, timeSlots]);

  // handleTimeChange関数をuseCallbackでラップ（一つだけ定義）
  const handleTimeChange = useCallback((index: number, newEndTime: number, isDragOperation: boolean = false) => {
    // 24:00開始のイベントを0:00開始に変換
    if (timeSlots[index].start === 24) {
      const newTimeSlots = [...timeSlots];
      newTimeSlots[index].start = 0;
      newTimeSlots[index].end = newEndTime;
      
      // 次のイベントの開始時刻を更新
      const nextIndex = (index + 1) % timeSlots.length;
      newTimeSlots[nextIndex].start = newEndTime;

      updateEvents(newTimeSlots);
      return;
    }

    // 0:00終了のイベントを24:00終了に変換
    if (newEndTime === 0) {
      newEndTime = 24;
    }

    const newTimeSlots = [...timeSlots];
    const prevIndex = (index - 1 + timeSlots.length) % timeSlots.length;

    // 前のイベントの終了時刻より後であることを確認
    const prevEnd = timeSlots[prevIndex].end;

    // 24時をまたぐ場合の処理
    const isValidTime = (prev: number, time: number) => {
      if (prev < time) {
        return true;
      } else {
        return prev > time;
      }
    };

    if (!isValidTime(prevEnd, newEndTime)) {
      if (!isDragOperation) {
        alert('前のイベントと時刻が重複しています');
        return;
      }
      newEndTime = prevEnd;
    }

    // 現在のイベントの終了時刻を更新
    newTimeSlots[index].end = newEndTime;
    
    // 次のイベントの開始時刻を更新
    const nextIndex = (index + 1) % timeSlots.length;
    newTimeSlots[nextIndex].start = newEndTime;

    updateEvents(newTimeSlots);
  }, [timeSlots, updateEvents]);

  // イベント名変更のハンドラー
  const handleEventNameChange = (index: number, name: string) => {
    const newTimeSlots = [...timeSlots];
    newTimeSlots[index].event.name = name;
    updateEvents(newTimeSlots);
  };

  // イベントのクリックハンドラーを追加
  const focusEventInput = (time: number) => {
    // イベントのインデックスを探す
    const eventIndex = timeSlots.findIndex(event => event.start === time);
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

  // 初期レンダリング用のスタイルを追加（型を明示的に指定）
  const initialStyle: React.CSSProperties = {
    visibility: windowWidth === 0 ? 'hidden' as const : 'visible' as const,
    width: windowWidth === 0 ? '600px' : windowWidth < 768 ? '100%' : `${leftWidth}px`
  };

  // イベント削除のハンドラーを修正
  const handleDeleteEvent = (index: number) => {
    if (timeSlots.length <= 1) {
      alert('最後のイベントは削除できません');
      return;
    }

    const newTimeSlots = [...timeSlots];
    const nextIndex = (index + 1) % timeSlots.length;

    // 削除されるイベントの次のイベントの開始時刻を、
    // 削除されるイベントの開始時刻に更新
    newTimeSlots[nextIndex] = {
      ...newTimeSlots[nextIndex],
      start: newTimeSlots[index].start
    };

    // イベントを削除
    const filteredTimeSlots = newTimeSlots.filter((_, i) => i !== index);
    
    updateEvents(filteredTimeSlots);
  };

  // イベント追加ボタンのクリックハンドラーを修正
  const handleAddEvent = () => {
    if (timeSlots.length === 0) {
      // 最初のイベントを追加
      const newEvent: TimeSlot = {
        start: 7, // デフォルトで7:00から開始
        end: 7,   // デフォルトで7:00に終了
        event: {
          name: '',
          color: pastelColors[0]
        }
      };
      updateEvents([newEvent]);
    } else {
      // 既存のイベントの後に新しいイベントを追加
      const lastSlot = timeSlots[timeSlots.length - 1];
      const firstSlot = timeSlots[0];
      const availableHours = firstSlot.start > lastSlot.start 
        ? firstSlot.start - lastSlot.start 
        : (24 - lastSlot.start) + firstSlot.start;

      if (availableHours < 0.5) {
        alert('これ以上予定を追加できません');
        return;
      }

      // 新しい時刻を計算（利用可能な時間の半分か1時間のいずれか小さい方）
      const newStart = lastSlot.start + Math.min(1, availableHours / 2);
      const adjustedStart = newStart >= 24 ? newStart - 24 : newStart;

      const newEvent: TimeSlot = {
        start: adjustedStart,
        end: adjustedStart,
        event: {
          name: '',
          color: getNextColor(timeSlots.map(slot => slot.event))
        }
      };
      updateEvents([...timeSlots, newEvent]);
    }
  };

  // イベントの間に追加するための関数を修正
  const handleAddEventBetween = (index: number) => {
    // イベントが1つしかない場合の特別処理
    if (timeSlots.length === 1) {
      const currentSlot = timeSlots[0];
      const newStart = currentSlot.end;  // 現在のイベントの終了時刻を新しいイベントの開始時刻に
      const newEnd = (newStart + 12) % 24;  // 開始時刻から12時間後を終了時刻に
      
      const newTimeSlots = [
        {
          ...currentSlot,
          start: newEnd  // 最初のイベントの開始時刻を新しいイベントの終了時刻に設定
        },
        {
          start: newStart,
          end: newEnd,
          event: {
            name: '',
            color: getNextColor(timeSlots.map(slot => slot.event))
          }
        }
      ];
      
      updateEvents(newTimeSlots);
      return;
    }

    // 2つ以上のイベントがある場合の処理
    const currentSlot = timeSlots[index];
    const nextSlot = timeSlots[(index + 1) % timeSlots.length];
    
    // 新しいイベントの開始時刻は現在のイベントの終了時刻
    const newStart = currentSlot.end;

    // 新しい終了時刻を計算（次のイベントの終了時刻との中間）
    let newEnd;
    if (nextSlot.end <= newStart) {
      // 24時をまたぐ場合
      const totalHours = (24 - newStart) + nextSlot.end;
      newEnd = newStart + (totalHours / 2);
      if (newEnd >= 24) {
        newEnd = newEnd - 24;
      }
    } else {
      // 通常の場合
      newEnd = newStart + (nextSlot.end - newStart) / 2;
    }

    // 新しい時刻を30分単位に丸める
    newEnd = Math.round(newEnd * 2) / 2;

    // 新しいイベントを作成
    const newEvent: TimeSlot = {
      start: newStart,
      end: newEnd,
      event: {
        name: '',
        color: getNextColor(timeSlots.map(slot => slot.event))
      }
    };

    // 次のイベントを更新
    const updatedNextSlot = {
      ...nextSlot,
      start: newEnd
    };

    // 新しいイベントを挿入
    let newTimeSlots;
    if (index === timeSlots.length - 1) {
      // 最後のイベントの後に追加する場合
      newTimeSlots = [
        {
          ...timeSlots[0],  // 最初のイベント（就寝）を更新
          start: newEnd
        },
        ...timeSlots.slice(1, -1),  // 中間のイベント
        timeSlots[timeSlots.length - 1],  // 現在のイベント
        newEvent  // 新しいイベント
      ];
    } else {
      // それ以外の場合
      newTimeSlots = [
        ...timeSlots.slice(0, index + 1),  // 現在のイベントまで
        newEvent,  // 新しいイベント
        updatedNextSlot,  // 更新された次のイベント
        ...timeSlots.slice(index + 2)  // 残りのイベント
      ];
    }
    
    updateEvents(newTimeSlots);
  };

  // 画像保存機能を修正
  const handleDownload = () => {
    const svg = document.querySelector('svg');
    if (!svg) return;

    // SVGをクローン
    const clonedSvg = svg.cloneNode(true) as SVGElement;
    
    // SVGの属性を設定
    clonedSvg.setAttribute('width', '1600');
    clonedSvg.setAttribute('height', '1600');
    clonedSvg.style.backgroundColor = 'white';

    // ＋ボタンを非表示にする
    clonedSvg.querySelectorAll('.group-hover\\:opacity-100').forEach(el => {
      el.remove();
    });

    // 現在の文字サイズに基づいてフォントサイズを設定
    const fontSize = {
      'text-2xl': '24px',
      'text-3xl': '30px',
      'text-4xl': '36px'
    }[textSize] || '30px';

    // クローンしたSVG内のすべてのテキスト要素にフォントサイズを設定
    clonedSvg.querySelectorAll('text').forEach(text => {
      if (text.textContent?.match(/^\d+$/)) {
        // 時刻の数字は少し小さめに
        text.style.fontSize = `${parseInt(fontSize) * 0.8}px`;
      } else {
        // イベント名は指定サイズで
        text.style.fontSize = fontSize;
      }
      text.style.fontWeight = 'bold';
    });

    // SVGをBlobに変換
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });

    // SVGからPNGを生成
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 1600;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // 背景を白で塗りつぶし
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // SVGを描画
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // PNGとしてダウンロード
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'schedule.png';
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.src = URL.createObjectURL(svgBlob);
  };

  // 境界線の位置を計算する関数
  const getBoundaryPosition = (time: number, radius: number) => {
    const angle = ((time - 6) * 360 / 24) * Math.PI / 180;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    };
  };

  // getTimeFromMousePosition関数をuseEffect内に移動
  useEffect(() => {
    if (!isDragging || dragIndex === null) return;

    const getTimeFromMousePosition = (x: number, y: number, currentIndex: number) => {
      const dx = x - center;
      const dy = y - center;
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += 2 * Math.PI;
      let hours = (angle * 24 / (2 * Math.PI)) + 6;
      if (hours >= 24) hours -= 24;
      
      // 30分単位に丸める
      const roundedHours = Math.round(hours * 2) / 2;

      // 前後のイベントの時刻を取得
      const prevIndex = currentIndex;
      const nextIndex = (currentIndex + 1) % timeSlots.length;
      const currentStart = timeSlots[prevIndex].start;
      const nextEnd = timeSlots[nextIndex].end;

      // 24時をまたぐ場合の処理
      if (nextEnd < currentStart) {
        // 例：22:00開始のイベントで、次のイベントが7:00終了の場合
        if (roundedHours >= currentStart || roundedHours <= nextEnd) {
          // 有効な範囲内（22:30～6:30）
          const minTime = currentStart + 0.5;  // 最小値：22:30
          const maxTime = nextEnd === 24 ? 23.5 : nextEnd - 0.5;  // 24:00終了の場合は23:30まで
          
          if (roundedHours >= currentStart && roundedHours < minTime) return minTime;
          if (roundedHours <= nextEnd && roundedHours > maxTime) return maxTime;
          return roundedHours;
        }
      } else {
        // 通常の場合
        const minTime = currentStart + 0.5;
        const maxTime = nextEnd === 24 ? 23.5 : nextEnd - 0.5;  // 24:00終了の場合は23:30まで
        
        if (roundedHours < minTime) return minTime;
        if (roundedHours > maxTime) return maxTime;
        return roundedHours;
      }

      // 範囲外の場合、近い方の制限時刻を返す
      const distToMin = Math.min(
        Math.abs(roundedHours - (currentStart + 0.5)),
        Math.abs(roundedHours - (currentStart + 0.5 + 24))
      );
      const distToMax = Math.min(
        Math.abs(roundedHours - (nextEnd === 24 ? 23.5 : nextEnd - 0.5)),
        Math.abs(roundedHours - ((nextEnd === 24 ? 23.5 : nextEnd - 0.5) + 24))
      );
      return distToMin < distToMax ? currentStart + 0.5 : (nextEnd === 24 ? 23.5 : nextEnd - 0.5);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const svg = document.querySelector('svg');
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const scale = rect.width / 800;

      const newTime = getTimeFromMousePosition(
        (x - rect.width / 2) / scale + center,
        (y - rect.height / 2) / scale + center,
        dragIndex
      );

      handleTimeChange(dragIndex, newTime, true);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragIndex(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragIndex, handleTimeChange]);

  // キーボードショートカットのuseEffect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history.past.length, history.future.length, undo, redo]);

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row">
      {/* 左側：円形スケジュール */}
      <div 
        className="md:shrink-0 md:flex-none flex flex-col p-4 md:h-full h-auto"
        style={initialStyle}
      >
        {/* グラフコンテナ */}
        <div className="flex items-center justify-center md:h-full">
          <div className="w-full max-w-[calc(100vh-120px)] aspect-square">
            <svg 
              width="100%" 
              height="100%" 
              viewBox="-20 -20 840 840"
              className="border rounded-lg shadow-lg"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* イベントの円弧と境界線を描画 */}
              <g>
                {/* 最背面：背景の円弧 */}
                {timeSlots.length > 0 && timeSlots.map((slot, index) => (
                  <g key={`arc-${index}`}>
                    {/* 影のための同じパスを下に配置 */}
                    <path
                      d={calculateArc(slot, radius)}
                      fill="rgba(0,0,0,0.2)"
                      className={`opacity-0 transform translate-x-1 translate-y-1 blur-sm transition-opacity ${
                        focusedIndex === index ? 'opacity-100' : 'group-hover:opacity-100'
                      }`}
                    />
                    {/* メインの円弧 */}
                    <path
                      d={calculateArc(slot, radius)}
                      fill={slot.event.color}
                      stroke="#666"
                      strokeWidth="2"
                      strokeOpacity="0"
                      className={`cursor-pointer group hover:stroke-opacity-100 ${
                        focusedIndex === index ? 'stroke-opacity-100 filter brightness-95' : ''
                      }`}
                      onClick={() => focusEventInput(slot.start)}
                    />
                  </g>
                ))}

                {/* 中間層：ドラッグ可能な境界線とボタン */}
                {timeSlots.length > 0 && timeSlots.map((slot, index) => (
                  <g key={`controls-${index}`} className="group">
                    {/* 3つ以上のイベントがある場合のみドラッグ可能な境界線を表示 */}
                    {timeSlots.length >= 3 && (
                      <g
                        className="cursor-move group"
                        onMouseDown={(e) => {
                          setIsDragging(true);
                          setDragIndex(index);
                          e.stopPropagation();
                        }}
                      >
                        {/* より大きな透明なヒットエリア（円弧状） */}
                        <path
                          d={`M ${getBoundaryPosition(slot.end, radius * 0).x} ${getBoundaryPosition(slot.end, radius * 0).y}
                              L ${getBoundaryPosition(slot.end, radius * 1.1).x} ${getBoundaryPosition(slot.end, radius * 1.1).y}`}
                          stroke="transparent"
                          strokeWidth="20"
                          className="cursor-move hover:stroke-blue-50/50"
                        />
                      </g>
                    )}
                    {/* イベント間の＋ボタン */}
                    {(timeSlots.length === 1 || getTimeDifference(
                      timeSlots[(index + 1) % timeSlots.length].start,
                      timeSlots[(index + 1) % timeSlots.length].end
                    ) > 0.5) && (
                      <g
                        onClick={() => handleAddEventBetween(index)}
                        className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        transform={`translate(${getBoundaryPosition(slot.end, radius * 1).x},${getBoundaryPosition(slot.end, radius * 1).y})`}
                      >
                        <circle
                          r="10"
                          fill="white"
                          stroke="#666"
                          strokeWidth="1"
                          className="hover:stroke-blue-500"
                        />
                        <path
                          d="M -4 0 H 4 M 0 -4 V 4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className="text-gray-400 hover:text-blue-500"
                        />
                      </g>
                    )}
                  </g>
                ))}

                {/* 最前面：テキスト */}
                {timeSlots.length > 0 && timeSlots.map((slot, index) => (
                  <g key={`text-${index}`}>
                    {/* 下線を削除 */}
                    <text
                      x={center + getTextPosition(slot).x}
                      y={center + getTextPosition(slot).y + 5}
                      textAnchor="middle"
                      className={`${textSize} font-bold select-none pointer-events-none`}
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
                      {slot.event.name}
                    </text>
                  </g>
                ))}

                {/* 時刻の目盛りを描画（これは常に表示） */}
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
                        className={`${textSize} font-semibold select-none`}
                        fill="#444"
                      >
                        {`${hour}`}
                      </text>
                    </g>
                  );
                })}
              </g>
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
              <button
                onClick={handleDownload}
                className="p-2 rounded-full text-gray-600 hover:bg-gray-100"
                title="画像としてダウンロード"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <div className="flex items-center gap-1 ml-2 border-l pl-2">
                <button
                  onClick={() => setTextSize('text-2xl')}
                  className={`p-2 rounded-full ${
                    textSize === 'text-2xl'
                      ? 'text-blue-500 bg-blue-50'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="中"
                >
                  <span className="text-2xl font-bold">A</span>
                </button>
                <button
                  onClick={() => setTextSize('text-3xl')}
                  className={`p-2 rounded-full ${
                    textSize === 'text-3xl'
                      ? 'text-blue-500 bg-blue-50'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="大"
                >
                  <span className="text-3xl font-bold">A</span>
                </button>
                <button
                  onClick={() => setTextSize('text-4xl')}
                  className={`p-2 rounded-full ${
                    textSize === 'text-4xl'
                      ? 'text-blue-500 bg-blue-50'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="特大"
                >
                  <span className="text-4xl font-bold">A</span>
                </button>
              </div>
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
              {timeSlots.map((slot, index) => (
                <div key={`schedule-item-${index}`} className="relative">
                  {/* イベント名の入力欄 */}
                  <div 
                    className="rounded-lg border p-4 bg-white hover:bg-gray-50 transition-colors"
                    style={{ 
                      borderLeftColor: slot.event.color, 
                      borderLeftWidth: '4px',
                      backgroundColor: `${slot.event.color}10`
                    }}
                  >
                    <div className="flex gap-2">
                      <input
                        id={`event-input-${index}`}
                        type="text"
                        value={slot.event.name}
                        onChange={(e) => handleEventNameChange(index, e.target.value)}
                        onFocus={() => setFocusedIndex(index)}
                        onBlur={() => setFocusedIndex(null)}
                        className="flex-1 p-2 border rounded-md bg-white"
                        placeholder="イベント名"
                        autoComplete="off"
                      />
                      {/* イベントが2つ以上ある場合のみ削除ボタンを表示 */}
                      {timeSlots.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(index);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors bg-white"
                          title="削除"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 時刻表示と追加ボタン */}
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-2">
                    <select
                      value={slot.end}
                      onChange={(e) => handleTimeChange(index, Number(e.target.value))}
                      className="bg-white px-3 py-1.5 rounded-full shadow-sm border text-sm cursor-pointer hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      {timeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {formatTime(option.value)}
                        </option>
                      ))}
                    </select>
                    {/* イベントが1つの場合、または次のイベントの時間が30分より長い場合に＋ボタンを表示 */}
                    {(timeSlots.length === 1 || getTimeDifference(
                      timeSlots[(index + 1) % timeSlots.length].start,
                      timeSlots[(index + 1) % timeSlots.length].end
                    ) > 0.5) && (
                      <button
                        onClick={() => handleAddEventBetween(index)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white border shadow-sm text-gray-400 hover:text-blue-500 hover:border-blue-400 transition-colors"
                        title="この時間に予定を追加"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
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