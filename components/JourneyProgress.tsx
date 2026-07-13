"use client";

import { Flame, Sparkles, Target, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

export type JourneyProgressData = {
  title: string;
  nextAction: string;
  reward: string;
  progress: number;
};

type JourneyProgressProps = {
  data: JourneyProgressData;
};

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function previousDateKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localDateKey(date);
}

export function JourneyProgress({ data }: JourneyProgressProps) {
  const [streak, setStreak] = useState(1);
  const progress = Math.max(0, Math.min(100, Math.round(data.progress)));
  const stage = progress >= 100 ? "Complete" : `Stage ${Math.min(4, Math.floor(progress / 25) + 1)} of 4`;

  useEffect(() => {
    const today = localDateKey(new Date());
    const savedDate = window.localStorage.getItem("linride-last-active-date");
    const savedStreak = Number(window.localStorage.getItem("linride-active-streak")) || 1;
    let nextStreak = savedStreak;
    if (savedDate !== today) nextStreak = savedDate === previousDateKey() ? savedStreak + 1 : 1;
    window.localStorage.setItem("linride-last-active-date", today);
    window.localStorage.setItem("linride-active-streak", String(nextStreak));
    setStreak(nextStreak);
  }, []);

  return (
    <section className="journey-progress" aria-label={`${data.title} progress`}>
      <div className="journey-progress-icon"><Trophy size={19} /></div>
      <div className="journey-progress-main">
        <div className="journey-progress-title">
          <strong>{data.title}</strong>
          <span>{stage}</span>
        </div>
        <div className="journey-progress-track" aria-label={`${progress}% complete`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <p><Target size={13} /> {data.nextAction}</p>
      </div>
      <div className="journey-progress-rewards">
        <span><Flame size={14} /> {streak} day streak</span>
        <span><Sparkles size={14} /> {data.reward}</span>
      </div>
    </section>
  );
}
