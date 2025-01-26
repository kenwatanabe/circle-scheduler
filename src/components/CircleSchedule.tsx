"use client";

import React, { useState } from 'react';

interface Event {
  start: number;
  end: number;
  event: string;
  color: string;
}

const CircleSchedule = () => {
  const [scheduleSize, setScheduleSize] = useState(400);
  const [events, setEvents] = useState<Event[]>([
    { start: 6, end: 7, event: '起床洗顔', color: '#FFE4E1' },
    { start: 7, end: 8, event: '朝食', color: '#E6E6FA' },
    { start: 8, end: 9, event: '散歩', color: '#98FB98' },
    { start: 9, end: 11, event: '仕事', color: '#87CEEB' },
    { start: 11, end: 12, event: '資格勉強', color: '#DDA0DD' },
    { start: 12, end: 13, event: '昼食', color: '#F0E68C' },
    { start: 13, end: 15, event: 'プール平泳ぎ', color: '#ADD8E6' },
    { start: 15, end: 16, event: 'おやつ', color: '#FFA07A' },
    { start: 16, end: 19, event: '勉強', color: '#FFB6C1' },
    { start: 19, end: 20, event: '夕食', color: '#98FB98' },
    { start: 20, end: 22, event: 'テレビ', color: '#B0C4DE' },
    { start: 22, end: 24, event: '就寝', color: '#D8BFD8' }
  ]);

  // 時間選択肢の生成（30分単位）
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? '00' : '30';
    const value = hour + (i % 2 === 0 ? 0 : 0.5);
    return { label: `${hour.toString().padStart(2, '0')}:${minute}`, value };
  });

  const calculateArc = (startHour: number, endHour: number, radius: number) => {
    const startAngle = ((startHour - 6) * 360 / 24) * Math.PI / 180;
    const endAngle = ((endHour - 6) * 360 / 24) * Math.PI / 180;
    
    const start = {
      x: Number((center + radius * Math.cos(startAngle)).toFixed(2)),
      y: Number((center + radius * Math.sin(startAngle)).toFixed(2))
    };
    
    const end = {
      x: Number((center + radius * Math.cos(endAngle)).toFixed(2)),
      y: Number((center + radius * Math.sin(endAngle)).toFixed(2))
    };
    
    const largeArcFlag = endHour - startHour > 12 ? 1 : 0;
    
    return `M ${center} ${center}
            L ${start.x} ${start.y}
            A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}
            L ${center} ${center}`;
  };

  const calculatePosition = (hour: number, radius: number) => {
    const angle = ((hour - 6) * 360 / 24) * Math.PI / 180;
    return {
      x: Number((radius * Math.cos(angle)).toFixed(2)),
      y: Number((radius * Math.sin(angle)).toFixed(2))
    };
  };

  const radius = scheduleSize / 2 - 60;
  const center = scheduleSize / 2;

  const getTextPosition = (start: number, end: number) => {
    const midHour = start + (end - start) / 2;
    const baseRadius = radius * 0.6;
    let textRadius = baseRadius;
    
    if (midHour >= 11 && midHour <= 13) {
      textRadius += (midHour - 11) * 20;
    } else if (midHour >= 15 && midHour <= 17) {
      textRadius += (midHour - 15) * 20;
    }

    return calculatePosition(midHour, textRadius);
  };

  const handleEventChange = (index: number, field: keyof Event, value: string | number) => {
    const newEvents = [...events];
    newEvents[index] = {
      ...newEvents[index],
      [field]: value
    };
    setEvents(newEvents);
  };

  const addEvent = () => {
    setEvents([...events, { start: 0, end: 1, event: '', color: '#CCCCCC' }]);
  };

  const removeEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  // 時間の重複をチェック
  const checkTimeOverlap = (event: Event, index: number): boolean => {
    return events.some((e, i) => 
      i !== index && 
      ((event.start >= e.start && event.start < e.end) ||
       (event.end > e.start && event.end <= e.end) ||
       (event.start <= e.start && event.end >= e.end))
    );
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 p-8 w-full max-w-7xl mx-auto">
      {/* 左側：円形スケジュール表示 */}
      <div className="flex-1 flex flex-col items-center gap-4">
        <div className="w-full max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            サークルのサイズ (px)
          </label>
          <input
            type="range"
            value={scheduleSize}
            onChange={(e) => setScheduleSize(Number(e.target.value))}
            className="w-full"
            min="200"
            max="800"
          />
          <div className="text-sm text-gray-500 text-center">{scheduleSize}px</div>
        </div>
        
        <svg 
          width={scheduleSize} 
          height={scheduleSize} 
          viewBox={`0 0 ${scheduleSize} ${scheduleSize}`}
          className="border rounded-lg shadow-lg"
        >
          {events.map(event => (
            <path
              key={event.start}
              d={calculateArc(event.start, event.end, radius)}
              fill={event.color}
              stroke="#fff"
              strokeWidth="1"
            />
          ))}
          
          {Array.from({ length: 24 }, (_, i) => {
            const hour = (i + 6) % 24;
            const pos = calculatePosition(hour, radius);
            return (
              <g key={hour}>
                <line
                  x1={center + pos.x * 0.9}
                  y1={center + pos.y * 0.9}
                  x2={center + pos.x}
                  y2={center + pos.y}
                  stroke="#666"
                  strokeWidth="1"
                />
                <text
                  x={center + pos.x * 1.1}
                  y={center + pos.y * 1.1}
                  textAnchor="middle"
                  className="text-xs"
                  fill="#666"
                >
                  {`${hour}:00`}
                </text>
              </g>
            );
          })}

          {events.map(event => {
            const pos = getTextPosition(event.start, event.end);
            return (
              <text
                key={event.start}
                x={center + pos.x}
                y={center + pos.y + 5}
                textAnchor="middle"
                className="text-sm font-medium"
                fill="#333"
              >
                {event.event}
              </text>
            );
          })}
        </svg>
      </div>

      {/* 右側：スケジュール編集エリア */}
      <div className="flex-1 min-w-[500px]">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-medium text-gray-800">スケジュール編集</h3>
            <button
              onClick={addEvent}
              className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新規イベント
            </button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {events.map((event, index) => {
              const hasOverlap = checkTimeOverlap(event, index);
              return (
                <div 
                  key={index} 
                  className={`
                    bg-white rounded-lg border p-4
                    ${hasOverlap ? 'border-red-300 bg-red-50' : 'border-gray-200'}
                    transition-all hover:shadow-md
                  `}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1 flex items-center gap-2">
                      <select
                        value={event.start}
                        onChange={(e) => handleEventChange(index, 'start', Number(e.target.value))}
                        className="p-2 border rounded-md flex-1"
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
                        className="p-2 border rounded-md flex-1"
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
                      type="text"
                      value={event.event}
                      onChange={(e) => handleEventChange(index, 'event', e.target.value)}
                      className="flex-1 p-2 border rounded-md"
                      placeholder="イベント名"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={event.color}
                        onChange={(e) => handleEventChange(index, 'color', e.target.value)}
                        className="w-10 h-10 rounded-md cursor-pointer"
                      />
                    </div>
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CircleSchedule;